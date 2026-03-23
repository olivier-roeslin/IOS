import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function fetchAllGmailMessages(email: string, appPassword: string) {
  const conn = await Deno.connectTls({
    hostname: "imap.gmail.com",
    port: 993,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  async function readResponse(timeout = 5000): Promise<string> {
    const start = Date.now();
    const chunk = new Uint8Array(16384);
    let response = "";

    while (Date.now() - start < timeout) {
      try {
        const n = await Promise.race([
          conn.read(chunk),
          new Promise<null>(r => setTimeout(() => r(null), 100))
        ]);

        if (n && n > 0) {
          response += decoder.decode(chunk.subarray(0, n));
        }

        if (response.includes("\r\n") &&
            (response.match(/^[A-Z0-9]+ (OK|BAD|NO)/m) || response.match(/\* \d+ FETCH/))) {
          return response;
        }
      } catch (_e) {
        break;
      }
    }

    return response;
  }

  async function sendCommand(command: string): Promise<string> {
    await conn.write(encoder.encode(command + "\r\n"));
    return await readResponse();
  }

  try {
    await readResponse(1000);

    await sendCommand(`A001 LOGIN ${email} ${appPassword}`);
    await sendCommand('A002 SELECT INBOX');

    const searchResp = await sendCommand('A003 SEARCH ALL');

    const uidMatch = searchResp.match(/\* SEARCH ([\d\s]+)/);
    if (!uidMatch) {
      console.log("No messages found");
      await sendCommand('A999 LOGOUT');
      conn.close();
      return [];
    }

    const messageIds = uidMatch[1].trim().split(/\s+/).filter(Boolean);
    console.log(`Found ${messageIds.length} messages`);

    const messages = [];
    const recentIds = messageIds.slice(-50).reverse();

    for (const msgId of recentIds) {
      const fetchResp = await sendCommand(`A${msgId} FETCH ${msgId} (BODY[HEADER.FIELDS (FROM TO SUBJECT DATE)] BODY[TEXT])`);

      const fromMatch = fetchResp.match(/From:\s*(.+?)[\r\n]/i);
      const toMatch = fetchResp.match(/To:\s*(.+?)[\r\n]/i);
      const subjectMatch = fetchResp.match(/Subject:\s*(.+?)[\r\n]/i);
      const dateMatch = fetchResp.match(/Date:\s*(.+?)[\r\n]/i);

      const bodyMatch = fetchResp.match(/BODY\[TEXT\]\s*\{(\d+)\}\s*\r?\n([\s\S]*?)(?:\r?\n\)|\r?\nA\d+)/);

      if (fromMatch && toMatch) {
        const from = fromMatch[1].trim();
        const to = toMatch[1].trim();
        const subject = subjectMatch?.[1]?.trim() || '(no subject)';
        const date = dateMatch?.[1]?.trim() || new Date().toISOString();
        const body = bodyMatch?.[2]?.trim().substring(0, 1000) || '';

        messages.push({ id: msgId, from, to, subject, date, body });
      }
    }

    await sendCommand('A999 LOGOUT');
    conn.close();

    console.log(`Retrieved ${messages.length} messages`);
    return messages;

  } catch (error) {
    console.error("IMAP error:", error);
    try { conn.close(); } catch (_e) {}
    return [];
  }
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

    console.log(`Fetching emails for ${gmailConfig.gmail_user}`);

    const messages = await fetchAllGmailMessages(
      gmailConfig.gmail_user,
      gmailConfig.gmail_app_password
    );

    let insertedCount = 0;
    let updatedCount = 0;

    for (const msg of messages) {
      const fromEmail = msg.from.match(/<([^>]+)>/)?.[1]?.trim() || msg.from.trim();
      const toEmail = msg.to.match(/<([^>]+)>/)?.[1]?.trim() || msg.to.trim();

      const userEmail = gmailConfig.gmail_user.toLowerCase();
      const isSent = fromEmail.toLowerCase().includes(userEmail);

      const otherEmail = isSent ? toEmail : fromEmail;
      const subjectClean = msg.subject.replace(/^(Re:|RE:|Fwd:|FW:)\s*/gi, '').trim();
      const threadId = `${otherEmail.toLowerCase()}-${subjectClean.toLowerCase()}`;

      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("gmail_message_id", `imap-${msg.id}`)
        .maybeSingle();

      if (existing) {
        updatedCount++;
      } else {
        const { error: insertError } = await supabase
          .from("messages")
          .insert({
            user_id: user_id,
            gmail_message_id: `imap-${msg.id}`,
            thread_id: threadId,
            from_email: fromEmail,
            to_email: toEmail,
            subject: msg.subject,
            body: msg.body,
            is_sent: isSent,
            received_at: new Date(msg.date),
          });

        if (!insertError) {
          insertedCount++;
        } else {
          console.error("Insert error:", insertError);
        }
      }
    }

    console.log(`Inserted: ${insertedCount}, Already exists: ${updatedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        messageCount: insertedCount,
        totalFetched: messages.length,
        details: `${insertedCount} nouveaux, ${updatedCount} existants`
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
