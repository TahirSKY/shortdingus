import { useState, useMemo, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import CodeEditor from "@/components/CodeEditor";
import PreviewPanel from "@/components/PreviewPanel";
import RenderControls from "@/components/RenderControls";
import { parseMultiFileCode } from "@/lib/code-parser";
import { detectConfig } from "@/lib/detect-config";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RenderSettings, RenderMode } from "@/components/FormatSelector";

const Playground = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState(() => {
    const saved = sessionStorage.getItem("playground-code");
    if (saved) {
      sessionStorage.removeItem("playground-code");
      return saved;
    }
    return "";
  });
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>("video");
  const [error] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parsedFiles = useMemo(() => parseMultiFileCode(code), [code]);
  const detectedConfig = useMemo(() => detectConfig(code), [code]);

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

    if (settings.mode === "poster") {
      const totalPages = settings.pages || 1;
      const startFrame = settings.frame || 0;
      const frameInterval = 30; // 1 second at 30fps per page

      try {
        const formatKey = settings.format.label.toLowerCase() === "portrait"
          ? "poster_portrait"
          : settings.format.label.toLowerCase() === "landscape"
            ? "poster_landscape"
            : settings.format.label.toLowerCase();

        const urls: string[] = [];

        for (let i = 0; i < totalPages; i++) {
          const frame = startFrame + i * frameInterval;
          setRenderProgress(Math.round(((i) / totalPages) * 100));

          const { data, error: renderError } = await supabase.functions.invoke("render-still", {
            body: {
              code,
              format: formatKey,
              imageFormat: settings.imageFormat || "png",
              frame,
              debug: true,
            },
          });

          if (renderError || data?.error) {
            throw new Error(data?.error || renderError?.message || `Failed to render page ${i + 1}`);
          }

          if (!data?.url) {
            throw new Error(`No image URL returned for page ${i + 1}`);
          }

          urls.push(data.url);
        }

        setRenderProgress(100);
        setDownloadUrl(urls[0]);
        setIsRendering(false);
        toast.success(`${totalPages > 1 ? `${totalPages} pages` : "Poster"} generated!`);

        if (totalPages > 1) {
          navigate(`/result?urls=${encodeURIComponent(urls.join(","))}&mode=poster`);
        } else {
          navigate(`/result?url=${encodeURIComponent(urls[0])}&mode=poster`);
        }
      } catch (err: any) {
        console.error("Poster render error:", err);
        setIsRendering(false);
        toast.error(err.message || "Failed to generate poster");
      }
      return;
    }

    // Video render — existing flow
    try {
      const { data, error: renderError } = await supabase.functions.invoke("render-video", {
        body: {
          code,
          format: settings.format.label.toLowerCase(),
          durationInSeconds: settings.durationInSeconds,
          fps: settings.fps,
          debug: true,
        },
      });

      if (renderError || data?.error) {
        throw new Error(data?.error || renderError?.message || "Failed to start render");
      }

      const { renderId, bucketName } = data;
      if (!renderId || !bucketName) {
        throw new Error("Invalid response from render service");
      }

      toast.success("Render started! Tracking progress...");

      pollRef.current = setInterval(async () => {
        try {
          const { data: progress, error: progressError } = await supabase.functions.invoke(
            "check-render-progress",
            { body: { renderId, bucketName } }
          );

          if (progressError || progress?.error) {
            console.error("Progress check error:", progress?.error || progressError);
            return;
          }

          if (progress?.fatalErrorEncountered || progress?.fatal) {
            stopPolling();
            setIsRendering(false);
            const errMsg = progress.errors?.[0]?.message || progress.errors?.[0]?.stack || "Unknown error";
            toast.error("Render failed: " + errMsg);
            console.error("[render] Fatal error details:", JSON.stringify(progress.errors));
            return;
          }

          if (progress?.errors?.length > 0) {
            console.warn("[render] Non-fatal errors:", progress.errors);
          }

          const pct = Math.round((progress?.overallProgress ?? 0) * 100);
          setRenderProgress(pct);

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
      console.error("Render error:", err);
      setIsRendering(false);
      toast.error(err.message || "Failed to start render");
    }
  }, [code, stopPolling]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/30">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Remotion Playground</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={50} minSize={30}>
            <CodeEditor code={code} onCodeChange={setCode} parsedFiles={parsedFiles} />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={30}>
            <PreviewPanel parsedFiles={parsedFiles} error={error} />
          </ResizablePanel>
        </ResizablePanelGroup>
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
    </div>
  );
};

export default Playground;
