import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Shapes, ArrowLeft, Code2, Eye, Wand2, Loader2 } from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import CodeEditor from "@/components/CodeEditor";
import RemotionPreview from "@/components/RemotionPreview";
import RenderControls from "@/components/RenderControls";
import { parseMultiFileCode } from "@/lib/code-parser";
import { detectConfig } from "@/lib/detect-config";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RenderSettings, RenderMode } from "@/components/FormatSelector";
import { findMissingAssets, missingMessage, functionErrorMessage } from "@/lib/check-asset-links";
import { assetUrl, fmtTime, type Asset } from "@/features/hub/api";
import { readLottie, talkingLottieCode, mouthLayers } from "@/features/hub/lottie";

type HubAsset = Asset & { asset_groups?: { title: string; slug: string } | null };

/** Per-frame loudness (RMS) of an audio file, normalized 0..1 and smoothed. */
async function audioAmplitudes(url: string, fps: number, frames: number): Promise<[number, number][]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load the voiceover audio.");
  const buf = await res.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 44100, 44100);
  const audio = await ctx.decodeAudioData(buf);
  const ch = audio.getChannelData(0);
  const per = audio.sampleRate / fps;
  const raw: number[] = [];
  let peak = 0;
  for (let f = 0; f < frames; f++) {
    const s = Math.floor(f * per);
    const e = Math.min(ch.length, Math.max(s + 1, Math.floor((f + 1) * per)));
    let sum = 0;
    for (let i = s; i < e; i++) sum += ch[i] * ch[i];
    const rms = Math.sqrt(sum / (e - s));
    raw.push(rms);
    if (rms > peak) peak = rms;
  }
  const norm = raw.map((r) => (peak > 0 ? r / peak : 0));
  return norm.map((v, i) => {
    const sm = ((norm[i - 1] ?? v) + v * 2 + (norm[i + 1] ?? v)) / 4;
    return [i, Math.round((1 + Math.min(1, sm * 1.6) * 0.9) * 100) / 100] as [number, number];
  });
}

const LottieStudio = () => {
  const navigate = useNavigate();
  const [lottieId, setLottieId] = useState<string>("");
  const [audioId, setAudioId] = useState<string>("");
  const [talking, setTalking] = useState(true);
  const [loop, setLoop] = useState(true);
  const [code, setCode] = useState("");
  const [building, setBuilding] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>("video");
  const [mobileView, setMobileView] = useState<"code" | "preview">("preview");
  const [isMobile, setIsMobile] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { data: lotties } = useQuery({
    queryKey: ["lottie-studio-lotties"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("assets").select("*, asset_groups(title, slug)")
        .or("role.eq.lottie,tags.cs.{lottie}")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as HubAsset[];
    },
  });

  const { data: audios } = useQuery({
    queryKey: ["lottie-studio-audios"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("assets").select("*, asset_groups(title, slug)")
        .eq("kind", "audio")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as HubAsset[];
    },
  });

  const parsedFiles = useMemo(() => parseMultiFileCode(code), [code]);
  const detectedConfig = useMemo(() => detectConfig(code), [code]);

  const generate = useCallback(async () => {
    const lottie = lotties?.find((a) => a.id === lottieId);
    if (!lottie) { toast.error("Pick an animation first."); return; }
    const audio = audios?.find((a) => a.id === audioId);
    setBuilding(true);
    setStatus(null);
    try {
      const res = await fetch(assetUrl(lottie.id));
      if (!res.ok) throw new Error("Could not load the animation file.");
      const json = await res.json();
      const info = readLottie(json);
      const mouths = mouthLayers(json);

      let mouthKeys: [number, number][] | undefined;
      if (audio && talking) {
        if (!mouths.length) {
          setStatus(`No mouth layer found in this animation (looked for names like "mouth"/"lip"). Playing it with the voiceover only.`);
        } else {
          setStatus("Listening to the voiceover to move the mouth…");
          const frames = Math.max(info.frames, Math.ceil((audio.duration_seconds || info.frames / info.fps) * info.fps));
          mouthKeys = await audioAmplitudes(assetUrl(audio.id), info.fps, frames);
        }
      }

      const next = talkingLottieCode(assetUrl(lottie.id), json, {
        audioUrl: audio ? assetUrl(audio.id) : undefined,
        audioSeconds: audio?.duration_seconds ?? undefined,
        loop: loop && !!audio,
        mouthKeys,
      });
      setCode(next);
      setStatus(
        `${lottie.name}: ${info.width}×${info.height} · ${info.fps} fps · ${(info.frames / info.fps).toFixed(1)}s` +
        (audio ? ` + voiceover ${audio.name}${audio.duration_seconds ? ` (${fmtTime(audio.duration_seconds)})` : ""}` : "") +
        (mouthKeys ? ` · mouth moves on ${mouths.length} layer${mouths.length === 1 ? "" : "s"} (${mouths.join(", ")})` : "")
      );
      toast.success("Video code generated — preview is live.");
    } catch (e) {
      setStatus(null);
      toast.error((e as Error).message);
    } finally {
      setBuilding(false);
    }
  }, [lotties, audios, lottieId, audioId, talking, loop]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const handleRender = useCallback(async (settings: RenderSettings) => {
    setIsRendering(true);
    setRenderProgress(0);
    setDownloadUrl(null);
    setRenderMode(settings.mode);
    try {
      const missing = await findMissingAssets(code);
      if (missing.length) throw new Error(missingMessage(missing));
      const { data, error: renderError } = await supabase.functions.invoke("render-video", {
        body: { code, format: settings.format.label.toLowerCase(), durationInSeconds: settings.durationInSeconds, fps: settings.fps, debug: true },
      });
      if (renderError || data?.error) {
        throw new Error(data?.error || (renderError ? await functionErrorMessage(renderError, "Failed to start render") : "Failed to start render"));
      }
      const { renderId, bucketName } = data;
      if (!renderId || !bucketName) throw new Error("Invalid response from render service");
      toast.success("Render started! Tracking progress...");
      pollRef.current = setInterval(async () => {
        try {
          const { data: progress, error: progressError } = await supabase.functions.invoke("check-render-progress", { body: { renderId, bucketName } });
          if (progressError || progress?.error) return;
          if (progress?.fatalErrorEncountered || progress?.fatal) {
            stopPolling();
            setIsRendering(false);
            const errMsg = progress.errors?.[0]?.message || progress.errors?.[0]?.stack || "Unknown error";
            toast.error("Render failed: " + errMsg);
            return;
          }
          setRenderProgress(Math.round((progress?.overallProgress ?? 0) * 100));
          if (progress?.done && progress?.outputFile) {
            stopPolling();
            setIsRendering(false);
            setRenderProgress(100);
            setDownloadUrl(progress.outputFile);
            toast.success("Render complete!");
            navigate(`/result?url=${encodeURIComponent(progress.outputFile)}&mode=video`);
          }
        } catch (err) {
          console.error("Error polling progress:", err);
        }
      }, 10000);
    } catch (err: any) {
      setIsRendering(false);
      toast.error(err.message || "Failed to start render");
    }
  }, [code, stopPolling, navigate]);

  const assetLabel = (a: HubAsset) => `${a.name} — ${a.asset_groups?.title ?? "hub"}`;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-border bg-card/30">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <Shapes className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Lottie Studio</span>
          </div>
        </div>
        {isMobile && (
          <Button variant="outline" size="sm" onClick={() => setMobileView(mobileView === "code" ? "preview" : "code")} className="text-xs gap-1.5">
            {mobileView === "code" ? <Eye className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
            {mobileView === "code" ? "Preview" : "Code"}
          </Button>
        )}
      </div>

      {/* Picker bar */}
      <div className="flex flex-wrap items-end gap-3 px-3 sm:px-4 py-3 border-b border-border bg-card/20">
        <div className="grid gap-1.5 min-w-52 flex-1 sm:flex-none sm:w-72">
          <Label htmlFor="lottie-pick" className="text-xs">Animation</Label>
          <Select value={lottieId} onValueChange={setLottieId}>
            <SelectTrigger id="lottie-pick"><SelectValue placeholder="Pick a Lottie animation…" /></SelectTrigger>
            <SelectContent>
              {(lotties ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{assetLabel(a)}</SelectItem>)}
              {lotties && !lotties.length && <SelectItem value="__none" disabled>No Lottie files uploaded yet</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5 min-w-52 flex-1 sm:flex-none sm:w-72">
          <Label htmlFor="audio-pick" className="text-xs">Voiceover (optional)</Label>
          <Select value={audioId} onValueChange={(v) => setAudioId(v === "__none" ? "" : v)}>
            <SelectTrigger id="audio-pick"><SelectValue placeholder="No voiceover" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">No voiceover</SelectItem>
              {(audios ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{assetLabel(a)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="talking" checked={talking} onCheckedChange={setTalking} disabled={!audioId} />
          <Label htmlFor="talking" className="text-xs">Talking mouth</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="loop" checked={loop} onCheckedChange={setLoop} disabled={!audioId} />
          <Label htmlFor="loop" className="text-xs">Loop to fill voiceover</Label>
        </div>
        <Button onClick={generate} disabled={!lottieId || building} className="gap-1.5">
          {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {building ? "Building…" : "Generate"}
        </Button>
      </div>
      {status && <p className="px-3 sm:px-4 py-1.5 text-xs text-muted-foreground border-b border-border">{status}</p>}

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {!code ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="max-w-sm space-y-2">
              <Shapes className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Pick an animation above, optionally add a voiceover, and hit <span className="text-foreground font-medium">Generate</span>.
                You'll get a live preview and can render it to MP4.
              </p>
            </div>
          </div>
        ) : isMobile ? (
          mobileView === "code" ? (
            <CodeEditor code={code} onCodeChange={setCode} parsedFiles={parsedFiles} />
          ) : (
            <RemotionPreview parsedFiles={parsedFiles} detectedConfig={detectedConfig} error={null} />
          )
        ) : (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={30}>
              <CodeEditor code={code} onCodeChange={setCode} parsedFiles={parsedFiles} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              <RemotionPreview parsedFiles={parsedFiles} detectedConfig={detectedConfig} error={null} />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* Bottom controls */}
      <RenderControls
        hasCode={parsedFiles.length > 0}
        isRendering={isRendering}
        renderProgress={renderProgress}
        downloadUrl={downloadUrl}
        onRender={handleRender}
        detectedConfig={detectedConfig}
        renderMode={renderMode}
      />
      <MobileBottomNav />
    </div>
  );
};

export default LottieStudio;
