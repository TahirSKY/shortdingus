import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clapperboard, ArrowLeft, Loader2, Plug, Download, Save, RefreshCw, ExternalLink } from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { assetUrl, listGroups, listProjects, uploadFile, updateAssetTags, fmtTime, type Asset, type AssetGroup, type Project } from "@/features/hub/api";

const PRESETS = [
  { label: "Test · 384×256", width: 384, height: 256 },
  { label: "Wide · 576×320", width: 576, height: 320 },
  { label: "Vertical · 320×576", width: 320, height: 576 },
];
const FRAME_CHOICES = [33, 73, 97];

type Job = { id: string; status: "queued" | "running" | "done" | "error"; error?: string; seconds?: number; videoUrl?: string; prompt: string };

async function api(endpoint: string, token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${endpoint.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Token": token, ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch { /* not json */ }
    throw new Error(typeof detail === "string" ? detail : `Request failed (${res.status})`);
  }
  return res;
}

const VideoStudio = () => {
  const qc = useQueryClient();
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem("video-gen-endpoint") || "");
  const [token, setToken] = useState(() => localStorage.getItem("video-gen-token") || "");
  const [health, setHealth] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [preset, setPreset] = useState("0");
  const [frames, setFrames] = useState("33");
  const [fps, setFps] = useState("24");
  const [seed, setSeed] = useState(() => String(Math.floor(Math.random() * 100000)));
  const [imageId, setImageId] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [saveGroup, setSaveGroup] = useState("");
  const [saveProject, setSaveProject] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: listGroups });
  const { data: projects } = useQuery({
    queryKey: ["projects", saveGroup],
    enabled: !!saveGroup,
    queryFn: () => listProjects(saveGroup),
  });
  const { data: images } = useQuery({
    queryKey: ["video-gen-images"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("assets").select("*, asset_groups(title, slug)")
        .eq("kind", "image").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as (Asset & { asset_groups?: { title: string } | null })[];
    },
  });
  const { data: generated } = useQuery({
    queryKey: ["video-gen-gallery"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("assets").select("*, asset_groups(title, slug)")
        .contains("tags", ["ai-video"]).order("created_at", { ascending: false }).limit(24);
      if (error) throw error;
      return data as (Asset & { asset_groups?: { title: string } | null })[];
    },
  });

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const connect = useCallback(async () => {
    if (!endpoint.trim() || !token.trim()) { toast.error("Paste the endpoint and token from Colab."); return; }
    setChecking(true);
    setHealth(null);
    try {
      const res = await api(endpoint.trim(), token.trim(), "/health");
      const j = await res.json();
      localStorage.setItem("video-gen-endpoint", endpoint.trim());
      localStorage.setItem("video-gen-token", token.trim());
      setHealth(`Connected — ${j.gpu || "GPU ready"}`);
      toast.success("Connected to your Colab GPU.");
    } catch (e) {
      setHealth(null);
      toast.error(`Could not connect: ${(e as Error).message}`);
    } finally {
      setChecking(false);
    }
  }, [endpoint, token]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const generate = useCallback(async () => {
    if (!prompt.trim()) { toast.error("Describe the shot first."); return; }
    stopPolling();
    setJob(null);
    const p = PRESETS[Number(preset)];
    try {
      const res = await api(endpoint, token, "/generate", {
        method: "POST",
        body: JSON.stringify({
          prompt: prompt.trim(), width: p.width, height: p.height,
          frames: Number(frames), fps: Number(fps), seed: Number(seed) || 42,
          image_url: imageId ? assetUrl(imageId) : undefined,
        }),
      });
      const { job_id } = await res.json();
      setJob({ id: job_id, status: "queued", prompt: prompt.trim() });
      pollRef.current = setInterval(async () => {
        try {
          const r = await api(endpoint, token, `/jobs/${job_id}`);
          const j = await r.json();
          if (j.status === "done") {
            stopPolling();
            const videoRes = await api(endpoint, token, `/jobs/${job_id}/video`);
            const blob = await videoRes.blob();
            setJob({ id: job_id, status: "done", seconds: j.seconds, videoUrl: URL.createObjectURL(blob), prompt: prompt.trim() });
            toast.success(`Video ready in ${j.seconds ?? "?"}s — save it to a hub below.`);
          } else if (j.status === "error") {
            stopPolling();
            setJob({ id: job_id, status: "error", error: j.error, prompt: prompt.trim() });
            toast.error(`Generation failed: ${j.error}`);
          } else {
            setJob((prev) => prev ? { ...prev, status: j.status } : prev);
          }
        } catch (e) {
          console.warn("poll failed", e);
        }
      }, 5000);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [endpoint, token, prompt, preset, frames, fps, seed, imageId, stopPolling]);

  const saveToHub = useCallback(async () => {
    const group = groups?.find((g) => g.id === saveGroup);
    if (!group || !job?.videoUrl) { toast.error("Pick a hub to save into."); return; }
    setSaving(true);
    try {
      const blob = await (await fetch(job.videoUrl)).blob();
      const name = `ai-video ${new Date().toISOString().slice(0, 16).replace("T", " ")}.mp4`;
      const file = new File([blob], name, { type: "video/mp4" });
      const id = await uploadFile(group, file, saveProject || null);
      await updateAssetTags(id, "ai-video", ["ai-video"]);
      await qc.invalidateQueries({ queryKey: ["video-gen-gallery"] });
      toast.success("Saved to your hub — it's in the gallery below.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [groups, saveGroup, saveProject, job, qc]);

  const notebookUrl = `${window.location.origin}/colab/ltx-video-server.ipynb`;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 border-b border-border bg-card/30">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="w-px h-5 bg-border" />
        <Clapperboard className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Video Studio</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">AI video generation on your free Colab GPU</span>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 p-4">
        {/* Step 1: notebook */}
        <section className="rounded-lg border border-border bg-card/30 p-4 space-y-2">
          <h2 className="text-sm font-semibold">1. Start the GPU session</h2>
          <p className="text-xs text-muted-foreground">
            Download the server notebook, open it in Google Colab, pick a GPU runtime and run all cells.
            The last cell prints an endpoint and a token.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={notebookUrl} download="ltx-video-server.ipynb"><Download className="mr-1.5 h-3.5 w-3.5" />Download notebook</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://colab.research.google.com/" target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Open Colab</a>
            </Button>
          </div>
        </section>

        {/* Step 2: connect */}
        <section className="rounded-lg border border-border bg-card/30 p-4 space-y-3">
          <h2 className="text-sm font-semibold">2. Connect</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="endpoint" className="text-xs">Endpoint</Label>
              <Input id="endpoint" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://….trycloudflare.com" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="token" className="text-xs">Token</Label>
              <Input id="token" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Printed by the last cell" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={connect} disabled={checking} className="gap-1.5">
              {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
              Connect
            </Button>
            {health && <p className="text-xs text-green-500">{health}</p>}
          </div>
        </section>

        {/* Step 3: generate */}
        <section className="rounded-lg border border-border bg-card/30 p-4 space-y-3">
          <h2 className="text-sm font-semibold">3. Generate</h2>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
            placeholder="Describe the shot: subject, motion, camera, light. E.g. A small red sailboat moves slowly across a calm lake…" />
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
            <div className="grid gap-1.5">
              <Label className="text-xs">Size</Label>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRESETS.map((p, i) => <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Length</Label>
              <Select value={frames} onValueChange={setFrames}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FRAME_CHOICES.map((f) => <SelectItem key={f} value={String(f)}>{f} frames · {(f / Number(fps)).toFixed(1)}s</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">FPS</Label>
              <Select value={fps} onValueChange={setFps}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["24", "30"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Seed</Label>
              <Input value={seed} onChange={(e) => setSeed(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Start image</Label>
              <Select value={imageId} onValueChange={(v) => setImageId(v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None (text only)</SelectItem>
                  {(images ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={generate} disabled={!health || !!job && (job.status === "queued" || job.status === "running")} className="gap-1.5">
            {job && (job.status === "queued" || job.status === "running")
              ? <><Loader2 className="h-4 w-4 animate-spin" />{job.status === "queued" ? "Queued…" : "Generating… (can take minutes)"}</>
              : <><Clapperboard className="h-4 w-4" />Generate video</>}
          </Button>

          {job?.status === "error" && <p role="alert" className="text-sm text-destructive">{job.error}</p>}
          {job?.status === "done" && job.videoUrl && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <video src={job.videoUrl} controls className="w-full max-w-md rounded" />
              <p className="text-xs text-muted-foreground">"{job.prompt}" · generated in {job.seconds ?? "?"}s</p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Save to hub</Label>
                  <Select value={saveGroup} onValueChange={(v) => { setSaveGroup(v); setSaveProject(""); }}>
                    <SelectTrigger className="w-52"><SelectValue placeholder="Pick a hub…" /></SelectTrigger>
                    <SelectContent>{(groups ?? []).map((g: AssetGroup) => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {saveGroup && (
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Project (optional)</Label>
                    <Select value={saveProject} onValueChange={(v) => setSaveProject(v === "__hub" ? "" : v)}>
                      <SelectTrigger className="w-52"><SelectValue placeholder="Hub library" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__hub">Hub library</SelectItem>
                        {(projects ?? []).map((p: Project) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button size="sm" onClick={saveToHub} disabled={!saveGroup || saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save to hub
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Gallery */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Generated videos</h2>
            <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["video-gen-gallery"] })}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          {generated?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {generated.map((a) => (
                <div key={a.id} className="rounded-md border border-border bg-card/30 p-2 space-y-1.5">
                  <video src={assetUrl(a.id)} controls preload="metadata" className="w-full rounded" />
                  <p className="truncate text-xs font-medium">{a.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {a.asset_groups?.title ?? "hub"}{a.duration_seconds ? ` · ${fmtTime(a.duration_seconds)}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nothing generated yet. Videos you save to a hub will appear here.</p>
          )}
        </section>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default VideoStudio;
