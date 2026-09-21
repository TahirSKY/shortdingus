"""
Modal deployment for Edge TTS + VibeVoice - $0.01/min vs 11Labs $0.18/min
Deploy: pip install modal && modal deploy modal_app.py
Free tier: $30 credit = ~3000 minutes of audio
"""
import modal

app = modal.App("shortdingus-voice")
image = modal.Image.debian_slim().pip_install("edge-tts", "fastapi", "uvicorn", "python-multipart")

# Edge TTS - lightweight, no GPU needed
@app.function(image=image)
@modal.web_endpoint(method="POST")
async def edge_tts_generate(data: dict):
    import edge_tts
    import tempfile
    import os
    
    text = data.get("text", "")
    voice = data.get("voice", "en-US-AnaNeural")
    rate = data.get("rate", "+18%")
    
    if not text:
        return {"error": "text required"}
    
    # Generate
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    tmp.close()
    
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(tmp.name)
    
    # Return file
    with open(tmp.name, "rb") as f:
        audio_data = f.read()
    
    os.unlink(tmp.name)
    
    from fastapi.responses import Response
    return Response(content=audio_data, media_type="audio/mpeg")

# VibeVoice - needs GPU, 1.5B model ~3GB, runs on T4
vibe_image = modal.Image.debian_slim().pip_install(
    "torch", "torchaudio", "transformers", "accelerate", "huggingface_hub", "gradio", "librosa", "soundfile"
).run_commands("pip install git+https://github.com/vibevoice-community/VibeVoice.git")

@app.function(image=vibe_image, gpu="T4", timeout=600)
@modal.web_endpoint(method="POST")
async def vibevoice_generate(data: dict):
    """
    Expects: text, reference_audio_url (or base64), speaker_name
    For MVP, we use preset voices. Full clone needs reference audio upload.
    """
    # This is placeholder - full implementation loads VibeVoice model
    # Model: microsoft/VibeVoice-1.5B
    # Usage: python demo/gradio_demo.py --model_path microsoft/VibeVoice-1.5B
    return {"message": "VibeVoice endpoint - deploy full model here. See https://github.com/vibevoice-community/VibeVoice for inference code. Cost ~$0.01/min on T4."}

# Combined endpoint for shortdingus
@app.function(image=image)
@modal.web_endpoint(method="GET")
async def health():
    return {"status": "ok", "services": ["edge-tts", "vibevoice"], "cost": "$0.01/min vs 11Labs $0.18/min"}
