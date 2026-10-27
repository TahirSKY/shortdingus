"""Build the app-connected LTX server notebook (Vibe Voice-style workflow).

Reuses the pinned setup cells from create-ltx-notebook.py, then serves a small
token-protected HTTP API through a cloudflared tunnel so the app's Video page
can request generations and pull the MP4 straight into a hub — no PC download.
Personal, single-user workflow; no third-party access.
"""
import importlib.util
from pathlib import Path

_spec = importlib.util.spec_from_file_location("create_ltx_notebook", Path(__file__).resolve().parent / "create-ltx-notebook.py")
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
base_cells, code, markdown, write_notebook = _mod.base_cells, _mod.code, _mod.markdown, _mod.write_notebook

SERVER_PY = r'''
import json, os, queue, secrets, subprocess, threading, time, urllib.request, uuid
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

ROOT = Path('/content/ltx-video-test')
REPO = ROOT / 'LTX-Video'
PYTHON = ROOT / 'env/bin/python'
TOKEN = os.environ['LTX_SERVER_TOKEN']

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

jobs = {}
work = queue.Queue()

class Shot(BaseModel):
    prompt: str
    width: int = 384
    height: int = 256
    frames: int = 33
    fps: int = 24
    seed: int = 42
    image_url: str | None = None

def check(token):
    if token != TOKEN:
        raise HTTPException(status_code=401, detail='Bad token')

def validate(s):
    if not s.prompt.strip():
        raise HTTPException(400, 'Enter a shot prompt.')
    if s.width % 32 or s.height % 32 or min(s.width, s.height) < 128:
        raise HTTPException(400, 'Dimensions must be divisible by 32 and at least 128.')
    if s.width * s.height > 576 * 320:
        raise HTTPException(400, 'Area above the tested memory budget (max 576x320).')
    if s.frames < 9 or s.frames > 97 or (s.frames - 1) % 8:
        raise HTTPException(400, 'Frames must be 8n+1, between 9 and 97.')
    if not 8 <= s.fps <= 30:
        raise HTTPException(400, 'FPS must be between 8 and 30.')

def worker():
    while True:
        job_id, s = work.get()
        job = jobs[job_id]
        job['status'] = 'running'
        out = ROOT / 'outputs' / job_id
        out.mkdir(parents=True, exist_ok=True)
        try:
            settings = dict(prompt=s.prompt, width=s.width, height=s.height, num_frames=s.frames,
                frame_rate=s.fps, seed=s.seed, offload_to_cpu=True,
                pipeline_config=str(ROOT / 'test-config.yaml'), output_path=str(out))
            if s.image_url:
                img = out / 'start-image'
                with urllib.request.urlopen(s.image_url, timeout=30) as r:
                    img.write_bytes(r.read())
                settings.update(conditioning_media_paths=[str(img)], conditioning_start_frames=[0], conditioning_strengths=[1.0])
            (out / 'request.json').write_text(json.dumps(settings, indent=2))
            env = dict(os.environ, PYTHONPATH=str(REPO), PYTHONUNBUFFERED='1', PYTORCH_CUDA_ALLOC_CONF='expandable_segments:True')
            started = time.monotonic()
            subprocess.run([str(PYTHON), str(ROOT / 'run_shot.py'), str(out / 'request.json')],
                           check=True, env=env, cwd=REPO, capture_output=True, text=True, timeout=1800)
            videos = list(out.glob('*.mp4'))
            if len(videos) != 1:
                raise RuntimeError('Expected exactly one MP4 from the runner.')
            job.update(status='done', path=str(videos[0]), seconds=round(time.monotonic() - started, 1))
        except Exception as e:
            job.update(status='error', error=f'{type(e).__name__}: {e}'[:500])

threading.Thread(target=worker, daemon=True).start()

@app.get('/health')
def health(x_token: str = Header(default='')):
    check(x_token)
    gpu = subprocess.run(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader'], capture_output=True, text=True).stdout.strip()
    return {'ok': True, 'gpu': gpu, 'queued': work.qsize()}

@app.post('/generate')
def generate(s: Shot, x_token: str = Header(default='')):
    check(x_token)
    validate(s)
    job_id = uuid.uuid4().hex[:12]
    jobs[job_id] = {'status': 'queued', 'created': time.time()}
    work.put((job_id, s))
    return {'job_id': job_id}

@app.get('/jobs/{job_id}')
def status(job_id: str, x_token: str = Header(default='')):
    check(x_token)
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, 'Unknown job')
    return {k: v for k, v in job.items() if k != 'path'}

@app.get('/jobs/{job_id}/video')
def video(job_id: str, x_token: str = Header(default='')):
    check(x_token)
    job = jobs.get(job_id)
    if not job or job.get('status') != 'done':
        raise HTTPException(409, 'Video is not ready')
    return FileResponse(job['path'], media_type='video/mp4', filename=f'ltx-{job_id}.mp4')
'''

cells = [
    markdown("""
# LTX video: app server

**Experimental, not GPU-validated yet.** This turns a Colab GPU session into a small personal generation endpoint for your app's **Video** page — the same workflow as the voice tool: start Colab, paste the printed address into the app, generate, and the MP4 saves straight into your hub. Nothing is downloaded to your PC.

Choose **Runtime → Change runtime type → GPU**, then run every cell in order. The last cell prints a public address and a token; both die with the session. One job runs at a time; extra requests queue. Keep the token private — it is the only thing stopping a stranger from spending your GPU time.

Weights use the [LTXV Open Weights License](https://huggingface.co/Lightricks/LTX-Video/blob/main/LTX-Video-Open-Weights-License-0.X.txt). Use personally, without keep-alive or usage-limit workarounds; free Colab GPU availability is not guaranteed.
"""),
    *base_cells(),
    code("""
# 5. Install the small web server pieces in Colab's own Python (not the model env).
run([sys.executable, '-m', 'pip', 'install', '--quiet', 'fastapi==0.115.12', 'uvicorn==0.34.2', 'pydantic==2.11.4'])
cf = ROOT / 'cloudflared'
if not cf.exists():
    run(['curl', '-fsSL', '-o', str(cf), 'https://github.com/cloudflare/cloudflared/releases/download/2025.4.0/cloudflared-linux-amd64'])
    run(['chmod', '+x', str(cf)])
print('Server dependencies ready.')
"""),
    code("""
# 6. Write the generation server. One job at a time; results stay in the session.
server = r'''""" + SERVER_PY + """'''
(ROOT / 'server.py').write_text(server)
print('Server written.')
"""),
    code("""
# 7. Start the server and tunnel, then print the address and token for the app.
import re, secrets, threading, time
os.environ['LTX_SERVER_TOKEN'] = secrets.token_urlsafe(18)

def serve():
    import uvicorn
    uvicorn.run('server:app', host='127.0.0.1', port=8734, log_level='warning')

sys.path.insert(0, str(ROOT))
threading.Thread(target=serve, daemon=True).start()
time.sleep(3)

tunnel = subprocess.Popen([str(ROOT / 'cloudflared'), 'tunnel', '--url', 'http://127.0.0.1:8734', '--no-autoupdate'],
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
public_url = None
for line in tunnel.stdout:
    m = re.search(r'https://[a-z0-9-]+\\.trycloudflare\\.com', line)
    if m:
        public_url = m.group(0)
        break
if not public_url:
    raise RuntimeError('The tunnel did not start. Re-run this cell once; if it repeats, stop.')
print('=' * 60)
print('Paste these into the Video page in the app:')
print('Endpoint:', public_url)
print('Token:   ', os.environ['LTX_SERVER_TOKEN'])
print('=' * 60)
print('Keep this tab open while generating. Closing it ends the address and token.')
"""),
]

if __name__ == "__main__":
    write_notebook(cells, "LTX video app server.ipynb", "ltx-video-server.ipynb")
