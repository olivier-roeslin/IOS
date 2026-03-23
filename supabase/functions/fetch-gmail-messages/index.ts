import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function connectToIMAP(email: string, password: string) {
  const imapHost = "imap.gmail.com";
  const imapPort = 993;

  try {
    const conn = await Deno.connectTls({
      hostname: imapHost,
      port: imapPort,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function sendCommand(command: string): Promise<string> {
      await conn.write(encoder.encode(command + "\r\n"));
      const buffer = new Uint8Array(65536);
      let response = "";
      let bytesRead = 0;

      do {
        bytesRead = await conn.read(buffer) || 0;
        if (bytesRead > 0) {
          response += decoder.decode(buffer.subarray(0, bytesRead));
        }
      } while (bytesRead > 0 && !response.includes("\r\n"));

      return response;
    }

    await sendCommand(`A001 LOGIN "${email}" "${password}"`);
    await sendCommand('A002 SELECT INBOX');

    const searchResponse = await sendCommand('A003 SEARCH ALL');
    const messageIds = searchResponse.match(/\* SEARCH (.+)\r\n/)?.[1]?.split(' ').filter(Boolean) || [];

    const messages = [];
    const recentIds = messageIds.slice(-50).reverse();

    for (const msgId of recentIds.slice(0, 20)) {
      const headerResponse = await sendCommand(`A${100 + parseInt(msgId)} FETCH ${msgId} (BODY[HEADER])`);
      const bodyResponse = await sendCommand(`A${200 + parseInt(msgId)} FETCH ${msgId} (BODY[TEXT])`);

      const headers = parseHeaders(headerResponse);
      const body = parseBody(bodyResponse);

      if (headers.from || headers.to) {
        messages.push({
          id: msgId,
          from: headers.from || '',
          to: headers.to || '',
          subject: headers.subject || '',
          date: headers.date || '',
          body: body,
        });
      }
    }

    await sendCommand('A999 LOGOUT');
    conn.close();

    return messages;
  } catch (error) {
    console.error('IMAP error:', error);
    throw new Error(`IMAP connection failed: ${error.message}`);
  }
}

function parseHeaders(response: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = response.split('\r\n');

  for (const line of lines) {
    if (line.startsWith('From:')) headers.from = line.substring(5).trim();
    if (line.startsWith('To:')) headers.to = line.substring(3).trim();
    if (line.startsWith('Subject:')) headers.subject = line.substring(8).trim();
    if (line.startsWith('Date:')) headers.date = line.substring(5).trim();
  }

  return headers;
}

function parseBody(response: string): string {
  const bodyMatch = response.match(/BODY\[TEXT\] \{(\d+)\}\r\n([\s\S]+?)\r\n\)/);
  return bodyMatch ? bodyMatch[2].substring(0, 500) : '';
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

    const messages = await connectToIMAP(gmailConfig.gmail_user, gmailConfig.gmail_app_password);
    const detailedMessages = [];

    for (const msg of messages) {
      const isSentByUser = msg.from.includes(gmailConfig.gmail_user);
      const isReceivedByUser = msg.to.includes(gmailConfig.gmail_user);

      if (!isSentByUser && !isReceivedByUser) {
        continue;
      }

      const gmailMessageId = `imap-${msg.id}-${Date.now()}`;

      const { error: insertError } = await supabase
        .from("messages")
        .upsert({
          user_id: user_id,
          gmail_message_id: gmailMessageId,
          thread_id: msg.subject,
          from_email: msg.from,
          to_email: msg.to,
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
          from: msg.from,
          to: msg.to,
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
