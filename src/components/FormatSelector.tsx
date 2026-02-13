import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone, Square } from "lucide-react";

export interface VideoFormat {
  label: string;
  width: number;
  height: number;
  icon: React.ReactNode;
  aspect: string;
}

const FORMATS: VideoFormat[] = [
  { label: "YouTube", width: 1920, height: 1080, icon: <Monitor className="w-5 h-5" />, aspect: "16:9" },
  { label: "TikTok", width: 1080, height: 1920, icon: <Smartphone className="w-5 h-5" />, aspect: "9:16" },
  { label: "Square", width: 1080, height: 1080, icon: <Square className="w-5 h-5" />, aspect: "1:1" },
];

interface FormatSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (format: VideoFormat) => void;
}

const FormatSelector = ({ open, onClose, onSelect }: FormatSelectorProps) => {
  const [selected, setSelected] = useState<number>(0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Output Format</DialogTitle>
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
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-gradient-primary hover:opacity-90 border-0"
            onClick={() => onSelect(FORMATS[selected])}
          >
            Start Render
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FormatSelector;
