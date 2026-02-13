import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2, CheckCircle2 } from "lucide-react";
import FormatSelector, { type VideoFormat } from "@/components/FormatSelector";

interface RenderControlsProps {
  hasCode: boolean;
  isRendering: boolean;
  renderProgress: number;
  downloadUrl: string | null;
  onRender: (format: VideoFormat) => void;
}

const RenderControls = ({
  hasCode,
  isRendering,
  renderProgress,
  downloadUrl,
  onRender,
}: RenderControlsProps) => {
  const [showFormat, setShowFormat] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-card/50">
      {downloadUrl ? (
        <Button asChild className="bg-gradient-primary hover:opacity-90 border-0 glow-primary">
          <a href={downloadUrl} download>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Download MP4
          </a>
        </Button>
      ) : (
        <Button
          onClick={() => setShowFormat(true)}
          disabled={!hasCode || isRendering}
          className="bg-gradient-primary hover:opacity-90 border-0 disabled:opacity-40"
        >
          {isRendering ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Rendering...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Render & Download
            </>
          )}
        </Button>
      )}

      <FormatSelector
        open={showFormat}
        onClose={() => setShowFormat(false)}
        onSelect={(format) => {
          setShowFormat(false);
          onRender(format);
        }}
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
