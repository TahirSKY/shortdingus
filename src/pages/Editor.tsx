import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowLeft, Bookmark, Clapperboard, FileText, Paperclip, Undo2, Scissors } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools, PromptInputButton } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import RemotionPreview from "@/components/RemotionPreview";
import { parseMultiFileCode } from "@/lib/code-parser";
import { detectConfig } from "@/lib/detect-config";
import { findMissingAssets, missingMessage } from "@/lib/check-asset-links";
import { supabase } from "@/integrations/supabase/client";
import { type AssetGroup, type Project, deleteAsset, getGroup, getProject, listAssets, uploadFile } from "@/features/hub/api";

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/editor-agent`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const MODELS = [
  ["openai/gpt-6-astra", "GPT-6 Astra (best)"],
  ["openai/gpt-6-sol", "GPT-6 Sol"],
  ["openai/gpt-6-luna", "GPT-6 Luna (cheap)"],
  ["openai/gpt-5.6-terra", "GPT-5.6 Terra"],
  ["openai/gpt-5.6-luna", "GPT-5.6 Luna (cheap)"],
  ["google/gemini-3.1-pro-preview", "Gemini 3.1 Pro"],
  ["google/gemini-3.8-flash", "Gemini 3.8 Flash (cheap)"],
];

async function loadMessages(projectId: string): Promise<UIMessage[]> {
  const { data, error } = await supabase.from("editor_messages" as any).select("ui_message").eq("project_id", projectId).order("created_at");
  if (error) throw error;
  return (data || []).map((r: any) => r.ui_message as UIMessage);
}

type Build = { id: string; status: "running" | "done" | "failed"; part: number; lines: number; error: string | null; version: number | null; updated_at: string };
const STALE_MS = 4 * 60 * 1000;

async function latestBuild(projectId: string): Promise<Build | null> {
  const { data, error } = await supabase.from("editor_builds" as any).select("id, status, part, lines, error, version, updated_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1);
  if (error) throw error;
  return ((data as any[]) || [])[0] || null;
}

function BuildCard({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [resuming, setResuming] = useState(false);
  const { data: build } = useQuery({
    queryKey: ["editor-build", projectId],
    queryFn: () => latestBuild(projectId),
    refetchInterval: (q) => (q.state.data?.status === "running" ? 4000 : false),
  });
  const prevStatus = useRef<string | undefined>();
  useEffect(() => {
    if (prevStatus.current === "running" && build?.status === "done") { onDone(); toast.success(`Version ${build.version} is ready.`); }
    prevStatus.current = build?.status;
  }, [build?.status, build?.version, onDone]);
  if (!build) return null;
  const stale = build.status === "running" && Date.now() - new Date(build.updated_at).getTime() > STALE_MS;
  const showContinue = build.status === "failed" || stale;
  if (build.status === "done" && !build.error) return null;
  const resume = async () => {
    setResuming(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/editor-build`, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` }, body: JSON.stringify({ buildId: build.id, resume: true }) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || `Couldn't continue (${res.status}).`);
      qc.invalidateQueries({ queryKey: ["editor-build", projectId] });
    } catch (e) { toast.error((e as Error).message); } finally { setResuming(false); }
  };
  return (
    <div className="mx-3 mb-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
      {build.status === "running" && !stale && <Shimmer>{build.part ? `Building your video… part ${build.part} written, about ${build.lines} lines so far` : "Building your video… writing part 1"}</Shimmer>}
      {stale && <p>The build hasn't moved for a few minutes ({build.lines} lines saved).</p>}
      {build.status === "failed" && <p className="text-destructive">{build.error || "The build stopped."} {build.lines ? `(${build.lines} lines saved)` : ""}</p>}
      {build.status === "done" && build.error && <p className="text-destructive">Version {build.version}: {build.error}</p>}
      {showContinue && <Button size="sm" variant="secondary" className="mt-2" disabled={resuming} onClick={resume}>{resuming ? "Continuing…" : "Continue the build"}</Button>}
    </div>
  );
}

function ChatPane({ group, project, initial, onCodeChanged }: { group: AssetGroup; project: Project; initial: UIMessage[]; onCodeChanged: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ tool: string; chars: number } | null>(null);
  const lastEvent = useRef(Date.now());
  const [model, setModel] = useState(() => localStorage.getItem("editor-model") || MODELS[0][0]);
  const modelRef = useRef(model);
  useEffect(() => { modelRef.current = model; localStorage.setItem("editor-model", model); }, [model]);
  const transport = useMemo(() => new DefaultChatTransport({
    api: ENDPOINT,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    body: () => ({ projectId: project.id, model: modelRef.current }),
  }), [project.id]);
  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: project.id,
    messages: initial,
    transport,
    onData: (part: any) => { lastEvent.current = Date.now(); if (part?.type === "data-progress") setProgress(part.data); },
    onError: (e) => toast.error(e.message || "The editor agent hit a problem."),
    onFinish: () => { setProgress(null); onCodeChanged(); qc.invalidateQueries({ queryKey: ["editor-build", project.id] }); },
  });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => { lastEvent.current = Date.now(); }, [messages]);
  useEffect(() => { if (!busy) setProgress(null); }, [busy]);

  // If the connection goes quiet, stop listening and reload the saved chat — the server keeps working and saves the reply.
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(async () => {
      if (Date.now() - lastEvent.current < 60000) return;
      clearInterval(t);
      stop();
      toast("Lost the live connection — reloading the chat. The editor keeps working in the background.");
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 10000));
        const saved = await loadMessages(project.id).catch(() => null);
        if (saved?.length && saved[saved.length - 1].role === "assistant") { setMessages(saved); onCodeChanged(); qc.invalidateQueries({ queryKey: ["editor-build", project.id] }); return; }
      }
    }, 5000);
    return () => clearInterval(t);
  }, [busy, stop, setMessages, project.id, onCodeChanged, qc]);

  const toolDone = messages.flatMap((m) => m.parts).filter((p: any) => (p.type === "tool-build_video" || p.type === "tool-edit_code" || p.type === "tool-write_code") && p.state === "output-available").length;
  useEffect(() => { if (toolDone) { onCodeChanged(); qc.invalidateQueries({ queryKey: ["editor-build", project.id] }); } }, [toolDone, onCodeChanged, qc, project.id]);

  const usage = messages.reduce((acc, m: any) => ({ input: acc.input + (m.metadata?.usage?.input || 0), output: acc.output + (m.metadata?.usage?.output || 0) }), { input: 0, output: 0 });

  const upload = async (files: FileList) => {
    setUploading(true);
    const names: string[] = [];
    try {
      for (const f of Array.from(files)) {
        await uploadFile(group, f, project.id, f.type.startsWith("audio/") ? "voice" : null);
        names.push(f.name);
      }
      toast.success("Added — descriptions and transcripts start automatically.");
      sendMessage({ text: `I added: ${names.join(", ")}. They may still be analysing; check list_files.` });
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <ConversationEmptyState icon={<Scissors className="h-8 w-8" />} title="Your editor is ready" description="Add your voiceover and assets, then tell me the idea. I'll propose a plan before building anything." />
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : "bg-transparent"}>
                {m.parts.map((p: any, i) => {
                  if (p.type === "text") return m.role === "user" ? <p key={i} className="whitespace-pre-wrap">{p.text}</p> : <MessageResponse key={i}>{p.text}</MessageResponse>;
                  if (p.type === "reasoning" && p.text) return <p key={i} className="text-xs italic text-muted-foreground">{p.text.slice(0, 400)}</p>;
                  if (p.type?.startsWith("tool-")) {
                    const changed = (p.type === "tool-write_code" || p.type === "tool-edit_code") && p.output?.saved;
                    return (
                      <div key={i} className="space-y-1">
                        {changed && <p className="rounded border border-border px-2 py-1 text-xs">Version {p.output.version}: {p.output.summary}</p>}
                        <Tool defaultOpen={false}>
                          <ToolHeader type={p.type} state={p.state} />
                          <ToolContent>
                            <ToolInput input={p.input} />
                            <ToolOutput output={p.output} errorText={p.errorText} />
                          </ToolContent>
                        </Tool>
                      </div>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && <Shimmer>Thinking…</Shimmer>}
          {busy && progress && <Shimmer>{progress.tool === "build_video" ? `Writing the build plan… ${Math.round(progress.chars / 100) / 10}k characters` : `Writing ${progress.tool.replace(/_/g, " ")}… ${Math.round(progress.chars / 100) / 10}k characters`}</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <BuildCard projectId={project.id} onDone={onCodeChanged} />
      <div className="border-t border-border p-3">
        <PromptInput onSubmit={(msg) => { const t = (msg.text || "").trim(); if (!t || busy) return; sendMessage({ text: t }); setText(""); }}>
          <PromptInputTextarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Tell the editor what you want…" />
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputButton disabled={uploading} onClick={() => fileRef.current?.click()}><Paperclip className="h-4 w-4" />{uploading ? "Uploading…" : "Add files"}</PromptInputButton>
        <PromptInputButton disabled={busy} onClick={() => {
          const name = window.prompt("Name this style (e.g. Taped evidence board)");
          if (!name?.trim()) return;
          const note = window.prompt("What do you like about it? (optional)") || "";
          const shared = window.confirm("Share this style with every hub? (Cancel = this hub only)");
          sendMessage({ text: `Save the current video as a style reference named "${name.trim()}"${shared ? ", shared with every hub" : ""}.${note.trim() ? ` What I like: ${note.trim()}` : ""}` });
        }}><Bookmark className="h-4 w-4" />Save style</PromptInputButton>
        <PromptInputButton disabled={busy} onClick={() => {
          const extra = window.prompt("Anything to add for the script? Jokes, context, angle (optional)");
          if (extra === null) return;
          sendMessage({ text: `Create the script now. Use the hub skill, the full source video analysis (timeline + reaction moments), the transcript, any reference edit-style reports and my project notes.${extra.trim() ? ` My extra notes/jokes: ${extra.trim()}` : ""} Pick the best reaction moments (spoken and silent), write each pop-in with its source time, then a clean numbered voiceover read. Save it with save_script and show it to me.` });
        }}><FileText className="h-4 w-4" />Create script</PromptInputButton>
              <select aria-label="AI model" title="Which AI writes and edits this video" value={model} disabled={busy} onChange={(e) => setModel(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground">
                {MODELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
              <span className="text-xs text-muted-foreground">{usage.input ? `AI used: ${Math.round(usage.input / 1000)}k read · ${Math.round(usage.output / 1000)}k written` : ""}</span>
            </PromptInputTools>
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !text.trim()} />
          </PromptInputFooter>
        </PromptInput>
        <input ref={fileRef} type="file" hidden multiple accept="audio/*,video/*,image/*" onChange={(e) => e.target.files && upload(e.target.files)} />
      </div>
    </div>
  );
}

export default function Editor() {
  const { slug = "", project: pslug = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"chat" | "preview">("chat");
  const { data: group } = useQuery({ queryKey: ["group", slug], queryFn: () => getGroup(slug) });
  const { data: project } = useQuery({ queryKey: ["project", group?.id, pslug], enabled: !!group, queryFn: () => getProject(group!.id, pslug) });
  const { data: initial, error: loadError } = useQuery({ queryKey: ["editor-messages", project?.id], enabled: !!project, queryFn: () => loadMessages(project!.id), staleTime: Infinity, refetchOnWindowFocus: false });
  const { data: codes = [] } = useQuery({
    queryKey: ["editor-code", project?.id], enabled: !!project && !!group,
    queryFn: async () => (await listAssets(group!.id, project!.id)).assets.filter((a) => a.kind === "code" && a.inline_content),
  });
  const latest = codes[codes.length - 1];
  const code = latest?.inline_content || "";
  const parsed = useMemo(() => parseMultiFileCode(code), [code]);
  const config = useMemo(() => detectConfig(code), [code]);
  const refreshCode = useMemo(() => () => qc.invalidateQueries({ queryKey: ["editor-code", project?.id] }), [qc, project?.id]);

  const undo = async () => {
    if (!latest || codes.length < 2 || latest.meta?.source !== "editor") return;
    try { await deleteAsset(latest); toast.success("Went back to the previous version."); refreshCode(); } catch (e) { toast.error((e as Error).message); }
  };
  const render = async () => {
    if (!code) return;
    const missing = await findMissingAssets(code);
    if (missing.length) return toast.error(missingMessage(missing), { duration: 10000 });
    sessionStorage.setItem("playground-code", code);
    navigate("/playground");
  };

  if (!group || !project) return <div className="studio-theme min-h-screen bg-background" />;
  return (
    <div className="studio-theme flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Link to={`/groups/${group.slug}/p/${project.slug}`} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="flex-1 truncate text-sm font-semibold">{project.name} <span className="font-normal text-muted-foreground">· Editor</span></h1>
        <div className="flex gap-1 md:hidden">
          <Button size="sm" variant={tab === "chat" ? "secondary" : "ghost"} onClick={() => setTab("chat")}>Chat</Button>
          <Button size="sm" variant={tab === "preview" ? "secondary" : "ghost"} onClick={() => setTab("preview")}>Preview</Button>
        </div>
        <Button size="sm" variant="ghost" disabled={codes.length < 2 || latest?.meta?.source !== "editor"} onClick={undo}><Undo2 className="mr-1 h-3.5 w-3.5" />Undo</Button>
        <Button size="sm" disabled={!code} onClick={render}><Clapperboard className="mr-1 h-3.5 w-3.5" />Render</Button>
      </header>
      <div className="flex min-h-0 flex-1">
        <section className={`${tab === "chat" ? "flex" : "hidden"} min-h-0 w-full flex-col md:flex md:w-[44%] md:border-r md:border-border`}>
          {loadError ? <p className="p-4 text-sm text-destructive">Couldn't load the chat: {(loadError as Error).message}</p>
            : initial ? <ChatPane key={project.id} group={group} project={project} initial={initial} onCodeChanged={refreshCode} />
            : <p className="p-4 text-sm text-muted-foreground">Loading chat…</p>}
        </section>
        <section className={`${tab === "preview" ? "flex" : "hidden"} min-h-0 flex-1 flex-col md:flex`}>
          {code ? (
            <>
              <p className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">{latest?.name}{latest?.meta?.summary ? ` — ${String(latest.meta.summary)}` : ""}</p>
              <div className="min-h-0 flex-1"><RemotionPreview parsedFiles={parsed} detectedConfig={config} error={null} /></div>
            </>
          ) : <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">The preview appears here once the editor builds your video.</div>}
        </section>
      </div>
    </div>
  );
}
