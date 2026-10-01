import { createOpenAI } from "npm:@ai-sdk/openai@4.0.83";
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, stepCountIs, streamText, tool, type UIMessage } from "npm:ai@7.0.126";
import { z } from "npm:zod@3.25.76";
import { admin, assetUrl, cors, json } from "../_shared/hub.ts";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "../_shared/run-id.ts";

const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const FN = () => `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const KEEP_MESSAGES = 30;
const headers = { ...cors, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id" };

const clip = (s: unknown, n: number) => { const t = typeof s === "string" ? s : JSON.stringify(s ?? ""); return t.length > n ? t.slice(0, n) + "…" : t; };
const numbered = (code: string) => code.split("\n").map((l, i) => `${String(i + 1).padStart(4)}| ${l}`).join("\n");

async function callFn(name: string, body: Record<string, unknown>) {
  const res = await fetch(`${FN()}/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: Deno.env.get("HUB_WRITE_TOKEN"), ...body }) });
  const text = await res.text();
  let data: any; try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; }
  if (!res.ok) return { error: data?.error || `${name} failed (${res.status})` };
  return data;
}

async function loadContext(db: any, projectId: string) {
  const { data: project } = await db.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (!project) return null;
  const { data: hub } = await db.from("asset_groups").select("*").eq("id", project.group_id).single();
  const { data: shared } = await db.from("asset_groups").select("id").eq("slug", "shared-library").maybeSingle();
  const hubIds = [hub.id, ...(shared && shared.id !== hub.id ? [shared.id] : [])];
  const [{ data: skills }, { data: library }, { data: files }, { data: analyses }] = await Promise.all([
    db.from("skills").select("id, slug, name, description, body, group_id").or(`group_id.is.null,group_id.eq.${hub.id}`).order("name"),
    db.from("assets").select("id, kind, name, role, tags, duration_seconds, meta, mime_type, group_id").in("group_id", hubIds).is("project_id", null).order("created_at"),
    db.from("assets").select("id, kind, name, role, tags, duration_seconds, meta, mime_type, inline_content, created_at").eq("project_id", project.id).order("created_at"),
    db.from("asset_analyses").select("asset_id, tool, summary, report").in("group_id", hubIds).eq("status", "complete"),
  ]);
  return { project, hub, skills: skills || [], library: library || [], files: files || [], analyses: analyses || [] };
}

function describe(a: any, analyses: any[], full: boolean) {
  const an = analyses.filter((x) => x.asset_id === a.id);
  const lines = [`- ${a.name} | id ${a.id} | ${a.kind}${a.role ? ` role=${a.role}` : ""}${a.tags?.length ? ` tags=${a.tags.join(",")}` : ""}${a.duration_seconds ? ` ${Number(a.duration_seconds).toFixed(1)}s` : ""} | url ${assetUrl(a.id)}`];
  const m = a.meta || {};
  if (m.peak_time != null) lines.push(`  sound: peak ${m.peak_time}s, trim ${m.trim_start ?? 0}-${m.trim_end ?? "end"}`);
  if (a.inline_content) lines.push(full ? `  content:\n${a.inline_content}` : `  content: ${clip(a.inline_content, 300)}`);
  let wordsShown = false;
  for (const x of an) {
    if (x.tool === "assembly-transcript" || x.tool === "gemini-words") {
      const words = x.report?.words;
      if (full && words?.length && !wordsShown) {
        wordsShown = true;
        lines.push(`  transcript (${x.tool}) full text: ${x.report?.text || x.summary || ""}`);
        lines.push(`  transcript words [w,start_s,end_s]: ${JSON.stringify(words.map((w: any) => [w.w ?? w.text, w.start, w.end]))}`);
        if (x.report?.cuts?.length) lines.push(`  suggested cuts: ${JSON.stringify(x.report.cuts)}`);
      } else if (!full || !wordsShown) lines.push(`  transcript: ${clip(x.report?.text || x.summary, 300)}`);
    } else lines.push(`  ${x.tool}: ${clip(x.summary, 350)}${x.report?.beats?.length ? ` beats: ${clip(x.report.beats.map((b: any) => `${b.start}-${b.end} ${b.label}`).join("; "), 400)}` : ""}`);
  }
  return lines.join("\n");
}

function latestCode(files: any[]) {
  return [...files].reverse().find((a) => a.kind === "code" && a.inline_content) || null;
}

const DRAFT_ROLE = "code-draft";
const isDraft = (a: any) => a.role === DRAFT_ROLE;
const draftParts = (files: any[]) => files.filter(isDraft).sort((a, b) => Number(a.meta?.part) - Number(b.meta?.part));
const textOf = (m: UIMessage) => (m.parts || []).map((p: any) => (p.type === "text" ? p.text : "")).join("").trim();

function systemPrompt(ctx: NonNullable<Awaited<ReturnType<typeof loadContext>>>) {
  const { project, hub, skills, library, files, analyses } = ctx;
  const chosen = skills.find((s: any) => s.id === project.skill_id) || skills.find((s: any) => s.slug === hub.slug);
  const code = latestCode(files);
  return `You are the in-house video editor and producer for the "${hub.title}" hub, working on the project "${project.name}". You build Remotion videos with the user through chat.

HOW WE WORK
1. Proposal first. Read the voiceover transcript and assets, then propose: angle, structure, which mascot/library moments, visuals per section, sound moments. Discuss. Do NOT write code until the user clearly approves ("approve", "go", "build it").
2. Build: write the full file with write_code_part, in order, in 2-5 parts of up to ~250 lines each (for example: 1 config header, imports, asset constants and timing data; 2 shared helper components; 3+ scenes; last the main composition). Each part continues exactly where the previous one ended, and the parts are joined with a newline into one file. Set final=true on the last part — that saves the finished version. Plan the whole file before part 1 so the parts fit together. Do not reduce quality or detail because the file is written in parts. Use write_code only for short files (under ~200 lines) or a full rewrite the user asks for.
3. Edits: ALWAYS use edit_code with small exact find/replace pairs. Change only what the user asked. Never rewrite the whole file for an edit. Call read_code first if unsure of exact text.
4. Keep replies short and concrete. After a build or edit, say in one or two lines what changed.
5. Never generate images without the user's explicit OK in this chat (they cost credits). Prefer library assets, cut-outs, stock (search_footage) and memes (search_memes) first. Never generate voice — the user supplies voiceovers.
6. This is a toolbox, not a template. No fixed lengths or structures; follow the user.

REMOTION RULES (renders fail otherwise)
- Single file, no local imports. Start with /* REMOTION_CONFIG { "fps": 30, "durationInFrames": N, "width": 1080, "height": 1920 } */ (1920x1080 for horizontal). Use plain numbers there.
- Export a default component; never name a component MyVideo.
- Use asset URLs exactly as listed below (copy ids exactly). Never Unsplash. Mute mascot clips: <OffthreadVideo src={...} muted />.
- Never use backdropFilter. Keep filter: blur small and rare.
- Readable code: clear constant names (VOICE, MASCOT_MOMENTS, ...), one idea per line.
- Time everything to the voiceover word timings (seconds × fps).

HUB STYLE GUIDE
${clip(hub.style_guide || "(none)", 4000)}

MAIN SKILL${chosen ? ` (${chosen.name})\n${clip(chosen.body, 9000)}` : ": none"}

OTHER SKILLS (call read_skill to load one): ${skills.filter((s: any) => s !== chosen).map((s: any) => `${s.slug} — ${clip(s.description, 120)}`).join(" | ")}

PROJECT NOTES
${clip(project.notes || "(none)", 2000)}
PLAN: ${clip(project.plan || {}, 2000)}

PROJECT FILES
${files.filter((a: any) => a.kind !== "code" && !isDraft(a)).map((a: any) => describe(a, analyses, true)).join("\n") || "(none)"}

HUB + SHARED LIBRARY
${library.map((a: any) => describe(a, analyses, false)).join("\n") || "(none)"}

CURRENT CODE: ${code ? `${code.name} (version ${code.meta?.version ?? "?"}, ${code.inline_content.split("\n").length} lines) — call read_code to see it.` : "none yet."}${draftBlock(files)}`;
}

function draftBlock(files: any[]) {
  const parts = draftParts(files);
  if (!parts.length) return "";
  const last = Number(parts[parts.length - 1].meta?.part);
  return `

BUILD IN PROGRESS: parts 1-${last} of a new build are already saved (below). If the user asks to continue the build, call write_code_part starting with part ${last + 1}, continuing exactly where part ${last} ends, and set final=true on the last part. Do not rewrite the saved parts.
${parts.map((p: any) => `--- part ${p.meta?.part} ---\n${p.inline_content}`).join("\n")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); }
  const projectId = String(body?.projectId || "");
  const incoming = body?.messages as UIMessage[];
  if (!/^[0-9a-f-]{36}$/i.test(projectId) || !Array.isArray(incoming) || !incoming.length) return json({ error: "projectId and messages are required." }, 400);
  // A resent message (same text right after itself, e.g. a retry) replaces the earlier copy.
  const messages: UIMessage[] = [];
  const dropped: string[] = [];
  for (const m of incoming) {
    const prev = messages[messages.length - 1];
    if (m.role === "user" && prev?.role === "user" && textOf(prev) === textOf(m)) {
      if (prev.id) dropped.push(prev.id);
      messages[messages.length - 1] = m;
    } else messages.push(m);
  }
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return json({ error: "AI is not configured." }, 500);

  const db = admin();
  const ctx = await loadContext(db, projectId);
  if (!ctx) return json({ error: "Project not found." }, 404);
  const { project, hub } = ctx;

  const saveVersion = async (code: string, summary: string) => {
    const ids = [...new Set(code.match(UUID) || [])].map((s) => s.toLowerCase());
    if (ids.length) {
      const { data } = await db.from("assets").select("id, storage_path, inline_content").in("id", ids);
      const ok = new Set((data || []).filter((a: any) => a.storage_path || a.inline_content).map((a: any) => a.id));
      const missing = ids.filter((i) => !ok.has(i));
      if (missing.length) return { error: `Not saved: these file ids don't exist: ${missing.join(", ")}. Copy ids exactly from the file list.` };
    }
    const { data: prev } = await db.from("assets").select("meta").eq("project_id", project.id).eq("kind", "code").order("created_at", { ascending: false }).limit(1);
    const version = (Number(prev?.[0]?.meta?.version) || 0) + 1;
    const { data, error } = await db.from("assets").insert({
      group_id: hub.id, project_id: project.id, kind: "code", role: "code", name: `editor-v${version}.tsx`, inline_content: code,
      mime_type: "text/plain", size_bytes: new TextEncoder().encode(code).byteLength, meta: { version, summary: summary.slice(0, 300), source: "editor" },
    }).select("id").single();
    if (error) return { error: `Could not save: ${error.message}` };
    return { saved: true, version, id: data.id, lines: code.split("\n").length, summary };
  };
  const current = async () => {
    const { data } = await db.from("assets").select("inline_content, meta").eq("project_id", project.id).eq("kind", "code").not("inline_content", "is", null).order("created_at", { ascending: false }).limit(1);
    return data?.[0]?.inline_content as string | undefined;
  };

  const tools = {
    read_code: tool({
      description: "Read the current video code with line numbers. Optional line range.",
      inputSchema: z.object({ from: z.number().nullable(), to: z.number().nullable() }),
      execute: async ({ from, to }) => {
        const code = await current();
        if (!code) return { error: "No code yet." };
        const lines = numbered(code).split("\n");
        return { total_lines: lines.length, code: lines.slice((from || 1) - 1, to || lines.length).join("\n") };
      },
    }),
    write_code: tool({
      description: "Save a complete new version of the video file. Use only for the first build or when the user asks for a full rewrite.",
      inputSchema: z.object({ code: z.string(), summary: z.string() }),
      execute: async ({ code, summary }) => saveVersion(code, summary),
    }),
    edit_code: tool({
      description: "Change only specific parts of the current code. Each find must match the current code exactly once (include enough surrounding text). All edits apply together.",
      inputSchema: z.object({ edits: z.array(z.object({ find: z.string(), replace: z.string() })), summary: z.string() }),
      execute: async ({ edits, summary }) => {
        let code = await current();
        if (!code) return { error: "No code yet — use write_code." };
        for (const [i, e] of edits.entries()) {
          const n = e.find ? code.split(e.find).length - 1 : 0;
          if (n !== 1) return { error: `Edit ${i + 1}: find text matched ${n} times (needs exactly 1). Nothing saved. Use read_code and include more context.` };
          code = code.replace(e.find, () => e.replace);
        }
        return saveVersion(code, summary);
      },
    }),
    read_skill: tool({
      description: "Load the full text of another skill by slug.",
      inputSchema: z.object({ slug: z.string() }),
      execute: async ({ slug }) => { const s = ctx.skills.find((x: any) => x.slug === slug); return s ? { name: s.name, body: s.body } : { error: "No such skill." }; },
    }),
    list_files: tool({
      description: "List the project's files again (fresh), including newly added ones and their analyses.",
      inputSchema: z.object({}),
      execute: async () => { const c = await loadContext(db, projectId); return { files: c!.files.filter((a: any) => a.kind !== "code").map((a: any) => describe(a, c!.analyses, true)).join("\n") }; },
    }),
    search_footage: tool({
      description: "Search Pexels stock footage or photos.",
      inputSchema: z.object({ q: z.string(), type: z.enum(["video", "photo"]), orientation: z.enum(["portrait", "landscape", "square"]) }),
      execute: async (i) => { const r = await callFn("footage-search", { ...i, per_page: 8 }); return r.error ? r : { results: (r.results || []).slice(0, 8) }; },
    }),
    search_memes: tool({
      description: "Search GIPHY memes/GIFs.",
      inputSchema: z.object({ q: z.string(), type: z.enum(["gifs", "stickers"]) }),
      execute: async (i) => { const r = await callFn("meme-search", { ...i, limit: 8 }); return r.error ? r : { results: (r.results || []).slice(0, 8) }; },
    }),
    save_from_url: tool({
      description: "Save a picked stock video/photo or meme into the project so it gets a permanent asset url.",
      inputSchema: z.object({ url: z.string(), kind: z.enum(["video", "image"]), name: z.string(), role: z.enum(["stock", "meme", "image", "clip"]) }),
      execute: async ({ url, kind, name, role }) => {
        const r = await callFn("agent-create", { slug: hub.slug, project: project.slug, kind, sourceUrl: url, name, role });
        return r.error ? r : { id: r.id, url: r.url };
      },
    }),
    generate_image: tool({
      description: "Generate an image (costs credits). Only after the user explicitly agreed in chat. For collage subjects, ask for an isolated subject on a plain white background; hubs with auto cut-outs then get a transparent '-cutout' version a little later (check list_files).",
      inputSchema: z.object({ prompt: z.string(), name: z.string() }),
      execute: async ({ prompt, name }) => {
        const r = await callFn("agent-create", { slug: hub.slug, project: project.slug, kind: "image", prompt, name, role: "image" });
        return r.error ? r : { id: r.id, url: r.url, status: "creating — ready in ~30-60s" };
      },
    }),
    update_project: tool({
      description: "Update the project's stage and/or notes (e.g. save the approved proposal).",
      inputSchema: z.object({ stage: z.enum(["idea", "script", "assets", "voice", "edit", "check", "render", "done"]).nullable(), notes: z.string().nullable() }),
      execute: async ({ stage, notes }) => {
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (stage) patch.stage = stage;
        if (notes != null) patch.notes = notes;
        const { error } = await db.from("projects").update(patch).eq("id", project.id);
        return error ? { error: error.message } : { ok: true };
      },
    }),
  };

  const recent = messages.slice(-KEEP_MESSAGES);
  const modelMessages = await convertToModelMessages(recent, { tools, ignoreIncompleteToolCalls: true });
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
  const provider = createOpenAI({ baseURL: GATEWAY, apiKey: key, headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: runIdFetch.fetch });

  // Progress of the tool input being written (e.g. the video code), sent to the page every few seconds.
  const progress = { tool: "", chars: 0, lines: 0 };
  // Drop tool-input deltas before the UI stream sees them: the UI stream re-parses the whole growing
  // tool input as JSON on every delta, which for a full video file blows the function's CPU limit.
  // The finished tool call still carries the complete input.
  const dropToolDeltas = () => new TransformStream<any, any>({
    transform(chunk, ctl) {
      if (chunk?.type === "tool-input-delta") {
        const d = String(chunk.delta ?? "");
        progress.chars += d.length;
        progress.lines += d.split("\\n").length - 1;
        return;
      }
      if (chunk?.type === "tool-input-start") Object.assign(progress, { tool: chunk.toolName, chars: 0, lines: 0 });
      if (chunk?.type === "tool-call") progress.tool = "";
      ctl.enqueue(chunk);
    },
  });

  // No abortSignal: once started, a build finishes and saves even if the page disconnects.
  const result = streamText({
    model: provider.responses(MODEL),
    system: systemPrompt(ctx),
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(50),
    experimental_transform: dropToolDeltas,
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
  });

  const toRows = (list: UIMessage[]) => {
    const base = Date.now() - list.length;
    return list.filter((m) => m.id).map((m, i) => ({ project_id: project.id, msg_id: m.id, role: m.role, ui_message: m, created_at: new Date(base + i).toISOString() }));
  };
  // Save the conversation so far up front, so a crash mid-build never loses the user's message.
  if (dropped.length) await db.from("editor_messages").delete().eq("project_id", project.id).in("msg_id", dropped);
  await db.from("editor_messages").upsert(toRows(messages), { onConflict: "project_id,msg_id" });

  let timer: number | undefined;
  const stream = createUIMessageStream({
    originalMessages: messages,
    generateId: () => crypto.randomUUID(),
    execute: ({ writer }) => {
      timer = setInterval(() => {
        if (progress.tool) writer.write({ type: "data-progress", data: { ...progress }, transient: true } as any);
      }, 3000);
      writer.merge(result.toUIMessageStream({
        sendReasoning: true,
        messageMetadata: ({ part }) => part.type === "finish" ? { usage: { input: part.totalUsage?.inputTokens ?? 0, output: part.totalUsage?.outputTokens ?? 0 } } : undefined,
        onError: (e: any) => {
          const status = e?.statusCode ?? e?.status;
          if (status === 402) return "AI credits are used up. Add credits in Settings → Plans & credits, then try again.";
          if (status === 429) return "The AI is busy right now. Wait a minute and try again.";
          if (status === 403) return `The AI request was refused: ${clip(e?.responseBody || e?.message, 200)}`;
          console.error("[editor-agent]", e);
          return `Something went wrong: ${clip(e?.message, 200)}`;
        },
      }));
    },
    onError: (e: any) => { console.error("[editor-agent] stream", e); return `Something went wrong: ${clip(e?.message, 200)}`; },
    onFinish: async ({ messages: all }) => {
      clearInterval(timer);
      const { error } = await db.from("editor_messages").upsert(toRows(all as UIMessage[]), { onConflict: "project_id,msg_id" });
      if (error) console.error("[editor-agent] save failed", error.message);
    },
  });

  const response = createUIMessageStreamResponse({
    stream,
    headers,
    keepAliveMs: 15000,
    // Keep reading a copy of the stream on the server so the run finishes and saves even if the page goes away.
    consumeSseStream: ({ stream: copy }) => {
      const done = copy.pipeTo(new WritableStream()).catch(() => {});
      (globalThis as any).EdgeRuntime?.waitUntil?.(done);
    },
  });
  return withLovableAiGatewayRunIdHeader(response, runIdFetch);
});
