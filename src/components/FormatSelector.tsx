import { useState } from "react";
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
import { Monitor, Smartphone, Square } from "lucide-react";

export interface VideoFormat {
  label: string;
  width: number;
  height: number;
  icon: React.ReactNode;
  aspect: string;
}

export interface RenderSettings {
  format: VideoFormat;
  durationInSeconds: number;
  fps: number;
}

const FORMATS: VideoFormat[] = [
  { label: "YouTube", width: 1920, height: 1080, icon: <Monitor className="w-5 h-5" />, aspect: "16:9" },
  { label: "TikTok", width: 1080, height: 1920, icon: <Smartphone className="w-5 h-5" />, aspect: "9:16" },
  { label: "Square", width: 1080, height: 1080, icon: <Square className="w-5 h-5" />, aspect: "1:1" },
];

interface FormatSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (settings: RenderSettings) => void;
}

const FormatSelector = ({ open, onClose, onSelect }: FormatSelectorProps) => {
  const [selected, setSelected] = useState<number>(0);
  const [duration, setDuration] = useState("10");
  const [fps, setFps] = useState("30");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Render Settings</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 py-4">
          {FORMATS.map((f, i) => (
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
        <p className="text-[11px] text-muted-foreground -mt-1">
          Tip: Your code can override these via <code className="text-xs bg-muted px-1 rounded">{"/*__REMOTION_CONFIG__ {fps:60, durationInFrames:900} */"}</code>
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-gradient-primary hover:opacity-90 border-0"
            onClick={() => onSelect({
              format: FORMATS[selected],
              durationInSeconds: Math.max(1, Math.min(300, Number(duration) || 10)),
              fps: Math.max(1, Math.min(120, Number(fps) || 30)),
            })}
          >
            Start Render
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FormatSelector;
