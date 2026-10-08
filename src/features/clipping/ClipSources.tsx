import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Upload, Sparkles, FolderPlus, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { type AssetGroup, assetUrl, createProject, fmtTime, listProjects, listSkills, updateProject } from "@/features/hub/api";
import { type Clip, type Stage, findClips, listSources, resumeTranscript, uploadSource } from "./api";
import { trackProject } from "./track";

const MODELS = [
  ["openai/gpt-6-astra", "GPT-6 Astra (best)"], ["openai/gpt-6-sol", "GPT-6 Sol"], ["openai/gpt-6-luna", "GPT-6 Luna (cheap)"],
  ["google/gemini-3.1-pro-preview", "Gemini 3.1 Pro"], ["google/gemini-3.8-flash", "Gemini 3.8 Flash (cheap)"],
];

const status = (a: any) => !a ? <Badge variant="outline">not started</Badge>
  : a.status === "complete" ? <Badge variant="secondary">done</Badge>
  : a.status === "error" ? <Badge variant="destructive" title={a.error_message}>failed</Badge>
  : <Badge variant="outline"><Loader2 className="mr-1 h-3 w-3 animate-spin" />working</Badge>;

function SourceCard({ group, src, analyses }: { group: AssetGroup; src: any; analyses: any[] }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const playing = useRef<{ segs: Clip["segments"]; i: number } | null>(null);
  const [model, setModel] = useState(() => localStorage.getItem("clip-model") || MODELS[0][0]);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const runAudio = async (f: File | null) => {
    setBusy("Audio 0%");
    try {
      await prepareAudio(src.id, group.slug, f, (p) => setBusy(`Audio ${Math.round(p * 100)}%`));
      toast.success("Sound copy saved. Clips from this video can render now.");
      qc.invalidateQueries({ queryKey: ["sources", group.id] });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const { data: skills = [] } = useQuery({ queryKey: ["skills", group.id], queryFn: () => listSkills(group.id) });
  const { data: projects = [] } = useQuery({ queryKey: ["projects", group.id], queryFn: () => listProjects(group.id) });
  // Projects already made from a clip (same source + same first segment), newest first.
  const existing = (c: Clip) => projects.filter((p: any) => p.plan?.clip?.source_asset_id === src.id && p.plan.clip.segments?.[0]?.in === c.segments[0]?.in);
  const mine = analyses.filter((a) => a.asset_id === src.id);
  const tr = mine.find((a) => a.tool === "assembly-transcript");
  const fr = mine.find((a) => a.tool === "gemini-frames");
  const cf = mine.find((a) => a.tool === "clip-finder");
  const lastClips = mine.find((a) => a.tool === "clip-finder" && a.status === "complete");
  const clips: Clip[] = lastClips?.report?.clips || [];

  useEffect(() => { localStorage.setItem("clip-model", model); }, [model]);
  useEffect(() => { if (tr?.status === "running" && tr.report?.transcript_id) resumeTranscript(tr.id).then(() => qc.invalidateQueries({ queryKey: ["sources", group.id] })); }, [tr?.id, tr?.status, tr?.updated_at, analyses]);

  const play = (c: Clip) => {
    const v = video.current; if (!v) return;
    playing.current = { segs: c.segments, i: 0 };
    v.currentTime = c.segments[0].in; v.play();
  };
  const onTime = () => {
    const v = video.current, p = playing.current; if (!v || !p) return;
    if (v.currentTime >= p.segs[p.i].out) {
      p.i++;
      if (p.i >= p.segs.length) { v.pause(); playing.current = null; } else v.currentTime = p.segs[p.i].in;
    }
  };
  const make = async (c: Clip, go: boolean) => {
    const skill = skills.find((s) => s.slug === "clip-editing");
    const p = await createProject(group.id, c.title, skill?.id || null);
    await updateProject(p.id, {
      notes: `Hook: ${c.hook_text}\nWhy it works: ${c.why}\nFraming: ${c.layout_hint}`,
      plan: { title: c.title, duration_s: +c.segments.reduce((t, s) => t + s.out - s.in, 0).toFixed(1), clip: { source_asset_id: src.id, segments: c.segments, hook_text: c.hook_text, why: c.why, layout_hint: c.layout_hint } } as any,
    });
    setBusy("Tracking faces 0%");
    try {
      const plan = { title: c.title, clip: { source_asset_id: src.id, segments: c.segments, hook_text: c.hook_text, why: c.why, layout_hint: c.layout_hint } };
      const cam = await trackProject({ id: p.id, plan }, (x) => setBusy(`Tracking faces ${Math.round(x * 100)}%`));
      toast.success(`Faces tracked: ${Object.keys(cam.speakers).length} speakers matched, ${cam.keys.length} camera moves.`);
    } catch (e) { toast.error(`Face tracking failed: ${(e as Error).message}. You can retry from the editor.`); }
    setBusy(null);
    qc.invalidateQueries({ queryKey: ["projects", group.id] });
    if (go) navigate(`/groups/${group.slug}/p/${p.slug}/editor`);
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <video ref={video} src={assetUrl(src.id)} controls preload="metadata" onTimeUpdate={onTime} className="w-full rounded bg-muted" />
          <p className="mt-2 truncate text-sm font-medium">{src.name}</p>
          {busy?.startsWith("Tracking") && <p className="mt-1 text-xs text-primary">{busy} — keep this tab open</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{fmtTime(Number(src.duration_seconds) || 0)}</span>
            <span>· Transcript</span>{status(tr)}<span>· Faces & layout</span>{status(fr)}<span>· Clips</span>{status(cf)}
          </div>
          {[tr, fr, cf].filter((a) => a?.status === "error").map((a) => <p key={a.id} className="mt-1 text-xs text-destructive">{a.error_message}</p>)}
          {!(src.meta as any)?.audio_path && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border p-2 text-xs">
              <span className="flex-1 text-muted-foreground">{busy?.startsWith("Audio") ? `${busy} — keep this tab open` : "Needs a sound copy before clips can render."}</span>
              <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => audioRef.current?.click()}>Prepare audio (pick original file)</Button>
              <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => runAudio(null)}>From cloud (slower)</Button>
              <input ref={audioRef} type="file" hidden accept="video/*" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) runAudio(f); }} />
            </div>
          )}
          <div className="mt-3 space-y-2">
            <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} placeholder="Optional: what to look for, e.g. only money advice, funny moments with Sam, max 45s…" className="text-xs" />
            <div className="flex gap-2">
              <select value={model} onChange={(e) => setModel(e.target.value)} className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs">
                {MODELS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
              </select>
              <Button size="sm" disabled={tr?.status !== "complete" || cf?.status === "running" || !!busy} onClick={async () => {
                setBusy("find");
                try { await findClips(src.id, model, instructions); toast.success("Reading the whole video for clips…"); qc.invalidateQueries({ queryKey: ["sources", group.id] }); }
                catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
              }}><Sparkles className="mr-1 h-3.5 w-3.5" />{clips.length ? "Find again" : "Find clips"}</Button>
            </div>
            {tr?.status !== "complete" && <p className="text-xs text-muted-foreground">Clip finding unlocks when the transcript is done (long videos can take a few minutes).</p>}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{clips.length ? `${clips.length} clips` : "Clips"}</h3>
            {clips.length > 0 && <Button size="sm" variant="secondary" disabled={!!busy} onClick={async () => {
              if (!confirm(`Make ${clips.length} projects?`)) return;
              setBusy("all"); try { for (const c of clips) await make(c, false); toast.success(`${clips.length} projects made — see Projects`); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
            }}><FolderPlus className="mr-1 h-3.5 w-3.5" />Make all</Button>}
          </div>
          {!clips.length ? <p className="text-sm text-muted-foreground">No clips yet.</p> : (
            <div className="max-h-[34rem] space-y-2 overflow-auto pr-1">
              {clips.map((c, i) => {
                const len = c.segments.reduce((t, s) => t + s.out - s.in, 0);
                return (
                  <div key={i} className="rounded border border-border p-3">
                    <div className="flex items-start gap-2">
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-xs text-primary">{c.score}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-foreground/80">“{c.hook_text}”</p>
                        <p className="mt-1 text-xs text-muted-foreground">{c.why}</p>
                        <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
                          <span>{len.toFixed(0)}s</span>
                          {c.segments.map((s, k) => <span key={k} className="font-mono" title={s.purpose}>{fmtTime(s.in)}–{fmtTime(s.out)}</span>)}
                          <span>· {c.layout_hint}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => play(c)}><Play className="mr-1 h-3.5 w-3.5" />Play</Button>
                      {existing(c)[0] && <Button size="sm" onClick={() => navigate(`/groups/${group.slug}/p/${existing(c)[0].slug}/editor`)}><Pencil className="mr-1 h-3.5 w-3.5" />Open editor</Button>}
                      <Button size="sm" variant={existing(c)[0] ? "ghost" : "secondary"} disabled={!!busy} onClick={() => { if (existing(c)[0] && !confirm("This clip already has a project. Start a new one from scratch?")) return; make(c, true).catch((e) => toast.error(e.message)); }}><FolderPlus className="mr-1 h-3.5 w-3.5" />{existing(c)[0] ? "New project" : "Make project"}</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClipSources({ group }: { group: AssetGroup }) {
  const qc = useQueryClient();
  const ref = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const { data } = useQuery({
    queryKey: ["sources", group.id], queryFn: () => listSources(group.id),
    refetchInterval: (q) => (q.state.data?.analyses.some((a: any) => a.status === "running") ? 8000 : false),
  });
  const upload = async (file: File) => {
    try { await uploadSource(group, file, setStage); toast.success("Uploaded. Transcribing and reading snapshots…"); }
    catch (e) { toast.error((e as Error).message); }
    finally { setStage(null); qc.invalidateQueries({ queryKey: ["sources", group.id] }); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border p-4">
        <p className="flex-1 text-sm text-muted-foreground">Drop a long raw video (podcast, stream, talk — up to 5 GB). The original stays full quality; the AI reads the whole transcript at once and suggests clips.</p>
        <Button disabled={!!stage} onClick={() => ref.current?.click()}><Upload className="mr-1 h-4 w-4" />Upload source</Button>
        <input ref={ref} type="file" hidden accept="video/*" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
        {stage && <div className="w-full space-y-1"><Progress value={stage.p * 100} /><p className="text-xs text-muted-foreground">{stage.label} — keep this tab open.</p></div>}
      </div>
      {(data?.sources || []).map((s) => <SourceCard key={s.id} group={group} src={s} analyses={data!.analyses} />)}
      {data && !data.sources.length && <p className="text-sm text-muted-foreground">No source videos yet.</p>}
    </div>
  );
}
