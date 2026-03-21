import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    parts?: Array<{ mimeType: string; body: { data?: string } }>;
    body?: { data?: string };
  };
  internalDate: string;
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
      .select("gmail_user, app_password")
      .eq("user_id", user_id)
      .maybeSingle();

    if (configError || !gmailConfig) {
      throw new Error("Gmail configuration not found");
    }

    const auth = btoa(`${gmailConfig.gmail_user}:${gmailConfig.app_password}`);
    const gmailApiUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

    const listResponse = await fetch(`${gmailApiUrl}?maxResults=50&q=in:inbox`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error("Gmail API error:", errorText);
      throw new Error(`Gmail API error: ${listResponse.status}`);
    }

    const listData = await listResponse.json();
    const messages = listData.messages || [];

    const detailedMessages = [];

    for (const message of messages.slice(0, 20)) {
      const detailResponse = await fetch(
        `${gmailApiUrl}/${message.id}?format=full`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (detailResponse.ok) {
        const detail: GmailMessage = await detailResponse.json();

        const headers = detail.payload.headers;
        const from = headers.find(h => h.name.toLowerCase() === "from")?.value || "";
        const to = headers.find(h => h.name.toLowerCase() === "to")?.value || "";
        const subject = headers.find(h => h.name.toLowerCase() === "subject")?.value || "";
        const date = headers.find(h => h.name.toLowerCase() === "date")?.value || "";

        let body = "";
        if (detail.payload.parts) {
          const textPart = detail.payload.parts.find(
            p => p.mimeType === "text/plain" || p.mimeType === "text/html"
          );
          if (textPart?.body?.data) {
            body = atob(textPart.body.data.replace(/-/g, "+").replace(/_/g, "/"));
          }
        } else if (detail.payload.body?.data) {
          body = atob(detail.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        }

        const { error: insertError } = await supabase
          .from("messages")
          .upsert({
            user_id: user_id,
            gmail_message_id: detail.id,
            thread_id: detail.threadId,
            from_email: from,
            to_email: to,
            subject: subject,
            body: body,
            is_sent: false,
            received_at: new Date(parseInt(detail.internalDate)),
          }, {
            onConflict: "gmail_message_id",
            ignoreDuplicates: true,
          });

        if (!insertError) {
          detailedMessages.push({
            id: detail.id,
            from,
            to,
            subject,
            body: body.substring(0, 200),
            date,
          });
        }
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
