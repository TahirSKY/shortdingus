import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, stepCountIs, streamText, tool, type UIMessage } from "npm:ai@7.0.126";
import { z } from "npm:zod@3.25.76";
import { admin, cors, json } from "../_shared/hub.ts";
import { clip, editorModel, pickModel, knowledge, latestCode, loadContext, projectFiles, saveVersion, type EditorContext } from "../_shared/editor-context.ts";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "../_shared/run-id.ts";

const FN = () => `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
const KEEP_MESSAGES = 30;
const headers = { ...cors, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id" };

const numbered = (code: string) => code.split("\n").map((l, i) => `${String(i + 1).padStart(4)}| ${l}`).join("\n");
const textOf = (m: UIMessage) => (m.parts || []).map((p: any) => (p.type === "text" ? p.text : "")).join("").trim();

async function callFn(name: string, body: Record<string, unknown>) {
  const res = await fetch(`${FN()}/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: Deno.env.get("HUB_WRITE_TOKEN"), ...body }) });
  const text = await res.text();
  let data: any; try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; }
  if (!res.ok) return { error: data?.error || `${name} failed (${res.status})` };
  return data;
}

function buildStatus(ctx: EditorContext) {
  const b = ctx.build;
  if (!b) return "";
  if (b.status === "running") return `\nBUILD IN PROGRESS: the background builder is writing the video (part ${b.part + 1}, ${b.lines} lines so far). Do not start another build; tell the user it's still building and the preview appears when it's done.`;
  if (b.status === "failed") return `\nLAST BUILD STOPPED after ${b.part} part(s): ${b.error}. The user can press Continue in the build card, or you can call build_video again.`;
  if (b.error) return `\nLAST BUILD NOTE: ${b.error} Fix with edit_code.`;
  return "";
}

function systemPrompt(ctx: EditorContext) {
  const code = latestCode(ctx.files);
  return `You are the in-house video editor and producer for the "${ctx.hub.title}" hub, working on the project "${ctx.project.name}". You build high-quality, competitive Remotion videos with the user through chat.

HOW WE WORK
1. Proposal first. Read the voiceover transcript and assets, then propose: angle, structure, which mascot/library moments, visuals per section, sound moments. Discuss. Do NOT build until the user clearly approves ("approve", "go", "build it").
2. Build: call build_video once with a detailed brief. A background builder (same model, same knowledge, and it sees this conversation) writes the full file in parts and saves it; the preview appears when it's done, usually in a few minutes. The brief is the builder's spec, so make it complete: every section with start/end seconds from the word timings, which exact asset ids go where, mascot moments, captions style, motion ideas, sound effects on exact words, colors and type. Then tell the user in one line that the build is running.
3. Edits: ALWAYS use edit_code with small exact find/replace pairs. Change only what the user asked. Call read_code first if unsure of exact text. For a full rewrite the user asks for, use build_video again.
4. Keep replies short and concrete. After an edit, say in one or two lines what changed.
5. Never generate images without the user's explicit OK in this chat (they cost credits). Prefer library assets, cut-outs, stock (search_footage) and memes (search_memes) first. Never generate voice — the user supplies voiceovers.
6. This is a toolbox, not a template. No fixed lengths or structures; follow the user.

${knowledge(ctx)}

CURRENT CODE: ${code ? `${code.name} (version ${code.meta?.version ?? "?"}, ${code.inline_content.split("\n").length} lines) — call read_code to see it.` : "none yet."}${buildStatus(ctx)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); }
  const projectId = String(body?.projectId || "");
  const modelId = pickModel(body?.model);
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
    build_video: tool({
      description: "Start the background build of the complete video file from a detailed brief. Returns right away; the finished version is saved automatically in a few minutes.",
      inputSchema: z.object({ brief: z.string().min(200), summary: z.string() }),
      execute: async ({ brief, summary }) => {
        const { data: running } = await db.from("editor_builds").select("id, updated_at").eq("project_id", project.id).eq("status", "running").limit(1);
        if (running?.length && Date.now() - new Date(running[0].updated_at).getTime() < 4 * 60 * 1000) return { error: "A build is already running for this project. Wait for it to finish." };
        const { data, error } = await db.from("editor_builds").insert({ project_id: project.id, model: modelId, brief, summary: summary.slice(0, 300) }).select("id").single();
        if (error) return { error: `Could not start the build: ${error.message}` };
        const res = await fetch(`${FN()}/editor-build`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ buildId: data.id, expect: 0 }) });
        if (!res.ok) return { error: `Could not start the build (${res.status}).` };
        return { started: true, buildId: data.id, note: "Building in the background; the preview updates when it's done." };
      },
    }),
    edit_code: tool({
      description: "Change only specific parts of the current code. Each find must match the current code exactly once (include enough surrounding text). All edits apply together.",
      inputSchema: z.object({ edits: z.array(z.object({ find: z.string(), replace: z.string() })), summary: z.string() }),
      execute: async ({ edits, summary }) => {
        let code = await current();
        if (!code) return { error: "No code yet — use build_video." };
        for (const [i, e] of edits.entries()) {
          const n = e.find ? code.split(e.find).length - 1 : 0;
          if (n !== 1) return { error: `Edit ${i + 1}: find text matched ${n} times (needs exactly 1). Nothing saved. Use read_code and include more context.` };
          code = code.replace(e.find, () => e.replace);
        }
        return saveVersion(db, ctx, code, summary);
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
      execute: async () => { const c = await loadContext(db, projectId); return { files: projectFiles(c!) }; },
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
    save_style_reference: tool({
      description: "Save the current video's look as a reusable style reference. First read_code, then write a style card (markdown): fonts, colors, caption style, image treatment (e.g. taped photos, paper, shadows), backgrounds/textures, transitions and motion feel, pacing habits, sound habits, plus the key code techniques that create the look. Describe style, not this video's story or timings.",
      inputSchema: z.object({ name: z.string(), card: z.string(), summary: z.string(), user_note: z.string().nullable(), shared: z.boolean() }),
      execute: async ({ name, card, summary, user_note, shared }) => {
        const { data: code } = await db.from("assets").select("id").eq("project_id", project.id).eq("kind", "code").order("created_at", { ascending: false }).limit(1);
        let groupId = hub.id;
        if (shared) { const { data: s } = await db.from("asset_groups").select("id").eq("slug", "shared-library").maybeSingle(); if (s) groupId = s.id; }
        const { data, error } = await db.from("assets").insert({
          group_id: groupId, project_id: null, kind: "text", role: "style-reference", tags: ["style-reference"], name, inline_content: card,
          mime_type: "text/markdown", size_bytes: new TextEncoder().encode(card).byteLength,
          meta: { summary: summary.slice(0, 300), user_note, source_code_asset_id: code?.[0]?.id ?? null, source_project_id: project.id },
        }).select("id").single();
        return error ? { error: error.message } : { saved: true, id: data.id, where: shared ? "shared library (all hubs)" : `${hub.title} hub` };
      },
    }),
    read_style_reference: tool({
      description: "Load a saved style reference: its style card plus the source video's code, to learn techniques. Adapt to the new video; never copy structure, timings or text.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        const { data: ref } = await db.from("assets").select("name, inline_content, meta").eq("id", id).eq("role", "style-reference").maybeSingle();
        if (!ref) return { error: "No such style reference." };
        let source = "";
        if (ref.meta?.source_code_asset_id) { const { data: c } = await db.from("assets").select("inline_content").eq("id", ref.meta.source_code_asset_id).maybeSingle(); source = c?.inline_content || ""; }
        return { name: ref.name, card: ref.inline_content, user_note: ref.meta?.user_note, source_code: clip(source, 30000) };
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
  // Reasoning saved from one model can't be replayed to another; drop it when the chosen model differs.
  if (!modelId.startsWith("openai/")) for (const m of modelMessages as any[]) if (Array.isArray(m.content)) m.content = m.content.filter((c: any) => c.type !== "reasoning");
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
  const { model, providerOptions } = editorModel(modelId, key, `chat-${project.id}`, runIdFetch.fetch);

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
    model,
    system: systemPrompt(ctx),
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(50),
    experimental_transform: dropToolDeltas,
    providerOptions,
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
