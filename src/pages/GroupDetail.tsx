import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Trash2, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import HubHeader from "@/components/HubHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import AssetPanel from "@/features/hub/AssetPanel";
import { CopyRow, EditableText, copy } from "@/features/hub/shared";
import {
  type AssetGroup, type Skill, createProject, deleteGroup, deleteSkill, getGroup, ingestUrl, listProjects, listSkills,
  projectManifestUrl, relTime, saveSkill, updateGroup,
} from "@/features/hub/api";

function SkillsTab({ group }: { group: AssetGroup }) {
  const qc = useQueryClient();
  const { data: skills = [] } = useQuery({ queryKey: ["skills", group.id], queryFn: () => listSkills(group.id) });
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Skill> | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["skills", group.id] });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Instructions agents follow. Shared skills work in every hub; add your own for this niche.</p>
        <Button size="sm" onClick={() => setEdit({ name: "", description: "", body: "" })}><Plus className="mr-1 h-3.5 w-3.5" /> New skill</Button>
      </div>
      {edit && (
        <form className="mb-6 space-y-2 rounded-lg border border-border p-4" onSubmit={async (e) => {
          e.preventDefault();
          try { await saveSkill(edit as any, group.id); setEdit(null); refresh(); toast.success("Skill saved"); } catch (err) { toast.error((err as Error).message); }
        }}>
          <Input value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Skill name, e.g. Horror pacing" maxLength={120} disabled={!!edit.id} />
          <Input value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="One line: when should an agent use this?" maxLength={1000} />
          <Textarea value={edit.body || ""} onChange={(e) => setEdit({ ...edit, body: e.target.value })} rows={14} placeholder="Instructions (markdown). Paste a SKILL.md here." className="font-mono text-xs" />
          <input type="file" accept=".md,.txt,text/*" className="text-xs" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setEdit({ ...edit, body: await f.text(), name: edit.name || f.name.replace(/\.(md|txt)$/, "") }); }} />
          <div className="flex gap-2"><Button type="submit" size="sm" disabled={!edit.name?.trim() || !edit.body?.trim()}>Save</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div>
        </form>
      )}
      <div className="divide-y divide-border rounded-lg border border-border">
        {skills.map((s) => (
          <div key={s.id} className="p-4">
            <div className="flex items-start gap-2">
              <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === s.id ? null : s.id)}>
                <div className="flex flex-wrap items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-medium">{s.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{s.group_id ? "this hub" : "shared"}</Badge>
                  <code className="font-mono text-xs text-muted-foreground">{s.slug}</code></div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
              </button>
              {s.group_id && <>
                <Button size="sm" variant="ghost" onClick={() => setEdit(s)}>Edit</Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={async () => { if (confirm(`Delete skill ${s.name}?`)) { await deleteSkill(s.id); refresh(); } }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </>}
            </div>
            {open === s.id && <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded bg-muted p-3 font-mono text-xs">{s.body}</pre>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectsTab({ group }: { group: AssetGroup }) {
  const navigate = useNavigate();
  const { data: projects = [] } = useQuery({ queryKey: ["projects", group.id], queryFn: () => listProjects(group.id) });
  const { data: skills = [] } = useQuery({ queryKey: ["skills", group.id], queryFn: () => listSkills(group.id) });
  const [name, setName] = useState("");
  const [skill, setSkill] = useState("none");
  const makers = skills.filter((s) => /^make-|edit-raw/.test(s.slug) || s.group_id);
  const skillName = (id: string | null) => skills.find((s) => s.id === id)?.name;

  return (
    <div>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        try { const p = await createProject(group.id, name, skill === "none" ? null : skill); navigate(`/groups/${group.slug}/p/${p.slug}`); } catch (err) { toast.error((err as Error).message); }
      }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New video, e.g. The door that shouldn't open" maxLength={120} />
        <Select value={skill} onValueChange={setSkill}>
          <SelectTrigger className="sm:w-64"><SelectValue placeholder="Skill to follow" /></SelectTrigger>
          <SelectContent><SelectItem value="none">Let the agent choose</SelectItem>{makers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button type="submit" disabled={!name.trim()}>Create project</Button>
      </form>
      {projects.length === 0 ? <p className="mt-8 text-sm text-muted-foreground">No projects yet. Each project is one video, using this hub's skills, library and style.</p> : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} to={`/groups/${group.slug}/p/${p.slug}`} className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/30">
              <div className="flex items-start justify-between gap-2"><h3 className="font-medium">{p.name}</h3><span className="shrink-0 text-xs text-muted-foreground">{relTime(p.updated_at)}</span></div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs"><Badge variant="secondary">{p.stage}</Badge>{skillName(p.skill_id) && <span className="text-muted-foreground">{skillName(p.skill_id)}</span>}</div>
              <p className="mt-2 text-xs text-muted-foreground">{p.plan?.parts?.length ? `${p.plan.parts.length}/6 story parts planned` : "No plan yet"}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GroupDetail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: group, isLoading } = useQuery({ queryKey: ["group", slug], queryFn: () => getGroup(slug) });

  const save = async (patch: Partial<AssetGroup>) => {
    if (!group) return;
    try { await updateGroup(group.id, patch as any); qc.invalidateQueries({ queryKey: ["group", slug] }); toast.success("Saved"); } catch (e) { toast.error((e as Error).message); }
  };

  if (isLoading) return <div className="studio-theme min-h-screen bg-background" />;
  if (!group) return (
    <div className="studio-theme min-h-screen bg-background text-foreground"><HubHeader />
      <p className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">No hub called “{slug}”. <Link to="/" className="underline">Back to hubs</Link></p>
    </div>
  );

  return (
    <div className="studio-theme min-h-screen bg-background pb-20 text-foreground md:pb-0">
      <HubHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <EditableText value={group.title} onSave={(title) => title.trim() && save({ title: title.trim() })} className="text-2xl font-semibold" />
        <div className="mt-2 flex items-center gap-2">
          <code className="rounded bg-muted px-2 py-1 font-mono text-sm">{group.slug}</code>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(group.slug)} aria-label="Copy slug"><Copy className="h-3.5 w-3.5" /></Button>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => {
            if (!confirm(`Delete "${group.title}" with all its projects and files?`)) return;
            try { await deleteGroup(group); qc.invalidateQueries({ queryKey: ["groups"] }); navigate("/"); } catch (e) { toast.error((e as Error).message); }
          }}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete hub</Button>
        </div>
        <EditableText multiline value={group.notes || ""} onSave={(notes) => save({ notes })} placeholder="What is this niche about? Notes for you or the agent…" className="mt-3" />

        <Tabs defaultValue="projects" className="mt-8">
          <TabsList><TabsTrigger value="projects">Projects</TabsTrigger><TabsTrigger value="skills">Skills</TabsTrigger><TabsTrigger value="library">Library</TabsTrigger><TabsTrigger value="style">Style</TabsTrigger><TabsTrigger value="agent">Agent</TabsTrigger></TabsList>
          <TabsContent value="projects" className="mt-6"><ProjectsTab group={group} /></TabsContent>
          <TabsContent value="skills" className="mt-6"><SkillsTab group={group} /></TabsContent>
          <TabsContent value="library" className="mt-6">
            <p className="mb-4 text-sm text-muted-foreground">Reusable across every video in this hub: sound effects, music, clips, logos, characters. Give each a type and tags so agents can find it. The Shared Library hub is available to every hub too.</p>
            <AssetPanel group={group} title="Library" />
          </TabsContent>
          <TabsContent value="style" className="mt-6">
            <label className="mb-4 flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
              <Switch checked={!!group.auto_cutout} onCheckedChange={(auto_cutout) => save({ auto_cutout })} className="mt-0.5" />
              <span><span className="font-medium">Auto cut-outs</span><span className="block text-xs text-muted-foreground">Every new picture in this hub also gets a transparent-background copy tagged "cutout". The original is kept. Best for collage styles.</span></span>
            </label>
            <p className="mb-2 text-sm text-muted-foreground">The style guide every agent obeys in this hub: voice and tone, colours, fonts, pacing, sound taste, banned words.</p>
            <EditableText multiline rows={20} value={group.style_guide || ""} onSave={(style_guide) => save({ style_guide })} placeholder="e.g. Tone: slow dread, never jump-scare in the first 3s. Palette: #0b0b0b, bone white, blood red accents. Banned words: …" className="font-mono text-xs" />
          </TabsContent>
          <TabsContent value="agent" className="mt-6">
            <div className="space-y-4 rounded-lg border border-border p-4 text-sm">
              <CopyRow label="Everything in this hub (skills, library, style, projects)" value={projectManifestUrl(group.slug)} />
              <CopyRow label="Add files back (POST, needs your write token)" value={ingestUrl} />
              <p className="text-xs text-muted-foreground">Each project has its own link with its files and plan — open a project to copy it.</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <MobileBottomNav />
    </div>
  );
}
