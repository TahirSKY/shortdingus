#!/usr/bin/env python3
"""
Brainbank Video Analyzer Backend
Uses Google Gemini 1.5 Flash / Pro with video input to generate timecoded beats.

Usage:
  export GEMINI_API_KEY="your-key-from-aistudio.google.com/app/apikey"
  python video_analyzer_backend.py video_file.mp4

Outputs:
  /home/user/video-beats/video_file.mp4.json  (timecoded beats)
  Prints JSON to stdout

Cost: Gemini 1.5 Flash ~free tier generous; Pro ~$3-7/1K videos depending on length.
"""
import os, sys, json, time
from pathlib import Path

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Install: pip install google-genai")
    sys.exit(1)

API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
if not API_KEY:
    print("ERROR: Set GEMINI_API_KEY env var.")
    print("Get at https://aistudio.google.com/app/apikey")
    sys.exit(1)

client = genai.Client(api_key=API_KEY)

def analyze_video(path: str) -> dict:
    # Read video bytes
    video_bytes = Path(path).read_bytes()
    # Determine MIME from extension
    ext = Path(path).suffix.lower()
    mime_map = {".mp4":"video/mp4", ".mov":"video/quicktime", ".webm":"video/webm", ".mkv":"video/x-matroska"}
    mime = mime_map.get(ext, "video/mp4")

    prompt = (
        "Analyze this video clip and return precise timecoded scene beats as a JSON array. "
        "For each beat include: time (format hh:mm:ss-mm:ss or seconds range), scene description, emotion label, dialogue mentions if any, visual events. "
        "Break into 2-6 second intervals. Do not summarize — be granular. "
        "If it is a mascot talking video, note mouth movement, hand gestures, camera POV, background elements."
    )

    response = client.models.generate_content(
        model="gemini-1.5-flash-001",  # free tier; use gemini-1.5-pro-001 for best accuracy
        contents=types.Content(
            role="user",
            parts=[
                types.Part(text=prompt),
                types.Part(inline_data=types.Blob(mime_type=mime, data=video_bytes))
            ]
        ),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
            max_output_tokens=4096,
        )
    )
    
    # Parse JSON response
    raw = response.text
    try:
        data = json.loads(raw)
    except Exception:
        # Sometimes Gemini wraps in markdown or extra text
        # Try to extract first [ ... ] block
        start = raw.find("[")
        end = raw.rfind("]")
        if start != -1 and end != -1 and end > start:
            data = json.loads(raw[start:end+1])
        else:
            raise ValueError(f"Could not parse Gemini response: {raw[:300]}")

    # Normalize: ensure beats array
    if isinstance(data, dict) and "beats" in data:
        beats = data["beats"]
    elif isinstance(data, list):
        beats = data
    else:
        beats = [data] if isinstance(data, dict) else []

    result = {
        "filename": Path(path).name,
        "duration": "unknown",  # could extract with ffprobe
        "analyzed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model": "google-gemini-1.5-flash",
        "beats": beats
    }
    return result

def main():
    if len(sys.argv) < 2:
        print("Usage: python video_analyzer_backend.py <video.mp4>")
        sys.exit(1)
    video_path = sys.argv[1]
    if not Path(video_path).exists():
        print(f"File not found: {video_path}")
        sys.exit(1)
    
    print(f"Analyzing {video_path} with Gemini 1.5 Flash...")
    result = analyze_video(video_path)
    
    out_dir = Path("/home/user/video-beats")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / (result["filename"] + ".json")
    out_file.write_text(json.dumps(result, indent=2, ensure_ascii=False))
    
    print(f"✓ Saved to {out_file}")
    print(f"✓ Beats: {len(result['beats'])}")
    for b in result["beats"]:
        t = b.get("time") or b.get("timestamp") or "?"
        s = b.get("scene") or b.get("description") or b.get("text") or ""
        e = b.get("emotion") or ""
        print(f"  {t} | {s[:70]} {'|' if s else ''} {e}")

if __name__ == "__main__":
    main()
