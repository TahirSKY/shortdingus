import { useState } from "react";
import { Loader2, PencilLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Asset } from "./api";
import { whiteboardClipState, whiteboardRequest } from "./whiteboard";

export default function WhiteboardButton({ asset, projectId, clips, onStarted }: { asset: Asset; projectId: string; clips: Asset[]; onStarted: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draw, setDraw] = useState(6);
  const [hold, setHold] = useState(1);
  const [format, setFormat] = useState("vertical");
  const [finish, setFinish] = useState("original");
  const [hand, setHand] = useState(true);
  const pending = clips.some((c) => c.meta?.source_asset_id === asset.id && whiteboardClipState(c) === "rendering");
  async function create() {
    setSubmitting(true);
    try {
      const body = whiteboardRequest(asset.id, projectId, draw, hold, format, hand, finish);
      const { data, error } = await supabase.functions.invoke("whiteboard-animate", { body });
      if (error) {
        const detail = await error.context?.json?.().catch(() => null);
        throw new Error(detail?.error || error.message);
      }
      if (data?.error || !data?.clips?.[0]?.id) throw new Error(data?.error || data?.clips?.[0]?.error || "Drawing video could not be started.");
      onStarted();
      setOpen(false);
      toast.success("Drawing video started — your MP4 will appear in this project.");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSubmitting(false); }
  }
  return <>
    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Make drawing video from ${asset.name}`} title={pending ? "Drawing video in progress" : "Make drawing video"} disabled={pending || submitting || Boolean(asset.meta?.creating)} onClick={() => setOpen(true)}>
      {pending || submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PencilLine className="h-3.5 w-3.5" />}
    </Button>
    <Dialog open={open} onOpenChange={(value) => { if (!submitting) setOpen(value); }}>
      <DialogContent className="max-w-md">
        <DialogTitle>Make drawing video</DialogTitle>
        <DialogDescription className="break-all">{asset.name}</DialogDescription>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void create(); }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="wb-draw">Drawing time (seconds)</Label><Input id="wb-draw" type="number" min="1.5" max="30" step="0.1" required value={draw} onChange={(e) => setDraw(e.target.valueAsNumber)} /></div>
            <div className="space-y-2"><Label htmlFor="wb-hold">Hold time (seconds)</Label><Input id="wb-hold" type="number" min="0.3" max="5" step="0.1" required value={hold} onChange={(e) => setHold(e.target.valueAsNumber)} /></div>
          </div>
          <div className="space-y-2"><Label>Format</Label><Select value={format} onValueChange={setFormat}><SelectTrigger aria-label="Drawing video format"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="vertical">Vertical · 9:16</SelectItem><SelectItem value="horizontal">Horizontal · 16:9</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Finished picture</Label><Select value={finish} onValueChange={setFinish}><SelectTrigger aria-label="Finished picture"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="original">Original artwork</SelectItem><SelectItem value="lines">Drawn lines only</SelectItem></SelectContent></Select></div>
          <div className="flex items-center justify-between"><Label htmlFor="wb-hand">Pencil hand</Label><Switch id="wb-hand" checked={hand} onCheckedChange={setHand} /></div>
          <Button className="w-full" type="submit" disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PencilLine className="mr-2 h-4 w-4" />}{submitting ? "Starting…" : "Create MP4"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}