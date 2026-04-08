import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { model, systemPrompt, userMessage, history, maxTokens } = await req.json()
    const isClaude = model.includes('claude')

    if (isClaude) {
      const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
      if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY")

      const messages = [...(history || []), { role: 'user', content: userMessage }]
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens || 4096,
          messages,
          system: systemPrompt,
        })
      })

      if (!response.ok) throw new Error(await response.text())
      const data = await response.json()
      return new Response(JSON.stringify({ content: data.content[0].text, model }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } 
    
    // GPT Fallback
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY")
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens || 4096,
        messages: [{ role: 'system', content: systemPrompt }, ...(history || []), { role: 'user', content: userMessage }]
      })
    })

    if (!response.ok) throw new Error(await response.text())
    const data = await response.json()
    return new Response(JSON.stringify({ content: data.choices[0].message.content, model }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
