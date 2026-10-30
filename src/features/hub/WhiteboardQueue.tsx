import { useState } from "react";
import { Loader2, PencilLine, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Asset } from "./api";
import { pendingWhiteboardImages, whiteboardClipState } from "./whiteboard";

export default function WhiteboardQueue({ assets, projectId, refresh }: { assets: Asset[]; projectId: string; refresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const pending = pendingWhiteboardImages(assets);
  const clips = assets.filter(a => a.tags?.includes("whiteboard-clip"));
  const queued = clips.filter(a => whiteboardClipState(a) === "queued").length;
  const rendering = clips.filter(a => whiteboardClipState(a) === "rendering").length;
  const ready = clips.filter(a => whiteboardClipState(a) === "ready").length;
  async function start(resume = false) {
    setBusy(true);
    try {
      const batches = resume ? [{ projectId, action: "resume" }] : Array.from({ length: Math.ceil(pending.length / 12) }, (_, i) => ({ projectId, format: "vertical", clips: pending.slice(i * 12, i * 12 + 12).map(a => ({ assetId: a.id })) }));
      for (const body of batches) {
        const { data, error } = await supabase.functions.invoke("whiteboard-animate", { body });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        const failed = data.clips?.filter((c: any) => c.error);
        if (failed?.length) throw new Error(failed.map((c: any) => c.error).join("; "));
      }
      toast.success(resume ? "Drawing queue resumed." : "Drawings queued — one render at a time.");
    } catch (e) { toast.error((e as Error).message); }
    finally { refresh(); setBusy(false); }
  }
  return <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-border pb-4">
    <span className="text-xs text-muted-foreground" role="status">{ready} ready · {rendering} rendering · {queued} queued{pending.length ? ` · ${pending.length} images waiting` : ""}</span>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" disabled={busy || !pending.length} onClick={() => void start()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PencilLine className="mr-2 h-4 w-4" />}Render pending drawings</Button>
      {(queued > 0 || rendering > 0) && <Button size="sm" variant="outline" disabled={busy} onClick={() => void start(true)}><Play className="mr-2 h-4 w-4" />Resume queue</Button>}
    </div>
  </div>;
}