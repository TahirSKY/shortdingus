# Shared AI video generation: Colab first, reusable across hubs

## Recommendation

Build **one shared video-generation system across hubs**. Start with image-led **LTX-Video 2B distilled** shots, then add small Wan T2V and stronger models when the GPU supports them.

Your laptop runs the browser; Google’s GPU generates. Finished videos return to project files for voiceover/editing and Remotion export.

**Change from Vibe Voice Studio:** control generation in the notebook, not through a public server link. Google restricts external-web-UI use on free Colab. This is a personal experiment, not an unlimited customer service.

Leave Lottie polishing aside; do not replace or repair the avatar in this task.

## What the research established

I inspected Vibe Voice Studio: VibeVoice-1.5B through a Cloudflare link, browser-local history, no durable queue or worker credential. Reuse its easy setup, not its public-link architecture.

Paid APIs charge per generated duration/attempt. Open weights remove the provider charge, not computation costs. Free Colab offers occasional access; existing app/render costs remain.

Google does not guarantee free GPU type or availability. Sessions can terminate early; “up to 12 hours” is a maximum, not an allocation. Free-tier restrictions include external web-UI control and distributed workers. Outbound polling does not automatically avoid them. Colab terms also prohibit providing direct or indirect Colab access to third parties.

### Model shortlist

Documentation-based findings, **not tests on your GPU**. Memory figures are published configurations, not universal minimums.

| Model | Inputs | Recommendation / limitation |
|---|---|---|
| **LTX-Video `ltxv-2b-0.9.8-distilled`** | Text/image | First experiment. Small enough to be plausible on T4; lower detail than larger models. Checkpoint ~6.34 GB plus auxiliary files. T4 speed/fit untested. |
| **Wan2.1-T2V-1.3B** | Text only | Second small model; Apache-2.0. Published 8.19 GB VRAM, ~17.6 GB download. Four-minute/5-second example uses a 4090, not T4. |
| **Wan2.2-TI2V-5B** | Text/image | Stronger next tier. Official 720p example needs 24 GB VRAM with offloading; ~34.2 GB download. Not a stock T4 promise. |
| **Wan2.2 T2V/I2V A14B** | Separate variants | Quality-focused optional tier. Official example specifies 80 GB VRAM; smaller-memory adaptations can be very slow. |
| **LTX-2.5 22B** | Text/image; audio/control workflows | Later audiovisual evaluation. Starter download ~66 GiB; not a first free-T4 target. |
| **HunyuanVideo-1.5 480p I2V step-distilled** | Image | Research candidate only. Published 14 GB with offloading does not prove T4 reliability. License excludes EU, UK and South Korea. |

LTX weights use custom licenses: commercial entities at **$10M+ annual revenue** need a separate agreement; use restrictions also apply. Wan’s Apache-2.0 is simpler. Review exact weight licenses before enabling models.

Latest downloadable LTX found: **2.5**. No newer general-purpose open-weight Wan beyond **2.2** was established; hosted product branding is not evidence of downloadable weights.

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

Build generation requests/history, secure pairing, manual Colab approval and direct storage. Reuse asset cards and editor handoff. Test request → generation → saved playback → editor → export, plus interruption, repeated clicks and upload recovery. Files must outlive the notebook.

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

**Potentially $0 video-model compute**, within variable free Colab access—not guaranteed $0 overall. Storage/bandwidth, existing AI calls, AWS export and any voluntarily purchased GPU remain separate.

No GPU/model execution or account allowance was verified here. Phase 1 must establish actual speed, memory and full-clip quality. Stronger models may need paid GPUs; none will be purchased automatically.

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