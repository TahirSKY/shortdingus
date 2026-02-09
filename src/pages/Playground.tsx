import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import CodeEditor from "@/components/CodeEditor";
import PreviewPanel from "@/components/PreviewPanel";
import RenderControls from "@/components/RenderControls";
import { parseMultiFileCode } from "@/lib/code-parser";

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

  const parsedFiles = useMemo(() => parseMultiFileCode(code), [code]);

  const handleRender = () => {
    // TODO: Connect to Supabase Edge Function for Lambda rendering
    setIsRendering(true);
    setRenderProgress(0);
    setDownloadUrl(null);

    // Simulated progress for now
    const interval = setInterval(() => {
      setRenderProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRendering(false);
          setDownloadUrl("#");
          return 100;
        }
        return prev + 5;
      });
    }, 300);
  };

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
