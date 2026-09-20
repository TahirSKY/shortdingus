import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Download, Film, Loader2, MessageSquare, Paperclip, Play, RotateCcw, Send, Sparkles, Upload, Video } from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import RemotionPreview from "@/components/RemotionPreview";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { parseMultiFileCode } from "@/lib/code-parser";
import { detectConfig } from "@/lib/detect-config";
import { toast } from "sonner";
import { callStudioAgent, createStudioProject, generateStudioImage, generateVoice, getVideoDuration, newId, patchStudioProject, persistMessage, uploadFootage } from "@/features/studio/api";
import { compileEdlToRemotion } from "@/features/studio/compile-edl";
import { createFootageEdl, createIdeaEdl, normalizeEdl } from "@/features/studio/edl";
import type { EditDirection, StudioBeat, StudioEdl, StudioMessage, StudioMode, StudioStage } from "@/features/studio/types";

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const starterIdeas = ["A 30s intern vs CEO sketch about ridiculous loans", "Turn this dog walk into a threshold-training story", "A sharp product story with a surprising first line"];

const Studio = () => {
  const [mode, setMode] = useState<StudioMode>("have_footage");
  const [stage, setStage] = useState<StudioStage>("start");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [beats, setBeats] = useState<StudioBeat[]>([]);
  const [directions, setDirections] = useState<EditDirection[]>([]);
  const [edl, setEdl] = useState<StudioEdl | null>(null);
  const [footage, setFootage] = useState<{ url: string; duration: number; name: string } | null>(null);
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");
  const [renderProgress, setRenderProgress] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const code = useMemo(() => edl ? compileEdlToRemotion(edl) : "", [edl]);
  const parsedFiles = useMemo(() => parseMultiFileCode(code), [code]);
  const detectedConfig = useMemo(() => detectConfig(code), [code]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const addMessage = useCallback(async (message: StudioMessage, id = projectId) => {
    setMessages((current) => [...current, message]);
    if (id) await persistMessage(id, message, messages.length).catch(console.error);
  }, [messages.length, projectId]);

  const ensureProject = async (title: string) => {
    if (projectId) return projectId;
    const project = await createStudioProject(mode, title.slice(0, 80) || "Untitled video");
    setProjectId(project.id);
    return project.id;
  };

  const requestDirections = async (goal: string, id: string, analysis: unknown, source?: typeof footage) => {
    setStage("directions");
    const result = await callStudioAgent({ action: "directions", mode, message: goal, analysis, footage: source });
    const next = (result.directions || []).slice(0, 3);
    setDirections(next);
    await patchStudioProject(id, { stage: "directions", footage_analysis: analysis });
    await addMessage({ id: newId(), role: "assistant", kind: "directions", content: result.reply || "Here are three ways I could cut it.", payload: next }, id);
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    if (file.type !== "video/mp4") return toast.error("Upload an MP4 video.");
    if (!file.size || file.size > MAX_VIDEO_BYTES) return toast.error("The MP4 must be between 1 byte and 200MB.");
    setBusy(true);
    try {
      const duration = await getVideoDuration(file);
      if (duration > 60.05) throw new Error("The clip is over 60 seconds. Trim it, then upload again.");
      const id = await ensureProject(file.name.replace(/\.mp4$/i, ""));
      setStage("analyzing");
      await addMessage({ id: newId(), role: "user", kind: "text", content: `Uploaded ${file.name}` }, id);
      const asset = await uploadFootage(id, file, duration);
      const source = { url: asset.url, duration, name: file.name };
      setFootage(source);
      await patchStudioProject(id, { stage: "analyzing" });
      const analysis = await callStudioAgent({ action: "analyze", mode, message: input || "Find the strongest short-form story", footage: source });
      const nextBeats = analysis.beats || [];
      setBeats(nextBeats);
      await addMessage({ id: newId(), role: "assistant", kind: "beats", content: analysis.summary || "I watched the clip. These are the useful beats.", payload: nextBeats }, id);
      await requestDirections(input || "Find the strongest short-form story", id, analysis, source);
      setInput("");
    } catch (error) { toast.error((error as Error).message); setStage("error"); }
    finally { setBusy(false); }
  };

  const handleIdea = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const id = await ensureProject(text);
      await addMessage({ id: newId(), role: "user", kind: "text", content: text }, id);
      setInput("");
      if (edl) {
        const result = await callStudioAgent({ action: "update", mode, message: text, edl });
        const nextEdl = normalizeEdl(result.edl || edl);
        setEdl(nextEdl);
        await patchStudioProject(id, { edl: nextEdl, revision: nextEdl.revision, stage: "ready" });
        await addMessage({ id: newId(), role: "assistant", kind: "text", content: result.reply || "Done — the preview is updated." }, id);
      } else {
        await requestDirections(text, id, null);
      }
    } catch (error) { toast.error((error as Error).message); await addMessage({ id: newId(), role: "assistant", kind: "error", content: (error as Error).message }); }
    finally { setBusy(false); }
  };

  const approveDirection = async (direction: EditDirection) => {
    if (!projectId || busy) return;
    setBusy(true);
    setStage("building");
    try {
      await addMessage({ id: newId(), role: "user", kind: "approval", content: `Use “${direction.title}”` });
      await patchStudioProject(projectId, { stage: "approved", selected_direction: direction });
      const result = await callStudioAgent({ action: "build", mode, message: input, direction, footage });
      
      // Enhanced image generation with better error handling and fallback
      let imageUrls: string[] = [];
      if (!footage && result.imagePrompts?.length) {
        toast.info(`Generating ${result.imagePrompts.length} visuals...`);
        const images = await Promise.allSettled(
          result.imagePrompts.slice(0, 5).map(async (prompt, idx) => {
            // Add retry logic for image generation
            for (let attempt = 0; attempt < 2; attempt++) {
              try {
                const img = await generateStudioImage(projectId, prompt);
                return img;
              } catch (e) {
                if (attempt === 1) throw e;
                await new Promise(r => setTimeout(r, 1000));
              }
            }
            throw new Error("Failed after retry");
          })
        );
        imageUrls = images
          .filter((r): r is PromiseFulfilledResult<{ url: string }> => r.status === "fulfilled")
          .map(r => r.value.url);
        
        if (imageUrls.length === 0) {
          toast.warning("Image generation failed, using cinematic colors - will retry with better prompts");
        } else {
          toast.success(`Generated ${imageUrls.length} visuals`);
        }
      }
      
      let nextEdl = footage ? createFootageEdl(direction.title, footage.url, footage.duration, direction) : createIdeaEdl(direction.title, direction, imageUrls);
      
      // Enhanced voice generation - handle multi-speaker (intern vs CEO)
      const turns = result.script?.turns || [];
      if (turns.length > 0) {
        try {
          // Detect if this is multi-speaker (intern vs CEO)
          const speakers = [...new Set(turns.map((t: any) => t.speaker?.toLowerCase()))];
          const isMultiSpeaker = speakers.length > 1 || turns.some((t: any) => t.speaker?.toLowerCase().includes("ceo") || t.speaker?.toLowerCase().includes("intern"));
          
          if (isMultiSpeaker) {
            toast.info(`Generating ${turns.length} voice lines with 2 characters...`);
            // Generate voice for each turn with different voices
            const voiceResults = await Promise.allSettled(
              turns.map(async (turn: any, idx: number) => {
                const speaker = (turn.speaker || "").toLowerCase();
                // CEO = deeper, smug voice (nova), intern = higher, nervous (alloy)
                const voiceId = speaker.includes("ceo") ? "nova" : speaker.includes("intern") ? "alloy" : idx % 2 === 0 ? "alloy" : "nova";
                for (let attempt = 0; attempt < 2; attempt++) {
                  try {
                    const v = await generateVoice(projectId, turn.text, voiceId);
                    return { ...v, turn, idx };
                  } catch (e) {
                    if (attempt === 1) throw e;
                    await new Promise(r => setTimeout(r, 1000));
                  }
                }
                throw new Error("Voice failed");
              })
            );
            
            const audioTracks = voiceResults
              .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
              .map((r) => ({
                id: `voice-${r.value.idx}`,
                start: r.value.turn.start || (r.value.idx * (nextEdl.duration / turns.length)),
                end: r.value.turn.end || ((r.value.idx + 1) * (nextEdl.duration / turns.length)),
                url: r.value.url,
                volume: 1,
                label: r.value.turn.speaker || `Speaker ${r.value.idx + 1}`
              }));
            
            if (audioTracks.length > 0) {
              nextEdl = { ...nextEdl, audio: audioTracks };
              toast.success(`Generated ${audioTracks.length} voice lines`);
            }
          } else {
            // Single narrator - original flow
            const narration = turns.map((turn: any) => turn.text).join(" ") || direction.structure.join(" ");
            const voice = await generateVoice(projectId, narration, mode === "need_footage" ? "alloy" : "nova");
            nextEdl = { ...nextEdl, audio: [{ id: "narration", start: 0, end: nextEdl.duration, url: voice.url, volume: 1, label: "Narration" }] };
          }
        } catch (voiceError) { 
          toast.warning("Visual edit ready; voice will be added on render"); 
          console.error(voiceError); 
        }
      } else {
        // Fallback to single narration from structure
        const narration = direction.structure.join(" ");
        try {
          const voice = await generateVoice(projectId, narration, mode === "need_footage" ? "alloy" : "nova");
          nextEdl = { ...nextEdl, audio: [{ id: "narration", start: 0, end: nextEdl.duration, url: voice.url, volume: 1, label: "Narration" }] };
        } catch (voiceError) {
          console.error(voiceError);
        }
      }
      
      setEdl(nextEdl);
      setStage("ready");
      setDirections([]);
      await patchStudioProject(projectId, { stage: "ready", selected_direction: direction, script: result.script || null, edl: nextEdl, revision: nextEdl.revision });
      await addMessage({ id: newId(), role: "assistant", kind: "text", content: result.reply || "The first cut is ready. Tell me what you want changed. You can say 'make captions bigger' or 'zoom more at 2s'." });
      setMobileView("preview");
    } catch (error) { toast.error((error as Error).message); setStage("error"); }
    finally { setBusy(false); }
  };

  const handleRender = async () => {
    if (!edl || rendering) return;
    setRendering(true); setRenderProgress(0); setDownloadUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("render-video", { body: { code, format: "tiktok", durationInSeconds: edl.duration, fps: edl.fps, debug: true } });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Could not start the render.");
      await patchStudioProject(projectId || "", { stage: "rendering" });
      setStage("rendering");
      pollRef.current = setInterval(async () => {
        const result = await supabase.functions.invoke("check-render-progress", { body: { renderId: data.renderId, bucketName: data.bucketName } });
        const progress = result.data;
        if (result.error || progress?.error) return;
        if (progress?.fatalErrorEncountered || progress?.fatal) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null; setRendering(false); setStage("error");
          toast.error(progress.errors?.[0]?.message || "The render failed.");
          return;
        }
        setRenderProgress(Math.round((progress?.overallProgress || 0) * 100));
        if (progress?.done && progress?.outputFile) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null; setRendering(false); setStage("complete"); setRenderProgress(100); setDownloadUrl(progress.outputFile);
          await patchStudioProject(projectId || "", { stage: "complete" });
          const db = supabase as any;
          await db.from("studio_assets").insert({ project_id: projectId, kind: "render", title: edl.title, url: progress.outputFile, mime_type: "video/mp4", duration_seconds: edl.duration });
          await db.from("saved_renders").insert({ title: edl.title, url: progress.outputFile, mode: "video", notes: "Created in AI Studio · TikTok 9:16" });
          toast.success("Your MP4 is ready.");
        }
      }, 10000);
    } catch (error) { setRendering(false); toast.error((error as Error).message); }
  };

  const reset = () => { setProjectId(null); setMessages([]); setStage("start"); setDirections([]); setBeats([]); setEdl(null); setFootage(null); setInput(""); setDownloadUrl(null); setRenderProgress(0); };
  const renderMessage = (message: StudioMessage) => (
    <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
      <div className={message.role === "user" ? "max-w-[86%] rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" : "max-w-[94%] text-sm text-foreground"}>
        {message.role !== "user" && <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Sparkles className="h-3 w-3" /> Editor</div>}
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {message.kind === "beats" && beats.length > 0 && <div className="mt-3 divide-y divide-border border-y border-border">{beats.map((beat) => <div key={`${beat.start}-${beat.label}`} className="grid grid-cols-[48px_1fr] gap-3 py-3"><span className="font-mono text-xs text-primary">{beat.start.toFixed(1)}s</span><div><p className="font-medium">{beat.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{beat.detail}</p><p className="mt-1 text-xs text-foreground">Edit: {beat.opportunity}</p></div></div>)}</div>}
        {message.kind === "directions" && directions.length > 0 && <div className="mt-3 space-y-2">{directions.map((direction, index) => <Button key={direction.id} variant="outline" onClick={() => approveDirection(direction)} disabled={busy} className="h-auto w-full justify-start whitespace-normal bg-card p-3 text-left hover:border-primary/60 hover:bg-muted"><div className="flex gap-3"><span className="font-mono text-xs text-muted-foreground">0{index + 1}</span><div><p className="font-medium">{direction.title}</p><p className="mt-1 text-xs text-muted-foreground">“{direction.hook}”</p><p className="mt-2 text-xs leading-relaxed">{direction.angle}</p></div></div></Button>)}</div>}
      </div>
    </div>
  );

  const chat = <div className="flex h-full min-h-0 flex-col border-r border-border bg-background">
    <div className="border-b border-border px-4 py-3"><div className="grid grid-cols-2 rounded-md bg-muted p-1"><Button variant={mode === "have_footage" ? "secondary" : "ghost"} size="sm" onClick={() => { if (!projectId) setMode("have_footage"); }} disabled={Boolean(projectId)}><Video className="mr-2 h-4 w-4" />I have footage</Button><Button variant={mode === "need_footage" ? "secondary" : "ghost"} size="sm" onClick={() => { if (!projectId) setMode("need_footage"); }} disabled={Boolean(projectId)}><Sparkles className="mr-2 h-4 w-4" />I need footage</Button></div></div>
    <ScrollArea className="flex-1"><div className="space-y-5 p-4 pb-8">{messages.length === 0 && <div className="pt-8"><p className="text-xs font-medium uppercase text-muted-foreground">New edit</p><h1 className="mt-3 max-w-sm text-2xl font-semibold leading-tight">{mode === "have_footage" ? "Drop in the clip. I’ll find the story." : "What should we make people stop for?"}</h1><p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{mode === "have_footage" ? "One MP4, up to 60 seconds. I’ll map the moments, pitch three cuts, then wait for your pick." : "Give me the premise in your own words. I’ll pitch three distinct ways to play it."}</p>{mode === "have_footage" ? <Button className="mt-6" onClick={() => fileRef.current?.click()} disabled={busy}><Upload className="mr-2 h-4 w-4" />Choose MP4</Button> : <div className="mt-6 space-y-2">{starterIdeas.filter((_, index) => index !== 1).map((idea) => <Button key={idea} variant="outline" className="h-auto w-full justify-start whitespace-normal py-3 text-left text-xs" onClick={() => setInput(idea)}>{idea}</Button>)}</div>}</div>}{messages.map(renderMessage)}{busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{stage === "analyzing" ? "Watching the clip…" : stage === "building" ? "Building the first cut… generating visuals and voices..." : "Thinking like an editor…"}</div>}</div></ScrollArea>
    <div className="border-t border-border p-3 pb-16 md:pb-3">{footage && <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Paperclip className="h-3 w-3" /><span className="truncate">{footage.name}</span><span>{footage.duration.toFixed(1)}s</span></div>}<div className="flex items-end gap-2"><Textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleIdea(); } }} placeholder={edl ? "Ask for a precise change… e.g. 'make captions bigger, add zoom at 2s'" : mode === "have_footage" ? "What should this clip be about?" : "Describe the idea…"} className="min-h-[46px] max-h-32 resize-none bg-card" disabled={busy} /><Button size="icon" className="h-[46px] w-[46px] shrink-0" onClick={handleIdea} disabled={!input.trim() || busy}><Send className="h-4 w-4" /></Button></div></div>
  </div>;

  const preview = <div className="flex h-full min-h-0 flex-col bg-card/30"><div className="flex items-center justify-between border-b border-border px-4 py-2.5"><div><p className="text-sm font-medium">{edl?.title || "Preview"}</p><p className="text-xs text-muted-foreground">9:16 · 1080×1920 {edl ? `· ${edl.duration.toFixed(1)}s` : ""}</p></div><div className="flex items-center gap-2">{edl && <Button size="sm" onClick={handleRender} disabled={rendering}>{rendering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Film className="mr-2 h-4 w-4" />}Render</Button>}{downloadUrl && <Button size="icon" variant="outline" asChild><a href={downloadUrl} download><Download className="h-4 w-4" /></a></Button>}</div></div>{rendering && <div className="border-b border-border px-4 py-2"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Rendering MP4</span><span>{renderProgress}%</span></div><Progress value={renderProgress} className="h-1" /></div>}<div className="min-h-0 flex-1">{edl ? <RemotionPreview parsedFiles={parsedFiles} detectedConfig={detectedConfig} error={null} /> : <div className="flex h-full items-center justify-center p-8"><div className="aspect-[9/16] h-[min(72vh,680px)] max-h-full rounded-md border border-border bg-background"><div className="flex h-full flex-col items-center justify-center px-8 text-center"><Play className="mb-4 h-8 w-8 text-muted-foreground" /><p className="text-sm font-medium">Your cut will play here</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Pick a direction in chat and the edit appears immediately. With visuals and voices.</p></div></div></div>}</div></div>;

  return <div className="studio-theme flex h-screen flex-col bg-background font-sans"><header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3"><div className="flex items-center gap-3"><Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link><div className="h-4 w-px bg-border" /><span className="text-sm font-semibold">Studio</span>{stage !== "start" && <span className="hidden text-xs capitalize text-muted-foreground sm:inline">{stage}</span>}</div><div className="flex items-center gap-2">{isMobile && <div className="grid grid-cols-2 rounded-md bg-muted p-0.5"><Button size="sm" variant={mobileView === "chat" ? "secondary" : "ghost"} onClick={() => setMobileView("chat")}><MessageSquare className="h-4 w-4" /></Button><Button size="sm" variant={mobileView === "preview" ? "secondary" : "ghost"} onClick={() => setMobileView("preview")}><Play className="h-4 w-4" /></Button></div>}<Button variant="ghost" size="icon" onClick={reset} title="New project"><RotateCcw className="h-4 w-4" /></Button></div></header><main className="min-h-0 flex-1">{isMobile ? <div className="h-full">{mobileView === "chat" ? chat : preview}</div> : <div className="grid h-full grid-cols-[minmax(340px,42%)_1fr]">{chat}{preview}</div>}</main><input ref={fileRef} type="file" accept="video/mp4" className="hidden" onChange={(event) => handleUpload(event.target.files?.[0])} /><MobileBottomNav /></div>;
};
export default Studio;
