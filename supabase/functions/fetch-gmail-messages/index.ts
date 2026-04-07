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

function decodeBase64(str: string): string {
  try {
    const padding = '='.repeat((4 - str.length % 4) % 4);
    const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
    return atob(base64);
  } catch {
    return str;
  }
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function getBody(payload: GmailMessage['payload']): string {
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
  }

  return '';
}

async function fetchGmailMessages(accessToken: string, maxResults = 50) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.statusText}`);
  }

  const data = await response.json();
  const messageIds = data.messages || [];

  const messages = [];

  for (const { id } of messageIds) {
    const msgResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (msgResponse.ok) {
      const msg: GmailMessage = await msgResponse.json();

      const from = getHeader(msg.payload.headers, 'From');
      const to = getHeader(msg.payload.headers, 'To');
      const subject = getHeader(msg.payload.headers, 'Subject');
      const date = getHeader(msg.payload.headers, 'Date');
      const body = getBody(msg.payload);

      messages.push({
        id: msg.id,
        threadId: msg.threadId,
        from,
        to,
        subject: subject || '(no subject)',
        date: date || new Date(parseInt(msg.internalDate)).toISOString(),
        body: body.substring(0, 1000),
        labelIds: msg.labelIds,
      });
    }
  }

  return messages;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { user_id, access_token } = await req.json();
    if (!user_id || !access_token) {
      throw new Error("User ID and access token are required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: gmailConfig } = await supabase
      .from("gmail_config")
      .select("gmail_user")
      .eq("user_id", user_id)
      .maybeSingle();

    console.log(`Fetching emails via Gmail API`);

    const messages = await fetchGmailMessages(access_token, 50);

    let insertedCount = 0;
    let updatedCount = 0;

    for (const msg of messages) {
      const fromEmail = msg.from.match(/<([^>]+)>/)?.[1]?.trim() || msg.from.trim();
      const toEmail = msg.to.match(/<([^>]+)>/)?.[1]?.trim() || msg.to.trim();

      const userEmail = gmailConfig?.gmail_user?.toLowerCase() || '';
      const isSent = msg.labelIds?.includes('SENT') || fromEmail.toLowerCase().includes(userEmail);

      const targetEmail = 'tatyanalorenzetti@gmail.com';
      const isFromTarget = fromEmail.toLowerCase().includes(targetEmail.toLowerCase());
      const isToTarget = toEmail.toLowerCase().includes(targetEmail.toLowerCase());

      if (!isFromTarget && !isToTarget) {
        continue;
      }

      const otherEmail = isSent ? toEmail : fromEmail;
      const subjectClean = msg.subject.replace(/^(Re:|RE:|Fwd:|FW:)\s*/gi, '').trim();
      const threadId = `${otherEmail.toLowerCase()}-${subjectClean.toLowerCase()}`;

      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("gmail_message_id", msg.id)
        .maybeSingle();

      if (existing) {
        updatedCount++;
      } else {
        const { error: insertError } = await supabase
          .from("messages")
          .insert({
            user_id: user_id,
            gmail_message_id: msg.id,
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
