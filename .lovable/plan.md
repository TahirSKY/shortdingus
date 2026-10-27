# Shared AI video generation: Colab first, reusable across hubs

## Recommendation

Build **one shared video-generation system**, not separate generators for each hub. Start with short, image-led shots using **LTX-Video 2B distilled**, then add a small Wan text-to-video option and stronger models when the available GPU can actually run them.

Your laptop only runs the browser. Google’s GPU does the generation. Finished videos return to the project library and work with the existing editor, voiceovers and Remotion export.

**Important change from Vibe Voice Studio:** start with generation controlled inside the Colab notebook, not a public server link. Google restricts using free Colab primarily through an external web interface. A working tunnel is not proof that Google permits it. This is an occasional, personal-use experiment—not an unlimited free service for customers.

Leave further Lottie mouth/eye polishing aside. This project is about generating new shots; it does not silently replace or repair the existing avatar.

## What the research established

I inspected Vibe Voice Studio’s code: it starts VibeVoice-1.5B, exposes a Cloudflare link and proxies voice requests. History is browser-local; there is no durable queue or app-managed worker credential. Reuse its easy setup, not its public-link/long-request architecture.

Paid APIs charge for generated duration and additional attempts. Open weights remove that provider charge, not the underlying computation. Free Colab can provide occasional GPU access; storage, transfers, existing AI calls and AWS export remain separate costs.

Google does not guarantee free GPU type or availability. Sessions can terminate early; “up to 12 hours” is a maximum, not an allocation. Free-tier restrictions include external web-UI control and distributed workers. Outbound polling does not automatically avoid them. Colab terms also prohibit providing direct or indirect Colab access to third parties.

### Model shortlist

These are documentation-based findings, **not models I have run on your Colab GPU**. GPU-memory figures describe published configurations, not guarantees for all settings.

| Model | Inputs | Place in the system | Main limitation |
|---|---|---|---|
| **LTX-Video `ltxv-2b-0.9.8-distilled`** | Text or image | First experiment: both input modes with a relatively small model | Lower detail than larger models; real T4 fit/speed still needs testing. Checkpoint is about 6.34 GB before auxiliary components. |
| **Wan2.1-T2V-1.3B** | Text | Second small-model option with Apache-2.0 licensing | Not native image-to-video. Published 8.19 GB GPU memory; full repository download about 17.6 GB. Published four-minute example uses a 4090, not T4. |
| **Wan2.2-TI2V-5B** | Text or image | Stronger next tier when a suitable GPU is available | Official 720p example needs at least 24 GB GPU memory with offloading. Not a stock 16 GB T4 promise. About 34.2 GB repository download. |
| **Wan2.2 T2V/I2V A14B** | Separate text/image variants | Quality-focused optional tier | Official example specifies 80 GB GPU memory. Smaller-memory adaptations are experimental and can be very slow. |
| **LTX-2.5 22B** | Text or image; additional audio/control workflows | Later evaluation for richer audiovisual shots | Current documented starter download is roughly 66 GiB. Not a sensible first free-T4 setup. |
| **HunyuanVideo-1.5 480p I2V step-distilled** | Image; other variants support text | Conditional research candidate, not enabled initially | Published 14 GB with offloading does not prove reliable T4 operation. License excludes EU, UK and South Korea, making it unsuitable as a broadly available default. |

LTX-Video 0.9.8 and modern LTX weights use custom licenses, not simply their code repository’s license. Commercial entities with annual revenue at or above **$10 million** need a separate commercial agreement; use restrictions also apply. Wan’s Apache-2.0 license is simpler. Record and review the exact weight license before enabling a model; never generalize one family’s license to every release.

The latest downloadable LTX release found was **LTX-2.5**. This research did not establish newer open-weight general-purpose Wan releases beyond **2.2**; a newer hosted product name is not evidence of downloadable weights.

## Getting less broken-looking video

- Prefer **image-to-video for identity**: a deliberate reference image, one clear action and camera direction. Uploaded references require no paid image API.
- Generate and review focused shots, then assemble them. Start tests around 3–5 seconds: a test budget, not rigid hub timing.
- Compare realistic, flat-2D and stylized-3D references. Complex motion, occlusion and long shots can cause faces, outfits and geometry to drift in every family.
- Preserve each take’s model, seed, reference and settings. No blind automatic rerolls or upscaling; higher resolution cannot fix wrong anatomy/movement.

**3D-looking video is not an editable 3D model or rig.** Voice-synchronized mouths are not guaranteed either. Audio-driven avatars deserve separate evaluation; keep voiceover separate initially.

## The user experience

1. In any project, choose **Generate video** → **Animate an image** or **From text**.
2. Select/upload a reference, enter the shot prompt and choose supported model/settings.
3. Save the request; show **Waiting for you to run Colab**.
4. Open our notebook, run setup and pair it with your project session.
5. Inside Colab, **Fetch request**, review it and click **Generate**. One approved job runs at a time.
6. Show real download/loading/generation/encoding/upload stages, with percentages only when measurable.
7. Save the MP4 directly to project files; preview/download/use it alongside voiceover and other shots in the editor.

No public tunnel, laptop inference or manual download/re-upload. The notebook remains the execution interface—not an endless remotely controlled daemon. This is better aligned with notebook use, **not a claim of official Google approval**. No keep-alive or policy-bypass tricks.

## Build in phases, with a quality gate

### Phase 1 — Prove the model

Provide a pinned LTX-Video 2B distilled Colab notebook. Check GPU/VRAM/RAM/disk first; use T4-compatible precision/kernels, not assumed native BF16/FP8 support. Offloading can shift failures to RAM or transfers.

Generate three short I2V tests—realistic, 2D and stylized 3D—and one T2V test. Measure download/cold-start/generation time and peak memory. Watch each entire clip, including its final seconds.

**Proceed only if fit and quality are useful.** If the small model looks poor, say so; a technically working pipeline is not a quality result. Promise no daily volume or speed before measurements.

### Phase 2 — Connect one model to all projects

Add the project generation panel, durable request/history records, secure notebook pairing, manual request approval in Colab and direct output storage. This is the first working end-to-end core. Reuse existing asset cards, editor handoff and hub/shared references.

Test saving a request → pairing → generating → uploading → playback in project → editor use → final Remotion export. Also test interruption, repeated clicks and upload recovery. Keep completed files independently of the notebook session.

### Phase 3 — Add models that earn their place

Compare Wan2.1 1.3B T2V; add Wan2.2 5B for suitable larger GPUs. Larger Wan/LTX remain separate evaluations. Each adapter must pass generation, memory and quality tests before selection is enabled. Never silently swap models, lower quality or launch paid compute.

### Phase 4 — Hub guidance and optional automation

Later create realistic/2D/stylized-3D hubs with reusable references and optional guidance, not templates. Agents can propose jobs and reuse assets; users approve execution.

Optional automated execution must use separately approved infrastructure intended for workers, reusing the same job/model contract. Do not share your free Colab as a customer GPU pool, upgrade the account or enable paid APIs in this task.

## Technical design

```text
Project request → Lovable Cloud job
                        ↕ outbound HTTPS
Colab: user reviews → one model → one approved job
                        ↓ direct upload
Project asset → editor → Remotion / AWS export
```

- Reuse hubs/projects/assets; add separate durable jobs and worker sessions with caller-scoped access. Existing public asset IDs are not authorization.
- Register exact model revisions, licenses, supported inputs/settings and tested GPU profiles. Use adapters, never arbitrary Python or custom-node workflows from requests. Store requested and actual settings separately.
- Pair with a short-lived single-use code approved in the app and revocable scoped session. Never put broad write tokens, administrator keys or login tokens into notebooks, URLs or logs.
- Authorized references and signed uploads only, to server-selected paths. Validate media/size/dimensions and verify stored output before completion. Do not proxy arbitrary URLs or buffer entire videos through edge functions.
- Atomic job claims, leases, attempt IDs, heartbeats and idempotent/fenced completion. Show interrupted/unknown when a session disappears; reconcile uploaded output before retrying. User approval is required to restart uncertain work. Seeds are not checkpoints; exactly-once computation cannot be guaranteed.
- Encode playable MP4 in the worker, with tested dimension/bitrate limits and provenance. Keep separate originals/render-safe copies when needed; browser-only upload safeguards do not automatically apply to notebook outputs.
- Preserve existing analysis with separately visible charges. No new paid prompt rewriting, image generation or video-quality judging by default.

## Cost and validation boundaries

**Potentially $0 for the video-model compute:** occasional personal runs within free Colab availability, using permitted open weights. **Not guaranteed $0 for the overall app:** storage, bandwidth, existing AI calls, final renders and any voluntarily purchased GPU access remain separate.

No models were generated during this research and no GPU availability was verified for your account. Actual T4 performance, output quality, model-cache practicality and your Cloud allowance remain to be checked in Phase 1. Stronger models may require paid GPU access; the app will not purchase it automatically.

## Primary sources

- [Google Colab FAQ: restrictions and resource limits](https://research.google.com/colaboratory/faq.html)
- [Colab Additional Terms, August 13, 2026](https://colab.research.google.com/terms)
- [LTX-Video releases and capabilities](https://github.com/Lightricks/LTX-Video)
- [LTX-Video 0.9.8 weight license](https://huggingface.co/Lightricks/LTX-Video/blob/main/LTX-Video-Open-Weights-License-0.X.txt)
- [Wan2.1 official model/runtime guidance](https://github.com/Wan-Video/Wan2.1)
- [Wan2.2 official model/runtime guidance](https://github.com/Wan-Video/Wan2.2)
- [LTX-2 / LTX-2.5 official pipelines](https://github.com/Lightricks/LTX-2) and [current license](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x)
- [HunyuanVideo-1.5 runtime guidance](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5) and [license](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5/blob/master/LICENSE)
- [Diffusers memory optimization](https://huggingface.co/docs/diffusers/optimization/memory)

**Proposed first milestone:** one genuinely usable LTX image-to-video shot, generated in your Colab notebook, automatically saved into this app and successfully exported with your voiceover—before investing in multiple models or new hubs.