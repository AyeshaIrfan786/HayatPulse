import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: { message: "Groq API Key missing in Supabase Secrets." } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch (_) {}

    let modelToUse = body.model || "openai/gpt-oss-120b"
    if (modelToUse.includes("llama3-8b") || modelToUse.includes("gpt-oss")) {
      modelToUse = "openai/gpt-oss-120b"
    }

    // Call Groq API directly from backend
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: body.messages || [{ role: "user", content: "Hello" }],
        ...(body.temperature && { temperature: body.temperature }),
        ...(body.max_tokens && { max_tokens: body.max_tokens }),
      }),
    })

    const data = await groqResponse.json()

    return new Response(JSON.stringify(data), {
      status: groqResponse.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: { message: error.message } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})