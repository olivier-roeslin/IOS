import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function fetchEmailsViaIMAPProxy(email: string, password: string) {
  try {
    const imapHost = "imap.gmail.com";
    const imapPort = 993;

    const conn = await Deno.connectTls({
      hostname: imapHost,
      port: imapPort,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let commandCounter = 1;

    async function readResponse(timeoutMs = 5000): Promise<string> {
      const buffer = new Uint8Array(65536);
      let response = "";
      const startTime = Date.now();

      while (Date.now() - startTime < timeoutMs) {
        try {
          const bytesRead = await Promise.race([
            conn.read(buffer),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 100))
          ]);

          if (bytesRead && bytesRead > 0) {
            response += decoder.decode(buffer.subarray(0, bytesRead));
          }

          if (response.includes(`A${commandCounter - 1} OK`) ||
              response.includes(`A${commandCounter - 1} NO`) ||
              response.includes(`A${commandCounter - 1} BAD`)) {
            break;
          }
        } catch (e) {
          break;
        }
      }

      return response;
    }

    async function sendCommand(command: string): Promise<string> {
      const tag = `A${commandCounter++}`;
      await conn.write(encoder.encode(`${tag} ${command}\r\n`));
      return await readResponse();
    }

    await readResponse(2000);

    const loginResp = await sendCommand(`LOGIN "${email}" "${password}"`);
    if (!loginResp.includes("OK")) {
      throw new Error("IMAP login failed");
    }

    await sendCommand('SELECT INBOX');
    const searchResp = await sendCommand('SEARCH ALL');

    const searchMatch = searchResp.match(/\* SEARCH (.+)/);
    if (!searchMatch) {
      return [];
    }

    const messageIds = searchMatch[1].trim().split(' ').filter(Boolean);
    const messages = [];
    const recentIds = messageIds.slice(-30).reverse();

    for (const msgId of recentIds.slice(0, 20)) {
      try {
        const fetchResp = await sendCommand(`FETCH ${msgId} (BODY[HEADER.FIELDS (FROM TO SUBJECT DATE)] BODY[TEXT])`);

        const fromMatch = fetchResp.match(/From: ([^\r\n]+)/i);
        const toMatch = fetchResp.match(/To: ([^\r\n]+)/i);
        const subjectMatch = fetchResp.match(/Subject: ([^\r\n]+)/i);
        const dateMatch = fetchResp.match(/Date: ([^\r\n]+)/i);

        const bodyMatch = fetchResp.match(/BODY\[TEXT\]\s*(?:\{(\d+)\}\s*)?\r?\n([\s\S]*?)(?:\r?\n\)|\r?\nA\d+)/);

        let body = "";
        if (bodyMatch) {
          body = bodyMatch[2].trim().substring(0, 500);
        }

        const from = fromMatch ? fromMatch[1].trim() : '';
        const to = toMatch ? toMatch[1].trim() : '';
        const subject = subjectMatch ? subjectMatch[1].trim() : '';
        const date = dateMatch ? dateMatch[1].trim() : '';

        if (from && to) {
          messages.push({
            id: msgId,
            from,
            to,
            subject,
            date,
            body,
          });
        }
      } catch (err) {
        console.error(`Error fetching message ${msgId}:`, err);
      }
    }

    await sendCommand('LOGOUT');

    try {
      conn.close();
    } catch (e) {
      // Ignore close errors
    }

    return messages;
  } catch (error) {
    console.error('IMAP error:', error);
    throw error;
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

    const messages = await fetchEmailsViaIMAPProxy(
      gmailConfig.gmail_user,
      gmailConfig.gmail_app_password
    );

    const detailedMessages = [];

    for (const msg of messages) {
      const fromEmail = msg.from.match(/<([^>]+)>/)?.[1] || msg.from;
      const toEmail = msg.to.match(/<([^>]+)>/)?.[1] || msg.to;

      const isSentByUser = fromEmail.toLowerCase().includes(gmailConfig.gmail_user.toLowerCase());
      const isReceivedByUser = toEmail.toLowerCase().includes(gmailConfig.gmail_user.toLowerCase());

      if (!isSentByUser && !isReceivedByUser) {
        continue;
      }

      const subjectClean = msg.subject.replace(/^(Re:|Fwd:)\s*/i, '').trim();
      const threadId = `thread-${subjectClean}`;

      const { error: insertError } = await supabase
        .from("messages")
        .upsert({
          user_id: user_id,
          gmail_message_id: `imap-${msg.id}-${threadId}`,
          thread_id: threadId,
          from_email: fromEmail,
          to_email: toEmail,
          subject: msg.subject,
          body: msg.body,
          is_sent: isSentByUser,
          received_at: new Date(msg.date || Date.now()),
        }, {
          onConflict: "gmail_message_id",
          ignoreDuplicates: true,
        });

      if (!insertError) {
        detailedMessages.push({
          from: fromEmail,
          to: toEmail,
          subject: msg.subject,
          body: msg.body.substring(0, 200),
          date: msg.date,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageCount: detailedMessages.length,
        messages: detailedMessages,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching Gmail messages:", error);
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
