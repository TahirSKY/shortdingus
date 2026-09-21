"""
Edge TTS Wrapper - FREE unlimited TTS, no API key
pip install edge-tts
Usage: python edge_tts_wrapper.py --text "Hello" --channel brainbank
"""
import asyncio
import edge_tts
import argparse

VOICES = {
    "brainbank": ("en-US-AnaNeural", "+18%"),  # cute yappucino
    "brainbank_alt1": ("en-US-AriaNeural", "+15%"),  # confident fast
    "brainbank_alt2": ("en-US-EmmaMultilingualNeural", "+12%"),  # cheerful
    "steadywalks": ("en-US-JennyNeural", "+0%"),  # friendly, empathetic dog mom
    "steadywalks_alt": ("en-US-MichelleNeural", "+0%"),
    "feedgravity": ("en-US-GuyNeural", "+5%"),  # tech
    "feedgravity_alt": ("en-US-DavisNeural", "+5%"),
}

async def generate(text, voice, rate, output):
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(output)
    print(f"Saved {output} with {voice} at {rate}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--voice", default=None)
    parser.add_argument("--rate", default=None)
    parser.add_argument("--channel", default="brainbank")
    parser.add_argument("--output", default="/tmp/output.mp3")
    args = parser.parse_args()
    
    if args.voice:
        v, r = args.voice, args.rate or "+0%"
    else:
        v, r = VOICES.get(args.channel, VOICES["brainbank"])
        if args.rate: r = args.rate
    
    asyncio.run(generate(args.text, v, r, args.output))
