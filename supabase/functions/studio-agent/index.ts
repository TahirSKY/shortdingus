import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!candidate) throw new Error("The editor returned an empty response. Please try again.");
  return JSON.parse(candidate);
}

async function askAgent(prompt: string, signal: AbortSignal, videoUrl?: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("AI is not configured for this workspace.");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      text: { format: { type: "json_object" } },
      input: [{ role: "user", content: [...(videoUrl ? [{ type: "input_video", video_url: videoUrl }] : []), { type: "input_text", text: prompt }] }],
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail.slice(0, 500) || `AI request failed (${response.status}).`);
  }
  if (!response.body) throw new Error("AI returned an empty response.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    buffer += decoder.decode(part.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6);
      if (raw === "[DONE]") continue;
      try {
        const event = JSON.parse(raw);
        if (event.type === "response.output_text.delta") output += event.delta || "";
        if (event.type === "response.completed" && !output) output = event.response?.output_text || "";
      } catch { /* wait for the next event */ }
    }
  }
  buffer += decoder.decode();
  if (buffer.startsWith("data: ")) {
    const raw = buffer.slice(6).trim();
    if (raw && raw !== "[DONE]") {
      try {
        const event = JSON.parse(raw);
        if (event.type === "response.output_text.delta") output += event.delta || "";
      } catch { /* terminal SSE fragments are ignored */ }
    }
  }
  if (!output.trim()) throw new Error("The editor returned an empty response. Please try again.");
  return output;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json();
    const action = String(body.action || "directions");
    const mode = body.mode === "have_footage" ? "have_footage" : "need_footage";
    const goal = String(body.message || "").slice(0, 5000);
    const analysis = body.analysis || null;
    const direction = body.direction || null;
    const currentEdl = body.edl || null;
    const footage = body.footage || null;

    const shared = `You are a decisive short-form video editor for viral TikTok/Reels. Build a different structure for each idea. The output must be JSON only, without markdown. The canvas is always 9:16, 30fps, maximum 60 seconds. Never mention code or templates. Visual storytelling is critical - every scene must have a clear visual, not just text.`;

    let task = "";
    if (action === "analyze") {
      task = `Analyze this uploaded clip from metadata and goal. Metadata: ${JSON.stringify(footage)}. Goal: ${goal}. Return {"summary":string,"beats":[{"start":number,"end":number,"label":string,"detail":string,"opportunity":string}]}. Use plausible timecoded beats spanning real duration. Focus on moments for cuts, zooms, emotional beats.`;
    } else if (action === "directions") {
      task = `Mode: ${mode}. User idea: ${goal}. Footage understanding: ${JSON.stringify(analysis)}. 
Return {"reply":string,"directions":[exactly three {"id":string,"title":string,"hook":string,"angle":string,"structure":[5 to 7 concise spoken lines, each under 12 words, punchy, viral style]}]}. 
Make the three concepts MEANINGFULLY different in angle and structure. 
If idea contains "intern vs CEO" or "loans" or "money" or "psychology": make them corporate horror-comedy, dark humor, showing how normal financial things are ridiculous. Intern is curious/concerned, CEO is smug/laughing.
If idea contains "dog" or "reactive" or "threshold": make them owner-to-owner empathetic, one insight per video, like "If he won't take a treat, you're too close".
Hooks must be scroll-stoppers in first 2 seconds.`;
    } else if (action === "build") {
      // ENHANCED: Force detailed image prompts with consistent characters for intern vs CEO
      const isInternCEO = JSON.stringify(direction).toLowerCase().includes("intern") || JSON.stringify(direction).toLowerCase().includes("ceo") || goal.toLowerCase().includes("intern") || goal.toLowerCase().includes("ceo") || goal.toLowerCase().includes("loan");
      
      const imagePromptInstructions = isInternCEO ? `
For imagePrompts, create 5 DETAILED anime-style prompts with CONSISTENT CHARACTERS:
- Character 1: Young intern, early 20s, nervous, wearing casual office shirt, expressive worried eyes, short dark hair
- Character 2: Smug CEO, 40s, expensive suit, slicked back hair, condescending smile, expensive watch
- Style: Anime, flat color illustration, bold lines, studio lighting, office background, 9:16 vertical, highly detailed, viral thumbnail aesthetic, no text, no logos
- Each prompt must be a different scene/moment from the script, with specific action and emotion
- Example: "Anime style, young nervous intern holding paycheck looking confused in modern office, CEO in expensive suit smirking in background, dramatic lighting, flat colors, bold lines, 9:16 vertical, no text"
- Keep characters consistent across all 5 images - same faces, same clothes
` : `
For imagePrompts, create 5 DETAILED cinematic prompts for the story:
- Style: Cinematic, photorealistic or illustrative depending on topic, 9:16 vertical, highly detailed, emotional, no text, no logos
- Each prompt must be a different scene/moment, with specific action, lighting, and composition
- If dog-related: show real dogs, body language, distance, treats, owner perspective
- Make them visually distinct and story-driven
`;

      task = `Approved direction: ${JSON.stringify(direction)}. User context: ${goal}. 
Return {"reply":string,"script":{"title":string,"turns":[{"speaker":string,"text":string,"start":number,"end":number}]},"imagePrompts":[up to 5 detailed visual prompts]}. 
${imagePromptInstructions}
Keep footage-based script within ${Number(footage?.duration || 30)} seconds; otherwise target 30 seconds. For footage-based edits, imagePrompts should be empty.
Script turns: For intern vs CEO, use 2 speakers: "intern" and "CEO", with alternating dialogue, punchy, dark humor. For dog content, single narrator, empathetic owner-to-owner voice.
Each turn should be under 15 words, timed to fit 30s total.`;
    } else {
      task = `Apply the user's edit request narrowly to the current EDL. Request: ${goal}. Current EDL: ${JSON.stringify(currentEdl)}. Return {"reply":string,"edl":the full updated EDL}. Preserve every unrelated field. Increment revision by exactly one. Common requests: caption size, hook text, overlay timing, zoom, pacing, duration.`;
    }
    const text = await askAgent(`${shared}\n${task}`, req.signal, action === "analyze" ? footage?.url : undefined);
    return json(extractJson(text));
  } catch (error) {
    if ((error as Error).name === "AbortError") return json({ error: "Request cancelled." }, 499);
    console.error("[studio-agent]", error);
    return json({ error: (error as Error).message || "Studio agent failed." }, 500);
  }
});
