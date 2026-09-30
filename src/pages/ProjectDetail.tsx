import { useRef, useState } from "react";
import { findMissingAssets, missingMessage } from "@/lib/check-asset-links";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clapperboard, Trash2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import HubHeader from "@/components/HubHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import AssetPanel, { AnalysisView } from "@/features/hub/AssetPanel";
import { CopyRow, EditableText } from "@/features/hub/shared";
import {
  STAGES, type AssetGroup, type Project, assetUrl, deleteProject, getGroup, getProject, listAssets, listSkills, projectManifestUrl, updateProject, uploadFile,
} from "@/features/hub/api";

function VoiceoverPanel({ group, projectId }: { group: AssetGroup; projectId: string }) {
  const qc = useQueryClient();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ["assets", group.id, projectId],
    queryFn: () => listAssets(group.id, projectId),
    refetchInterval: (q) => (q.state.data?.analyses.some((a) => a.status === "running" || a.status === "pending") ? 5000 : false),
  });
  const voices = (data?.assets || []).filter((a) => a.role === "voice" && (a.kind === "audio" || a.kind === "video"));
  const upload = async (files: FileList) => {
    setBusy(true);
    try { for (const f of Array.from(files)) await uploadFile(group, f, projectId, "voice"); toast.success("Uploaded — transcribing now"); qc.invalidateQueries({ queryKey: ["assets", group.id, projectId] }); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-xs text-muted-foreground">Upload your voiceover. It's transcribed automatically with word-by-word timing that you and your agent can use.</p>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => ref.current?.click()}><Mic className="mr-1 h-3.5 w-3.5" /> {busy ? "Uploading…" : "Upload voiceover"}</Button>
        <input ref={ref} type="file" hidden multiple accept="audio/*,video/*" onChange={(e) => e.target.files && upload(e.target.files)} />
      </div>
      {voices.length === 0 ? <p className="text-sm text-muted-foreground">No voiceover yet.</p> : voices.map((v) => {
        const tr = (data?.analyses || []).filter((x) => x.asset_id === v.id && (x.tool === "assembly-transcript" || x.tool === "gemini-words"));
        return (
          <div key={v.id} className="rounded border border-border p-3">
            <div className="flex flex-wrap items-center gap-3"><span className="text-sm">{v.name}</span>
              {v.kind === "audio" ? <audio src={assetUrl(v.id)} controls preload="none" className="h-8" /> : <video src={assetUrl(v.id)} controls preload="none" className="h-24 rounded" />}
            </div>
            <div className="mt-2 space-y-2">{tr.length ? tr.map((x) => <AnalysisView key={x.id} a={x} defaultOpen />) : <p className="text-xs text-muted-foreground">No transcript yet — use the transcribe button in Project files.</p>}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function ProjectDetail() {
  const { slug = "", project: pslug = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: group } = useQuery({ queryKey: ["group", slug], queryFn: () => getGroup(slug) });
  const { data: project, isLoading } = useQuery({ queryKey: ["project", group?.id, pslug], enabled: !!group, queryFn: () => getProject(group!.id, pslug), refetchInterval: 15000 });
  const { data: skills = [] } = useQuery({ queryKey: ["skills", group?.id], enabled: !!group, queryFn: () => listSkills(group!.id) });

  const save = async (patch: Partial<Project>) => {
    if (!project) return;
    try { await updateProject(project.id, patch); qc.invalidateQueries({ queryKey: ["project", group?.id, pslug] }); qc.invalidateQueries({ queryKey: ["projects", group?.id] }); } catch (e) { toast.error((e as Error).message); }
  };

  const openInPlayground = async () => {
    if (!group || !project) return;
    const { assets } = await listAssets(group.id, project.id);
    const code = [...assets].reverse().find((a) => a.kind === "code" && a.inline_content);
    if (!code) return toast.error("No video code in this project yet. Ask the agent to save its Remotion code here (role: code).");
    const missing = await findMissingAssets(code.inline_content!);
    if (missing.length) toast.warning(missingMessage(missing), { duration: 10000 });
    sessionStorage.setItem("playground-code", code.inline_content!);
    navigate("/playground");
  };

  if (isLoading || !group) return <div className="studio-theme min-h-screen bg-background" />;
  if (!project) return (
    <div className="studio-theme min-h-screen bg-background text-foreground"><HubHeader />
      <p className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">No project “{pslug}”. <Link to={`/groups/${slug}`} className="underline">Back to {group.title}</Link></p>
    </div>
  );

  return (
    <div className="studio-theme min-h-screen bg-background pb-20 text-foreground md:pb-0">
      <HubHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link to={`/groups/${group.slug}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> {group.title}</Link>
        <EditableText value={project.name} onSave={(name) => name.trim() && save({ name: name.trim() })} className="mt-2 text-2xl font-semibold" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select value={project.stage} onValueChange={(stage) => save({ stage })}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={project.skill_id || "none"} onValueChange={(v) => save({ skill_id: v === "none" ? null : v })}>
            <SelectTrigger className="h-8 w-60"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">Agent chooses the skill</SelectItem>{skills.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex-1" />
          <Button size="sm" onClick={openInPlayground}><Clapperboard className="mr-1 h-3.5 w-3.5" /> Preview & render</Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => {
            if (!confirm(`Delete project "${project.name}" and its files?`)) return;
            await deleteProject(project); qc.invalidateQueries({ queryKey: ["projects", group.id] }); navigate(`/groups/${group.slug}`);
          }}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
        <EditableText multiline value={project.notes} onSave={(notes) => save({ notes })} placeholder="The idea, angle, anything the agent should know about this video…" className="mt-3" />

        <section className="mt-10">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Voiceover</h2>
          <VoiceoverPanel group={group} projectId={project.id} />
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Agent link</h2>
          <div className="space-y-3 rounded-lg border border-border p-4">
            <CopyRow label="Give this to your AI agent — it gets the skills, style, library and this project's files" value={projectManifestUrl(group.slug, project.slug)} />
            <p className="text-xs text-muted-foreground">Say: “Read this link and follow its read_first steps. My write token is …”. It saves files here with <code className="font-mono">project={project.slug}</code>.</p>
          </div>
        </section>

        <section className="mt-10"><AssetPanel group={group} projectId={project.id} title="Project files" /></section>
      </main>
      <MobileBottomNav />
    </div>
  );
}
