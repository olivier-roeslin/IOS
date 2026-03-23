import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ImapMessage {
  from: string;
  to: string;
  subject: string;
  body: string;
  messageId: string;
  date: string;
}

async function connectIMAP(
  user: string,
  password: string
): Promise<ImapMessage[]> {
  const IMAP_HOST = "imap.gmail.com";
  const IMAP_PORT = 993;

  const conn = await Deno.connectTls({
    hostname: IMAP_HOST,
    port: IMAP_PORT,
  });

  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  async function send(command: string, tag: string): Promise<string> {
    const fullCommand = `${tag} ${command}\r\n`;
    await conn.write(textEncoder.encode(fullCommand));

    const buffer = new Uint8Array(65536);
    let response = "";
    let attempts = 0;

    while (attempts < 50) {
      const n = await conn.read(buffer);
      if (n === null) break;
      response += textDecoder.decode(buffer.subarray(0, n));

      if (response.includes(`${tag} OK`) || response.includes(`${tag} NO`) || response.includes(`${tag} BAD`)) {
        break;
      }
      attempts++;
    }

    return response;
  }

  const messages: ImapMessage[] = [];

  try {
    console.log("Connecting to IMAP server...");

    const loginResponse = await send(`LOGIN ${user} ${password}`, "A001");
    console.log("Login response:", loginResponse);

    if (!loginResponse.includes("A001 OK")) {
      throw new Error("IMAP login failed");
    }

    await send('SELECT INBOX', "A002");

    const searchResponse = await send('SEARCH UNSEEN', "A003");
    console.log("Search response:", searchResponse);

    const messageIds = searchResponse.match(/\* SEARCH (.+)\r\n/);
    if (!messageIds || !messageIds[1].trim()) {
      console.log("No unread messages");
      await send('LOGOUT', "A999");
      conn.close();
      return messages;
    }

    const ids = messageIds[1].trim().split(' ');
    console.log(`Found ${ids.length} unread messages:`, ids);

    for (const id of ids) {
      const fetchResponse = await send(`FETCH ${id} (BODY[HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)] BODY[TEXT])`, `A${id}`);

      const fromMatch = fetchResponse.match(/From: (.+)\r\n/i);
      const toMatch = fetchResponse.match(/To: (.+)\r\n/i);
      const subjectMatch = fetchResponse.match(/Subject: (.+)\r\n/i);
      const dateMatch = fetchResponse.match(/Date: (.+)\r\n/i);
      const messageIdMatch = fetchResponse.match(/Message-ID: (.+)\r\n/i);

      const bodyMatch = fetchResponse.match(/BODY\[TEXT\] \{(\d+)\}\r\n([\s\S]+?)\r\n\)/);

      if (fromMatch && toMatch) {
        messages.push({
          from: fromMatch[1].trim(),
          to: toMatch[1].trim(),
          subject: subjectMatch ? subjectMatch[1].trim() : "(no subject)",
          body: bodyMatch ? bodyMatch[2].trim() : "",
          messageId: messageIdMatch ? messageIdMatch[1].trim() : `${Date.now()}-${id}`,
          date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
        });
      }
    }

    await send('LOGOUT', "A999");
    conn.close();
    console.log(`Retrieved ${messages.length} messages`);
  } catch (error) {
    console.error("IMAP Error:", error);
    conn.close();
    throw error;
  }

  return messages;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: config, error: configError } = await supabase
      .from("gmail_config")
      .select("gmail_user, gmail_app_password")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!config || configError) {
      return new Response(
        JSON.stringify({
          error: "Gmail configuration not found",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const messages = await connectIMAP(
      config.gmail_user,
      config.gmail_app_password
    );

    let savedCount = 0;
    let skippedCount = 0;

    for (const msg of messages) {
      const { error: insertError } = await supabase
        .from("messages")
        .insert({
          user_id: user.id,
          from_email: msg.from,
          to_email: msg.to,
          subject: msg.subject,
          body: msg.body,
          is_sent: false,
          received_at: msg.date,
          gmail_message_id: msg.messageId,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          skippedCount++;
        } else {
          console.error("Error saving message:", insertError);
        }
      } else {
        savedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalFound: messages.length,
        saved: savedCount,
        skipped: skippedCount,
      }),
      {
        status: 200,
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
        error: "Failed to poll IMAP",
        message: error.message,
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
