import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2, CheckCircle2, Image } from "lucide-react";
import FormatSelector, { type RenderSettings, type RenderMode } from "@/components/FormatSelector";
import type { DetectedConfig } from "@/lib/detect-config";

interface RenderControlsProps {
  hasCode: boolean;
  isRendering: boolean;
  renderProgress: number;
  downloadUrl: string | null;
  onRender: (settings: RenderSettings) => void;
  detectedConfig?: DetectedConfig;
  renderMode?: RenderMode;
}

const RenderControls = ({
  hasCode,
  isRendering,
  renderProgress,
  downloadUrl,
  onRender,
  detectedConfig,
  renderMode = "video",
}: RenderControlsProps) => {
  const [showFormat, setShowFormat] = useState(false);
  const [dialogMode, setDialogMode] = useState<RenderMode>("video");

  const isImage = renderMode === "poster";
  const fileExt = isImage ? "PNG" : "MP4";

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-t border-border bg-card/50">
      {downloadUrl ? (
        <Button asChild className="bg-gradient-primary hover:opacity-90 border-0 glow-primary">
          <a href={downloadUrl} download>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Download {fileExt}
          </a>
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => { setDialogMode("video"); setShowFormat(true); }}
            disabled={!hasCode || isRendering}
            className="bg-gradient-primary hover:opacity-90 border-0 disabled:opacity-40"
          >
            {isRendering && renderMode === "video" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rendering...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Render Video
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => { setDialogMode("poster"); setShowFormat(true); }}
            disabled={!hasCode || isRendering}
            className="disabled:opacity-40"
          >
            {isRendering && renderMode === "poster" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Image className="w-4 h-4 mr-2" />
                Poster
              </>
            )}
          </Button>
        </div>
      )}

      <FormatSelector
        open={showFormat}
        onClose={() => setShowFormat(false)}
        onSelect={(settings) => {
          setShowFormat(false);
          onRender(settings);
        }}
        detectedConfig={detectedConfig}
        defaultMode={dialogMode}
      />

      {isRendering && (
        <div className="flex-1 flex items-center gap-3">
          <Progress value={renderProgress} className="flex-1 h-2" />
          <span className="text-xs text-muted-foreground font-mono w-10 text-right">
            {Math.round(renderProgress)}%
          </span>
        </div>
      )}

      {!hasCode && !isRendering && (
        <span className="text-xs text-muted-foreground">
          Add code to enable rendering
        </span>
      )}
    </div>
  );
};

export default RenderControls;
