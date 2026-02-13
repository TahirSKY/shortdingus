import { useState, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import CodeEditor from "@/components/CodeEditor";
import PreviewPanel from "@/components/PreviewPanel";
import RenderControls from "@/components/RenderControls";
import { parseMultiFileCode } from "@/lib/code-parser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { VideoFormat } from "@/components/FormatSelector";

const Playground = () => {
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
  const [error] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parsedFiles = useMemo(() => parseMultiFileCode(code), [code]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const handleRender = useCallback(async (format: VideoFormat) => {
    setIsRendering(true);
    setRenderProgress(0);
    setDownloadUrl(null);

    try {
      // 1. Trigger the render with explicit format dimensions
      const { data, error: renderError } = await supabase.functions.invoke("render-video", {
        body: {
          code,
          format: format.label.toLowerCase(),
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

      // 2. Poll for progress
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

          // Surface non-fatal errors array if present
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
            toast.success("Render complete! Click to download.");
          }
        } catch (err) {
          console.error("Error polling progress:", err);
        }
      }, 5000);
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
      />
    </div>
  );
};

export default Playground;
