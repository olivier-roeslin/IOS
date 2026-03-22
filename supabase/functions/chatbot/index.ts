import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  messages: Message[];
  language: string;
  apiKey: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { messages, language, apiKey }: RequestBody = await req.json();

    if (!apiKey) {
      throw new Error('API key not provided');
    }

    const systemPrompts = {
      fr: `Tu es un assistant juridique pour apprentis en Suisse.
Tu aides les apprentis à comprendre leurs droits.
Tu réponds en français clair, simple et concis.
Tu te bases sur le droit suisse de la formation professionnelle.
Si quelqu'un parle de harcèlement, d'abus ou de situation grave,
tu l'encourages à utiliser l'onglet 'Rapport'.`,
      en: `You are a legal assistant for apprentices in Switzerland.
You help apprentices understand their rights.
You respond in clear, simple, and concise English.
You base your answers on Swiss vocational training law.
If someone mentions harassment, abuse, or a serious situation,
encourage them to use the 'Report' tab.`,
      es: `Eres un asistente legal para aprendices en Suiza.
Ayudas a los aprendices a entender sus derechos.
Respondes en español claro, simple y conciso.
Te basas en la ley suiza de formación profesional.
Si alguien menciona acoso, abuso o una situación grave,
anímalo a usar la pestaña 'Informe'.`,
      it: `Sei un assistente legale per apprendisti in Svizzera.
Aiuti gli apprendisti a comprendere i loro diritti.
Rispondi in italiano chiaro, semplice e conciso.
Ti basi sulla legge svizzera della formazione professionale.
Se qualcuno menziona molestie, abusi o una situazione grave,
incoraggialo a usare la scheda 'Rapporto'.`
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 900,
        system: systemPrompts[language] || systemPrompts.fr,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        message: data.content[0].text
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
