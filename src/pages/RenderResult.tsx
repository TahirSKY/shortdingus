import { useState, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const RenderResult = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const url = params.get("url");
  const mode = params.get("mode") || "video";

  const isImage = mode === "poster";
  const fileExt = isImage ? "png" : "mp4";
  const fileName = `remotion-${mode}.${fileExt}`;
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!url) return;
    setDownloading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  }, [url, fileName]);

  if (!url) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">No render result found.</p>
        <Button asChild variant="outline">
          <Link to="/playground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Playground
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/30">
        <div className="flex items-center gap-3">
          <Link
            to="/playground"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Playground
          </Link>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {isImage ? "Poster" : "Video"} Result
            </span>
          </div>
        </div>

        <Button onClick={handleDownload} disabled={downloading} className="bg-gradient-primary hover:opacity-90 border-0 glow-primary">
          {downloading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Download {fileExt.toUpperCase()}
        </Button>
      </div>

      {/* Content preview */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div className="max-w-4xl w-full flex flex-col items-center gap-6">
          {isImage ? (
            <img
              src={url}
              alt="Rendered poster"
              className="max-w-full max-h-[75vh] rounded-lg border border-border shadow-lg object-contain"
            />
          ) : (
            <video
              src={url}
              controls
              autoPlay
              className="max-w-full max-h-[75vh] rounded-lg border border-border shadow-lg"
            />
          )}

          <p className="text-xs text-muted-foreground">
            Right-click the {isImage ? "image" : "video"} to save, or use the download button above.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RenderResult;
