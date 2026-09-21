// Edge TTS - Free Microsoft TTS, no API key, 300+ voices
// Best yappucino voices for brainbank: AnaNeural (cute), AriaNeural (confident fast)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const VOICE_MAP = {
  brainbank: { voice: "en-US-AnaNeural", rate: "+18%", pitch: "+2Hz" }, // cute, cartoon, yappucino
  steadywalks: { voice: "en-US-JennyNeural", rate: "+0%", pitch: "+0Hz" }, // friendly, considerate
  feedgravity: { voice: "en-US-GuyNeural", rate: "+5%", pitch: "+0Hz" },
}

serve(async (req) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" }
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })
  
  return new Response(JSON.stringify({
    voices: VOICE_MAP,
    how_to_use: "pip install edge-tts && edge-tts --voice en-US-AnaNeural --rate=+18% --text 'your script' --write-media out.mp3",
    demo_urls: [
      "https://rfbrxohavioeaexhztxa.supabase.co/storage/v1/object/public/images/demo-edge-en-US-AnaNeural.mp3",
      "https://rfbrxohavioeaexhztxa.supabase.co/storage/v1/object/public/images/demo-edge-en-US-AriaNeural.mp3"
    ]
  }), { headers: { ...cors, "Content-Type": "application/json" } })
})
