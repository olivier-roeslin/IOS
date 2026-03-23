import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function fetchGmailViaAPI(email: string, appPassword: string) {
  const auth = btoa(`${email}:${appPassword}`);

  const imapResponse = await fetch('https://imap.gmail.com/gmail/v1/users/me/messages?maxResults=50', {
    headers: {
      'Authorization': `Basic ${auth}`,
    }
  });

  if (!imapResponse.ok) {
    const conn = await Deno.connectTls({
      hostname: "imap.gmail.com",
      port: 993,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";

    async function readUntilComplete(timeout = 3000): Promise<string> {
      const start = Date.now();
      const chunk = new Uint8Array(8192);

      while (Date.now() - start < timeout) {
        try {
          const n = await Promise.race([
            conn.read(chunk),
            new Promise<null>(r => setTimeout(() => r(null), 50))
          ]);

          if (n) {
            buffer += decoder.decode(chunk.subarray(0, n));
          }

          if (buffer.includes("\r\n") || buffer.includes("OK") || buffer.includes("BAD") || buffer.includes("NO")) {
            const result = buffer;
            buffer = "";
            return result;
          }
        } catch (e) {
          break;
        }
      }

      const result = buffer;
      buffer = "";
      return result;
    }

    async function cmd(command: string): Promise<string> {
      await conn.write(encoder.encode(command + "\r\n"));
      return await readUntilComplete();
    }

    await readUntilComplete(1000);

    await cmd(`A1 LOGIN ${email} ${appPassword}`);
    await cmd('A2 SELECT INBOX');

    const searchResult = await cmd('A3 UID SEARCH ALL');
    const uidMatch = searchResult.match(/\* SEARCH (.+)/);

    if (!uidMatch) {
      conn.close();
      return [];
    }

    const uids = uidMatch[1].trim().split(' ').filter(Boolean);
    const messages = [];

    const recentUids = uids.slice(-30).reverse().slice(0, 20);

    for (const uid of recentUids) {
      const headerCmd = `A${100 + parseInt(uid)} UID FETCH ${uid} BODY[HEADER]`;
      const bodyCmd = `A${200 + parseInt(uid)} UID FETCH ${uid} BODY[TEXT]`;

      const headerResp = await cmd(headerCmd);
      const bodyResp = await cmd(bodyCmd);

      const from = headerResp.match(/^From:\s*(.+)$/im)?.[1]?.trim() || '';
      const to = headerResp.match(/^To:\s*(.+)$/im)?.[1]?.trim() || '';
      const subject = headerResp.match(/^Subject:\s*(.+)$/im)?.[1]?.trim() || '';
      const date = headerResp.match(/^Date:\s*(.+)$/im)?.[1]?.trim() || '';

      const bodyMatch = bodyResp.match(/BODY\[TEXT\]\s*\{?\d*\}?\s*\r?\n([\s\S]+?)(?:\r?\n\)|$)/);
      const body = bodyMatch ? bodyMatch[1].trim().substring(0, 500) : '';

      if (from && to) {
        messages.push({ id: uid, from, to, subject, date, body });
      }
    }

    await cmd('A999 LOGOUT');

    try {
      conn.close();
    } catch (e) {
      // ignore
    }

    return messages;
  }

  return [];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      throw new Error("User ID is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: gmailConfig, error: configError } = await supabase
      .from("gmail_config")
      .select("gmail_user, gmail_app_password")
      .eq("user_id", user_id)
      .maybeSingle();

    if (configError || !gmailConfig) {
      throw new Error("Gmail configuration not found");
    }

    const messages = await fetchGmailViaAPI(
      gmailConfig.gmail_user,
      gmailConfig.gmail_app_password
    );

    let insertedCount = 0;

    for (const msg of messages) {
      const fromEmail = msg.from.match(/<([^>]+)>/)?.[1] || msg.from.trim();
      const toEmail = msg.to.match(/<([^>]+)>/)?.[1] || msg.to.trim();

      const userEmail = gmailConfig.gmail_user.toLowerCase();
      const isSent = fromEmail.toLowerCase().includes(userEmail);

      const otherEmail = isSent ? toEmail : fromEmail;

      const subjectClean = msg.subject.replace(/^(Re:|RE:|Fwd:|FW:)\s*/gi, '').trim();

      const threadId = `${otherEmail}-${subjectClean}`.toLowerCase();

      const { error: insertError } = await supabase
        .from("messages")
        .upsert({
          user_id: user_id,
          gmail_message_id: `imap-uid-${msg.id}`,
          thread_id: threadId,
          from_email: fromEmail,
          to_email: toEmail,
          subject: msg.subject,
          body: msg.body,
          is_sent: isSent,
          received_at: new Date(msg.date || Date.now()),
        }, {
          onConflict: "gmail_message_id",
          ignoreDuplicates: true,
        });

      if (!insertError) {
        insertedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageCount: insertedCount,
        totalFetched: messages.length,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
