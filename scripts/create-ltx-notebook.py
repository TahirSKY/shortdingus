"""Build the downloadable, GPU-gated LTX experiment notebook without credentials.

Shared setup cells (GPU check, isolated env, FP16 patch, pinned model download)
are reused by create-ltx-server-notebook.py for the app-connected server notebook.
"""
import json
from pathlib import Path


def code(source):
    return {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": source.strip().splitlines(keepends=True)}


def markdown(source):
    return {"cell_type": "markdown", "metadata": {}, "source": source.strip().splitlines(keepends=True)}


INTRO = markdown("""
# LTX video: first GPU test

**Experimental, not GPU-validated yet.** This notebook tests the exact LTX-Video 2B 0.9.8 distilled model before connecting it to your projects. It is not the finished app-controlled workflow. No public server, tunnel, paid API, or app credentials are used here.

Choose **Runtime → Change runtime type → GPU**, then run the cells in order. Your laptop does not generate the video. Watch the complete result inside Colab; there is no requirement to download it to your PC. Model files and test results are temporary in this first test.

The first pass is deliberately small (33 frames at 24 fps). Increase to 73 or 97 frames only after it works. Downloads can be large and GPU access can disappear. If a step fails, stop: there is no automatic retry or model substitution.

Weights use the [LTXV Open Weights License](https://huggingface.co/Lightricks/LTX-Video/blob/main/LTX-Video-Open-Weights-License-0.X.txt); review it before use. See [Colab restrictions](https://research.google.com/colaboratory/faq.html). Use this notebook personally, without keep-alive or usage-limit workarounds.
""")

GPU_CHECK = code("""
# 1. Check the assigned machine before downloading anything.
import json, os, shutil, subprocess, sys, time
from pathlib import Path
from IPython.display import Video, display

ROOT = Path('/content/ltx-video-test')
ROOT.mkdir(exist_ok=True)
gpu = subprocess.run(['nvidia-smi', '--query-gpu=name,memory.total,driver_version', '--format=csv,noheader'], capture_output=True, text=True)
if gpu.returncode:
    raise RuntimeError('No GPU is available. Choose a GPU runtime; do not run this test on CPU.')
print('Assigned GPU:', gpu.stdout.strip())
free_gib = shutil.disk_usage('/content').free / 1024**3
ram_gib = os.sysconf('SC_PAGE_SIZE') * os.sysconf('SC_PHYS_PAGES') / 1024**3
print(f'System RAM: {ram_gib:.1f} GiB; free disk: {free_gib:.1f} GiB')
if free_gib < 40:
    raise RuntimeError('This isolated test needs at least 40 GiB of free disk for dependencies and model files.')
print('These checks do not guarantee model fit. Host RAM and GPU memory can still run out.')
""")

ENV_SETUP = code("""
# 2. Create an isolated Python environment; do not replace Colab's notebook packages.
def run(args, **kwargs):
    subprocess.run([str(a) for a in args], check=True, **kwargs)

run([sys.executable, '-m', 'pip', 'install', '--quiet', 'uv==0.8.22'])
UV = [sys.executable, '-m', 'uv']
ENV = ROOT / 'env'
run(UV + ['venv', '--python', '3.11', str(ENV)])
PYTHON = ENV / 'bin/python'
run(UV + ['pip', 'install', '--python', str(PYTHON), 'torch==2.6.0', 'torchvision==0.21.0', '--index-url', 'https://download.pytorch.org/whl/cu124'])
run(UV + ['pip', 'install', '--python', str(PYTHON),
    'diffusers==0.35.1', 'transformers==4.51.3', 'huggingface-hub==0.30.2',
    'accelerate==1.6.0', 'safetensors==0.5.3', 'sentencepiece==0.2.0',
    'numpy==1.26.4', 'Pillow==11.2.1', 'PyYAML==6.0.2', 'einops==0.8.1',
    'timm==1.0.15', 'imageio==2.37.0', 'imageio-ffmpeg==0.6.0', 'av==14.3.0'])

SOURCE_REVISION = '4b2d053057623ddd4d0a1d3e9cd28890e9ef487f'
REPO = ROOT / 'LTX-Video'
if not REPO.exists():
    run(['git', 'clone', '--no-checkout', 'https://github.com/Lightricks/LTX-Video.git', str(REPO)])
run(['git', '-C', str(REPO), 'checkout', '--detach', SOURCE_REVISION])
actual = subprocess.check_output(['git', '-C', str(REPO), 'rev-parse', 'HEAD'], text=True).strip()
if actual != SOURCE_REVISION:
    raise RuntimeError('Source revision does not match the pinned test.')
run(UV + ['pip', 'install', '--python', str(PYTHON), '--no-deps', '-e', str(REPO)])
run(UV + ['pip', 'check', '--python', str(PYTHON)])
resolved = subprocess.check_output(UV + ['pip', 'freeze', '--python', str(PYTHON)], text=True)
(ROOT / 'environment.txt').write_text(resolved)
print('Isolated environment ready. No model has generated anything yet.')
""")

FP16_PATCH = code("""
# 3. Apply explicit FP16 compatibility changes to this temporary pinned checkout.
# Upstream uses BF16; changing the YAML alone is not sufficient on a T4.
source_path = REPO / 'ltx_video/inference.py'
source = source_path.read_text()
changes = [
    ('    elif precision == "bfloat16":',
     '    elif precision == "float16":\\n        return Transformer3DModel.from_pretrained(ckpt_path).to(torch.float16)\\n    elif precision == "bfloat16":'),
    ('    transformer = transformer.to(device)\\n    vae = vae.to(device)\\n    text_encoder = text_encoder.to(device)',
     '    component_dtype = torch.float16 if precision == "float16" else torch.bfloat16\\n    transformer = transformer.to(device)\\n    vae = vae.to(dtype=component_dtype).to(device)\\n    text_encoder = text_encoder.to(dtype=component_dtype).to(device)'),
    ('    vae = vae.to(torch.bfloat16)\\n    text_encoder = text_encoder.to(torch.bfloat16)',
     '    vae = vae.to(component_dtype)\\n    text_encoder = text_encoder.to(component_dtype)'),
]
for old, new in changes:
    if old not in source and new in source:
        continue
    if source.count(old) != 1:
        raise RuntimeError('Pinned source does not match the expected precision patch. Stop rather than guessing.')
    source = source.replace(old, new, 1)
compile(source, str(source_path), 'exec')
source_path.write_text(source)
print('FP16 loader prepared. Its numerical quality and memory use still need a real GPU test.')
""")

MODEL_DOWNLOAD = code("""
# 4. Download only pinned required components; disable extra prompt-enhancement models.
setup = r'''
import json
from pathlib import Path
import torch, yaml
from huggingface_hub import hf_hub_download, snapshot_download

root = Path('/content/ltx-video-test')
model_revision = '8984fa25007f376c1a299016d0957a37a2f797bb'
text_revision = 'b89adadeccd9ead2adcb9fa2825d3fabec48d404'
if not torch.cuda.is_available():
    raise RuntimeError('The isolated environment cannot access the GPU.')
print('Torch:', torch.__version__, 'GPU:', torch.cuda.get_device_name(0), flush=True)
checkpoint = hf_hub_download('Lightricks/LTX-Video', 'ltxv-2b-0.9.8-distilled.safetensors', revision=model_revision)
upscaler = hf_hub_download('Lightricks/LTX-Video', 'ltxv-spatial-upscaler-0.9.8.safetensors', revision=model_revision)
text_root = snapshot_download('PixArt-alpha/PixArt-XL-2-1024-MS', revision=text_revision, allow_patterns=['text_encoder/*', 'tokenizer/*'])
config = yaml.safe_load((root / 'LTX-Video/configs/ltxv-2b-0.9.8-distilled.yaml').read_text())
config.update(checkpoint_path=checkpoint, spatial_upscaler_model_path=upscaler,
    text_encoder_model_name_or_path=text_root, precision='float16', prompt_enhancement_words_threshold=0)
(root / 'test-config.yaml').write_text(yaml.safe_dump(config, sort_keys=False))
(root / 'revisions.json').write_text(json.dumps({'model': model_revision, 'text_encoder': text_revision}, indent=2))
print('Pinned components ready.', flush=True)
'''
(ROOT / 'setup_models.py').write_text(setup)
run([PYTHON, ROOT / 'setup_models.py'])
""")

# The single-shot runner, shared by the manual test cell and the server notebook.
RUNNER = r'''
import json, sys, time
from pathlib import Path
import torch
from ltx_video.inference import InferenceConfig, infer

settings = json.loads(Path(sys.argv[1]).read_text())
torch.cuda.reset_peak_memory_stats()
started = time.monotonic()
try:
    infer(InferenceConfig(**settings))
except Exception as error:
    print('TEST STOPPED:', type(error).__name__, str(error), flush=True)
    raise
finally:
    report = {'generation_seconds': time.monotonic()-started,
        'peak_gpu_allocated_gib': torch.cuda.max_memory_allocated()/1024**3,
        'peak_gpu_reserved_gib': torch.cuda.max_memory_reserved()/1024**3,
        'gpu': torch.cuda.get_device_name(0), 'torch': torch.__version__}
    Path(settings['output_path'], 'measurement.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2), flush=True)
'''

RUNNER_CELL = code(f"""
# Write the shared single-shot runner used to generate one take per call.
runner = r'''{RUNNER}'''
(ROOT / 'run_shot.py').write_text(runner)
print('Runner ready.')
""")

MANUAL_CELLS = [
    markdown("""
## First shot
Use text alone initially, or set `IMAGE_PATH` to an image already in the Colab files panel. For later comparisons use your own realistic, 2D and stylized-3D references. This test does not ask you to download any generated video.

The native output is deliberately low-resolution. Do not judge final production sharpness from this tiny test; judge whether generation works and whether motion breaks. After success increase frames to 73 (~3 seconds) or 97 (~4 seconds) explicitly. Larger settings can exhaust memory.
"""),
    code("""
# 5. Choose one test. Change these values explicitly; no automatic quality fallback.
PROMPT = 'A small red sailboat moves slowly across a calm lake. Gentle ripples spread behind it. The camera remains stationary in soft morning light.'
IMAGE_PATH = ''  # Example: /content/reference.png; empty means text-to-video.
WIDTH = 384
HEIGHT = 256
FRAMES = 33
FPS = 24
SEED = 42

if not PROMPT.strip():
    raise ValueError('Enter a shot prompt.')
if WIDTH % 32 or HEIGHT % 32 or min(WIDTH, HEIGHT) < 128:
    raise ValueError('Use dimensions divisible by 32 and at least 128.')
if FRAMES < 9 or FRAMES > 97 or (FRAMES - 1) % 8:
    raise ValueError('For this memory test choose 8n+1 frames, between 9 and 97.')
if WIDTH * HEIGHT > 384 * 256:
    raise ValueError('Complete the small test first; this notebook limits the initial area to 384 × 256.')
if IMAGE_PATH and not Path(IMAGE_PATH).is_file():
    raise ValueError('The reference image path does not exist in this Colab session.')
print(f'Test: {WIDTH} × {HEIGHT}, {FRAMES} frames, {FRAMES/FPS:.2f} seconds; seed {SEED}')
"""),
    code("""
# 6. Generate one take. Do not restart automatically after failure.
attempt = ROOT / 'outputs' / str(time.time_ns())
attempt.mkdir(parents=True)
settings = dict(prompt=PROMPT, width=WIDTH, height=HEIGHT, num_frames=FRAMES,
    frame_rate=FPS, seed=SEED, offload_to_cpu=True,
    pipeline_config=str(ROOT / 'test-config.yaml'), output_path=str(attempt))
if IMAGE_PATH:
    settings.update(conditioning_media_paths=[IMAGE_PATH], conditioning_start_frames=[0], conditioning_strengths=[1.0])
(attempt / 'request.json').write_text(json.dumps(settings, indent=2))
env = dict(os.environ, PYTHONPATH=str(REPO), PYTHONUNBUFFERED='1', PYTORCH_CUDA_ALLOC_CONF='expandable_segments:True')
run([PYTHON, ROOT / 'run_shot.py', attempt / 'request.json'], env=env, cwd=REPO)
videos = list(attempt.glob('*.mp4'))
if len(videos) != 1:
    raise RuntimeError('Expected exactly one MP4. Inspect the output directory; do not regenerate blindly.')
RESULT = videos[0]
print('Generated:', RESULT.name)
display(Video(str(RESULT), embed=True))
"""),
    code("""
# 7. Review the WHOLE clip and preserve a small, credential-free diagnostic report.
print((attempt / 'measurement.json').read_text())
print('Watch movement through the final frame: face/eyes, hands, clothing, background, flicker and frozen frames.')
print('This completes only the GPU experiment. Project storage and app-controlled generation are not connected yet.')
print('If it failed, share the error and assigned GPU name—not credentials or signed links.')
"""),
]


def base_cells():
    """Pinned setup shared by the manual test notebook and the server notebook."""
    return [GPU_CHECK, ENV_SETUP, FP16_PATCH, MODEL_DOWNLOAD, RUNNER_CELL]


def write_notebook(cells, name, filename):
    notebook = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}, "colab": {"name": name}, "accelerator": "GPU"},
        "cells": [{**cell, "id": f"{filename.split('.')[0]}-{i}"} for i, cell in enumerate(cells)],
    }
    destination = Path(__file__).resolve().parents[1] / "public/colab" / filename
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(notebook, indent=2) + "\n")
    print(f"Created {destination.relative_to(destination.parents[2])}")


if __name__ == "__main__":
    write_notebook([INTRO] + base_cells() + MANUAL_CELLS, "LTX video GPU test.ipynb", "ltx-video-test.ipynb")
