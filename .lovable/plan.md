# Shared AI video generation: Colab first, reusable across hubs

## Recommendation

Build **one shared video-generation system**, not separate generators for each hub. Start with short, image-led shots using **LTX-Video 2B distilled**, then add a small Wan text-to-video option and stronger models when the available GPU can actually run them.

Your laptop only runs the browser. Google’s GPU does the generation. Finished videos return to the project library and work with the existing editor, voiceovers and Remotion export.

**Important change from Vibe Voice Studio:** start with generation controlled inside the Colab notebook, not a public server link. Google restricts using free Colab primarily through an external web interface. A working tunnel is not proof that Google permits it. This is an occasional, personal-use experiment—not an unlimited free service for customers.

Leave further Lottie mouth/eye polishing aside. This project is about generating new shots; it does not silently replace or repair the existing avatar.

## What the research established

I inspected Vibe Voice Studio’s code. It starts VibeVoice-1.5B in Colab, exposes a Cloudflare link, and sends voice requests through the app. Its output history lives in the browser, not a durable project library. It has no durable generation queue or app-managed worker credential. Reuse the easy setup and connection feedback, **not** its long-request/public-link architecture.

Paid video generation can become expensive because you pay for generated duration and every additional attempt. Open weights remove the per-generation provider API charge, but **the computation is not inherently free**. Free Colab offers limited, variable access; storage, transfers, existing AI analysis/chat and AWS final rendering remain separate costs.

Official Google guidance says free GPU type and availability are not guaranteed; sessions may end early, and the published maximum is up to 12 hours, not a promised allocation. Free-tier restrictions include bypassing the notebook interface for a web UI and distributed computing workers. A continuously polling worker does not automatically avoid those rules. Colab’s terms also prohibit providing direct or indirect Colab access to third parties.

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

## How to get less broken-looking video

- **Image-to-video first for characters and visual identity:** start from a deliberate reference image, then describe the action and camera movement. Uploaded images require no image-generation API purchase.
- Generate **one focused shot at a time**, review it, then assemble a longer video. Start tests around 3–5 seconds; this is a test budget, not a hub rule or universal duration limit.
- Try realistic, flat-2D and stylized-3D references using the same generator. Separate hubs can supply their own references and guidance without separate infrastructure.
- Use simple actions before complex interactions, occlusions or camera rotations. Reference images help but do not guarantee unchanged faces, hands, outfits or geometry.
- Keep model, seed, reference, prompt and settings for each take. Repeatability and controlled comparisons are more useful than blind automatic rerolls.
- Do not automatically upscale or regenerate rejected takes. Show the actual native output quality; upscaling cannot reliably repair incorrect movement or anatomy.

**“3D” here means a 3D-looking video, not an editable 3D model or rig.** General video generation also does not guarantee voice-synchronized mouths. Audio-driven avatar models are a separate later investigation; keep your existing voiceover separate in the first release.

## The user experience

1. Open any project and choose **Generate video** alongside media search and uploads.
2. Choose **Animate an image** or **From text**. Pick an existing project/hub image or upload one.
3. Enter the shot prompt and choose a supported model, shape and duration. Controls reflect the exact model’s supported settings.
4. Save the request. The project shows **Waiting for you to run Colab**—not a pretend running spinner.
5. Open our supplied notebook, start its setup cell, and pair it with your project session.
6. Inside the notebook, click **Fetch request**, review the image and settings, then **Generate**. One user-approved job runs at a time.
7. See real stages: downloading model, loading model, generating frames, encoding, uploading and saved. Show a percentage only where it is measurable.
8. The MP4 appears in project files automatically. Preview, download, keep/discard, or use it in the editor alongside voiceover, music and other shots.

No public tunnel, no laptop inference, no need to download and re-upload every result. You still operate the notebook; this does **not** promise official Google approval of every integrated workflow. No endless queue-draining daemon or keep-alive tricks on free Colab.

## Build in phases, with a quality gate

### Phase 1 — Prove the model before building around it

Provide a pinned Colab notebook for LTX-Video 2B distilled. Check GPU, available GPU memory, system RAM and disk before downloading or loading. Use T4-compatible precision/kernels; do not assume native BF16/FP8 support. Offloading saves GPU memory but may make system RAM or transfers the bottleneck.

Run short tests with three references: realistic person/object, 2D character and stylized-3D character. Also test one text-only shot. Record cold-start time, download size, generation time, peak memory and visual failures. Watch the entire output, including the last seconds—not only a still frame.

**Proceed only if fit and quality are useful.** If the small model looks poor, report that rather than presenting a technically completed pipeline as a high-quality solution. No promised videos-per-day or generation-time estimate until measurement.

### Phase 2 — Connect one model to all projects

Add the project generation panel, durable request/history records, secure notebook pairing, manual request approval in Colab and direct output storage. This is the first working end-to-end core. Reuse existing asset cards, editor handoff and hub/shared references.

Test saving a request → pairing → generating → uploading → playback in project → editor use → final Remotion export. Also test interruption, repeated clicks and upload recovery. Keep completed files independently of the notebook session.

### Phase 3 — Add models that earn their place

Add Wan2.1 1.3B text-to-video as a comparison, then Wan2.2 5B for supported larger GPUs. Evaluate larger Wan/LTX separately, using the same request/output contract. Each adapter must pass real generation, memory and quality tests before its selector becomes available.

Display supported capabilities and GPU requirements. Never silently swap models, lower quality settings or launch paid compute when a request cannot run.

### Phase 4 — Hub guidance and optional automation

After the core works, create realistic, 2D animation and stylized-3D hubs with reusable references and optional creative guidance—not rigid templates. Internal/external agents can propose shot requests, inspect capabilities and reuse finished assets; the user still approves execution.

If later desired, use a separately approved GPU hosting arrangement intended for automated workers. The same adapters and stored jobs should work there. Do not turn your free Colab account into a shared customer GPU pool. Do not change the account plan or enable paid APIs in this task.

## Technical design

```text
Project UI / agent proposal
          ↓
Lovable Cloud: durable request + authorization
          ↕ outbound HTTPS, scoped notebook session
Colab: user reviews → one model → one approved job
          ↓ direct upload
Project video asset → editor → Remotion / AWS export
```

- Keep existing `asset_groups`, `projects` and `assets`. Add separate generation-job and worker-session records, with caller-scoped access and appropriate grants/policies. Do not assume public asset IDs are an authorization boundary.
- Register exact model revisions, licenses, tasks, parameter constraints and tested hardware profiles. Use small model adapters rather than arbitrary executable workflows/custom nodes. Store requested and actual settings separately.
- Pair using a short-lived, single-use code approved in the app, exchanged for a revocable job-scoped session. No `HUB_WRITE_TOKEN`, administrator key or user login token in the notebook. No credentials in URLs, printed cell output or committed notebooks.
- Notebook obtains only authorized reference downloads and narrowly scoped uploads to server-selected paths. Validate inputs, file sizes, media types and decoded dimensions; verify uploaded objects before completion. Do not proxy arbitrary user URLs or buffer entire videos through edge functions.
- Use atomic claims, attempt IDs, leases, in-flight heartbeats and fenced/idempotent completion. States include queued, running, uploading, saved, failed, cancelled and interrupted/unknown. A lost heartbeat is not proof generation stopped.
- Reconcile uploaded outputs before offering a retry. Require a fresh user decision before restarting uncertain inference. Seeds are not checkpoints; interruption usually means restarting the shot. Exactly-once GPU computation cannot be guaranteed.
- Convert outputs in the worker to broadly playable MP4 and enforce tested dimensions/bitrate. Save provenance and references with the asset. If a higher-resolution original is kept, create a separate render-safe copy before editor export; do not assume browser-only upload safeguards run for notebook-generated media.
- Preserve existing analysis behavior, with separately visible charges. Do not add new paid prompt rewriting, image generation or video-quality judging by default. Existing chat, analysis and AWS export are not made free by this core.

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