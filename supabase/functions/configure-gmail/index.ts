import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConfigureGmailRequest {
  gmailUser: string;
  gmailAppPassword: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { gmailUser, gmailAppPassword }: ConfigureGmailRequest = await req.json();

    if (!gmailUser || !gmailAppPassword) {
      return new Response(
        JSON.stringify({ error: "Gmail user and app password are required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Stockage sécurisé dans une table de configuration
    const { error: upsertError } = await supabase
      .from("gmail_config")
      .upsert(
        {
          id: 1,
          gmail_user: gmailUser,
          gmail_app_password: gmailAppPassword,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

    if (upsertError) {
      console.error("Error saving configuration:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save configuration" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Gmail configuration saved successfully" }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in configure-gmail function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
