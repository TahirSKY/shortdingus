import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone, Square, Sparkles, Image, RectangleVertical, RectangleHorizontal } from "lucide-react";
import type { DetectedConfig } from "@/lib/detect-config";

export type RenderMode = "video" | "poster";

export interface VideoFormat {
  label: string;
  width: number;
  height: number;
  icon: React.ReactNode;
  aspect: string;
}

export interface RenderSettings {
  mode: RenderMode;
  format: VideoFormat;
  durationInSeconds: number;
  fps: number;
  imageFormat?: "png" | "jpeg";
  frame?: number;
  pages?: number;
}

const VIDEO_FORMATS: VideoFormat[] = [
  { label: "YouTube", width: 1920, height: 1080, icon: <Monitor className="w-5 h-5" />, aspect: "16:9" },
  { label: "TikTok", width: 1080, height: 1920, icon: <Smartphone className="w-5 h-5" />, aspect: "9:16" },
  { label: "Square", width: 1080, height: 1080, icon: <Square className="w-5 h-5" />, aspect: "1:1" },
];

const POSTER_FORMATS: VideoFormat[] = [
  { label: "Portrait", width: 1080, height: 1536, icon: <RectangleVertical className="w-5 h-5" />, aspect: "2:3" },
  { label: "Landscape", width: 1536, height: 1080, icon: <RectangleHorizontal className="w-5 h-5" />, aspect: "3:2" },
  { label: "Square", width: 1080, height: 1080, icon: <Square className="w-5 h-5" />, aspect: "1:1" },
  { label: "YouTube", width: 1920, height: 1080, icon: <Monitor className="w-5 h-5" />, aspect: "16:9" },
];

interface FormatSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (settings: RenderSettings) => void;
  detectedConfig?: DetectedConfig;
  defaultMode?: RenderMode;
}

const FormatSelector = ({ open, onClose, onSelect, detectedConfig, defaultMode = "video" }: FormatSelectorProps) => {
  const [mode, setMode] = useState<RenderMode>(defaultMode);
  const [selected, setSelected] = useState<number>(0);
  const [duration, setDuration] = useState("10");
  const [fps, setFps] = useState("30");
  const [imageFormat, setImageFormat] = useState<"png" | "jpeg">("png");
  const [frame, setFrame] = useState("0");
  const [pages, setPages] = useState("1");
  const [hasDetected, setHasDetected] = useState(false);

  const formats = mode === "video" ? VIDEO_FORMATS : POSTER_FORMATS;

  // Reset selection when mode changes
  useEffect(() => {
    setSelected(0);
  }, [mode]);

  // Sync mode with defaultMode when dialog opens
  useEffect(() => {
    if (open) {
      setMode(defaultMode);
    }
  }, [open, defaultMode]);

  // Pre-fill from detected config when dialog opens
  useEffect(() => {
    if (!open) {
      setHasDetected(false);
      return;
    }
    if (detectedConfig) {
      const detected = Object.keys(detectedConfig).length > 0;
      setHasDetected(detected);
      if (detectedConfig.durationInSeconds) {
        setDuration(String(detectedConfig.durationInSeconds));
      }
      if (detectedConfig.fps) {
        setFps(String(detectedConfig.fps));
      }
      if (detectedConfig.width && detectedConfig.height) {
        const ratio = detectedConfig.width / detectedConfig.height;
        if (ratio < 0.8) setSelected(mode === "video" ? 1 : 0);
        else if (ratio > 1.2) setSelected(mode === "video" ? 0 : 1);
        else setSelected(2);
      }
    }
  }, [open, detectedConfig, mode]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Render Settings</DialogTitle>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setMode("video")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors",
              mode === "video"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            <Monitor className="w-4 h-4" />
            Video
          </button>
          <button
            onClick={() => setMode("poster")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors",
              mode === "poster"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            <Image className="w-4 h-4" />
            Poster
          </button>
        </div>

        {/* Format Grid */}
        <div className={cn("grid gap-3 py-2", formats.length <= 3 ? "grid-cols-3" : "grid-cols-4")}>
          {formats.map((f, i) => (
            <button
              key={f.label}
              onClick={() => setSelected(i)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary/60",
                selected === i
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {f.icon}
              <span className="text-sm font-medium">{f.label}</span>
              <span className="text-xs opacity-70">{f.aspect}</span>
              <span className="text-[10px] opacity-50">{f.width}×{f.height}</span>
            </button>
          ))}
        </div>

        {hasDetected && (
          <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 rounded-md px-2.5 py-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-detected from your code</span>
          </div>
        )}

        {mode === "video" ? (
          /* Video settings */
          <div className="grid grid-cols-2 gap-4 pb-2">
            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-xs text-muted-foreground">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="300"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fps" className="text-xs text-muted-foreground">FPS</Label>
              <Input
                id="fps"
                type="number"
                min="1"
                max="120"
                value={fps}
                onChange={(e) => setFps(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        ) : (
          /* Poster settings */
          <div className="grid grid-cols-3 gap-4 pb-2">
            <div className="space-y-1.5">
              <Label htmlFor="imageFormat" className="text-xs text-muted-foreground">Format</Label>
              <div className="flex rounded-lg border border-border overflow-hidden h-9">
                <button
                  onClick={() => setImageFormat("png")}
                  className={cn(
                    "flex-1 text-sm font-medium transition-colors",
                    imageFormat === "png"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground"
                  )}
                >
                  PNG
                </button>
                <button
                  onClick={() => setImageFormat("jpeg")}
                  className={cn(
                    "flex-1 text-sm font-medium transition-colors",
                    imageFormat === "jpeg"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground"
                  )}
                >
                  JPEG
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pages" className="text-xs text-muted-foreground">Pages</Label>
              <Input
                id="pages"
                type="number"
                min="1"
                max="20"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="frame" className="text-xs text-muted-foreground">{Number(pages) > 1 ? "Start Frame" : "Frame"}</Label>
              <Input
                id="frame"
                type="number"
                min="0"
                value={frame}
                onChange={(e) => setFrame(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground -mt-1">
          {mode === "video"
            ? <>Tip: Your code can override these via <code className="text-xs bg-muted px-1 rounded">{"/*__REMOTION_CONFIG__ {fps:60, durationInFrames:900} */"}</code></>
            : <>Tip: For multi-page brochures, set Pages {'>'} 1. Each page captures a frame spaced 30 frames apart.</>
          }
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-gradient-primary hover:opacity-90 border-0"
            onClick={() => onSelect({
              mode,
              format: formats[selected],
              durationInSeconds: Math.max(1, Math.min(300, Number(duration) || 10)),
              fps: Math.max(1, Math.min(120, Number(fps) || 30)),
              imageFormat: mode === "poster" ? imageFormat : undefined,
              frame: mode === "poster" ? Math.max(0, Number(frame) || 0) : undefined,
              pages: mode === "poster" ? Math.max(1, Math.min(20, Number(pages) || 1)) : undefined,
            })}
          >
            {mode === "video" ? "Start Render" : "Generate Poster"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FormatSelector;
