import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clapperboard, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import HubHeader from "@/components/HubHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import AssetPanel from "@/features/hub/AssetPanel";
import { CopyRow, EditableText } from "@/features/hub/shared";
import {
  PARTS, STAGES, type PlanPart, type Project, deleteProject, getGroup, getProject, listAssets, listSkills, projectManifestUrl, updateProject,
} from "@/features/hub/api";

const HINTS: Record<string, string> = {
  hook: "0–3.4s · frame 0 fully composed, first word < 0.5s",
  setup: "just enough context",
  quiz: "pose the question, hold a beat",
  reveal: "2–4 steps, each on a spoken word",
  twist: "a second surprise",
  loop: "last frame ≈ frame 0, last line flows into the first",
};

function warnings(parts: PlanPart[]) {
  const w: string[] = [];
  const missing = PARTS.filter((p) => !parts.find((x) => x.part === p && (x.voice || x.on_screen)));
  if (missing.length) w.push(`Missing: ${missing.join(", ")}`);
  const hook = parts.find((x) => x.part === "hook");
  if (hook?.end != null && hook.end > 3.5) w.push(`Hook ends at ${hook.end}s — keep it under ~3.4s`);
  return w;
}

function PlanEditor({ project, onSave }: { project: Project; onSave: (plan: Project["plan"]) => void }) {
  const parts = project.plan?.parts || [];
  const get = (p: string): PlanPart => parts.find((x) => x.part === p) || { part: p };
  const set = (p: string, patch: Partial<PlanPart>) => {
    const next = PARTS.map((name) => (name === p ? { ...get(name), ...patch } : get(name))).filter((x) => x.part === p || x.voice || x.on_screen || x.start != null);
    onSave({ ...project.plan, parts: next });
  };
  const warn = warnings(parts);
  return (
    <div>
      {warn.length > 0 && <div className="mb-3 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><div>{warn.map((x) => <p key={x}>{x}</p>)}</div></div>}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {PARTS.map((name, i) => {
          const part = get(name);
          return (
            <div key={name} className="rounded-lg border border-border p-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium capitalize">{i + 1}. {name}</h3>
                <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                  <input type="number" step="0.1" min="0" defaultValue={part.start ?? ""} onBlur={(e) => e.target.value !== String(part.start ?? "") && set(name, { start: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-12 bg-transparent text-right outline-none" placeholder="0" />s–
                  <input type="number" step="0.1" min="0" defaultValue={part.end ?? ""} onBlur={(e) => e.target.value !== String(part.end ?? "") && set(name, { end: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-12 bg-transparent text-right outline-none" placeholder="0" />s
                </div>
              </div>
              <p className="mb-2 text-[11px] text-muted-foreground">{HINTS[name]}</p>
              <EditableText multiline value={part.voice || ""} onSave={(voice) => set(name, { voice })} placeholder="Voice line…" className="text-xs" />
              <EditableText multiline value={part.on_screen || ""} onSave={(on_screen) => set(name, { on_screen })} placeholder="On screen…" className="mt-2 text-xs" />
            </div>
          );
        })}
      </div>
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
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Story plan · six parts</h2>
          <PlanEditor project={project} onSave={(plan) => save({ plan })} />
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
