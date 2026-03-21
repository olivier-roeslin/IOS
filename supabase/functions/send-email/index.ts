import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  message: string;
  fromName?: string;
  replyTo?: string;
}

async function sendEmailViaSMTP(
  to: string,
  subject: string,
  body: string,
  from: string,
  replyTo?: string,
  smtpUser?: string,
  smtpPassword?: string
): Promise<void> {
  const SMTP_HOST = "smtp.gmail.com";
  const SMTP_PORT = 587;
  const SMTP_USER = smtpUser || Deno.env.get("GMAIL_USER");
  const SMTP_PASSWORD = smtpPassword || Deno.env.get("GMAIL_APP_PASSWORD");

  if (!SMTP_USER || !SMTP_PASSWORD) {
    throw new Error("SMTP credentials not configured");
  }

  const conn = await Deno.connect({
    hostname: SMTP_HOST,
    port: SMTP_PORT,
  });

  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  async function send(command: string): Promise<string> {
    await conn.write(textEncoder.encode(command + "\r\n"));
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    if (n === null) throw new Error("Connection closed");
    return textDecoder.decode(buffer.subarray(0, n));
  }

  try {
    await send("");

    await send("EHLO localhost");

    await send("STARTTLS");

    const tlsConn = await Deno.startTls(conn, { hostname: SMTP_HOST });

    async function sendTls(command: string): Promise<string> {
      await tlsConn.write(textEncoder.encode(command + "\r\n"));
      const buffer = new Uint8Array(1024);
      const n = await tlsConn.read(buffer);
      if (n === null) throw new Error("Connection closed");
      return textDecoder.decode(buffer.subarray(0, n));
    }

    await sendTls("EHLO localhost");

    await sendTls("AUTH LOGIN");
    await sendTls(btoa(SMTP_USER));
    await sendTls(btoa(SMTP_PASSWORD));

    await sendTls(`MAIL FROM:<${from}>`);
    await sendTls(`RCPT TO:<${to}>`);
    await sendTls("DATA");

    const emailContent = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      replyTo ? `Reply-To: ${replyTo}` : "",
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
      ".",
    ]
      .filter(Boolean)
      .join("\r\n");

    await sendTls(emailContent);
    await sendTls("QUIT");

    tlsConn.close();
  } catch (error) {
    conn.close();
    throw error;
  }
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

    const {
      to,
      subject,
      message,
      fromName = "Application Harcèlement",
      replyTo,
    }: EmailRequest = await req.json();

    if (!to || !subject || !message) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: to, subject, message",
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
          error: "Gmail configuration not found. Please configure your Gmail settings.",
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

    const SMTP_USER = config.gmail_user;
    const SMTP_PASSWORD = config.gmail_app_password;

    await sendEmailViaSMTP(to, subject, message, SMTP_USER, replyTo, SMTP_USER, SMTP_PASSWORD);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully via Gmail SMTP",
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
        error: "Failed to send email",
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
