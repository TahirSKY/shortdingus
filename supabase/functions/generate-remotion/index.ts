import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a Remotion video code generator. You produce TypeScript/TSX code that works with the Remotion framework.

RULES:
1. Use a single default export for the main scene component.
2. Use \`useCurrentFrame()\` and \`useVideoConfig()\` from "remotion" for all animations. Never use useState or useEffect for animation logic.
3. Only import from: "react", "remotion", "@remotion/shapes", "@remotion/noise", "@remotion/transitions", "@remotion/motion-blur".
4. Do NOT use browser APIs (window, fetch, localStorage), direct DOM manipulation, local file paths, or CSS imports.
5. Do NOT use Unsplash URLs. For placeholder images use picsum.photos or solid color backgrounds.
6. For multi-file projects, use "// --- file: Filename.tsx ---" markers at the start of each file.
7. Always include a config comment at the top of the main file:
   /* __REMOTION_CONFIG__ { "fps": 30, "durationInFrames": 150, "width": 1920, "height": 1080 } */
8. Make animations smooth using spring() or interpolate() from "remotion".
9. Use inline styles only (no CSS modules, no Tailwind, no styled-components).
10. Be creative with motion design — use scale, rotation, opacity, translateX/Y for engaging animations.

RESPOND WITH ONLY THE CODE. No explanations, no markdown fences, no comments outside the code itself.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-remotion error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
