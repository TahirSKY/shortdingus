import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Player } from "@remotion/player";
import { Lottie } from "@remotion/lottie";
import { Play, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { addTextAsset, assetUrl, getProject, type Asset, type AssetGroup } from "./api";
import { lottieCode, readLottie } from "./lottie";

function Animation({ data }: { data: React.ComponentProps<typeof Lottie>["animationData"] }) {
  return <Lottie animationData={data} loop={false} className="h-full w-full" />;
}

export default function LottiePreview({ asset, group }: { asset: Asset; group: AssetGroup }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, error, isPending } = useQuery({
    queryKey: ["lottie-preview", asset.id], enabled: open,
    queryFn: async () => {
      const response = await fetch(assetUrl(asset.id));
      if (!response.ok) throw new Error("Could not load the animation.");
      const animation = await response.json();
      return { animation, config: readLottie(animation) };
    },
  });
  const useInEditor = async () => {
    if (!data || !asset.project_id) return;
    setSaving(true);
    try {
      // Resolve the existing project, without assuming its slug from its name.
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: row, error: lookupError } = await supabase.from("projects").select("slug").eq("id", asset.project_id).single();
      if (lookupError) throw lookupError;
      const project = await getProject(group.id, row.slug);
      if (!project) throw new Error("Project not found.");
      await addTextAsset(group, `${asset.name} — animation.tsx`, "code", lottieCode(assetUrl(asset.id), data.animation), project.id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["assets", group.id, project.id] }),
        qc.invalidateQueries({ queryKey: ["editor-code", project.id] }),
      ]);
      navigate(`/groups/${group.slug}/p/${project.slug}/editor`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };
  return <>
    <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><Play className="mr-1 h-3.5 w-3.5" />Preview animation</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle className="break-all pr-6">{asset.name}</DialogTitle></DialogHeader>
        {isPending && <p className="text-sm text-muted-foreground">Loading animation…</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
        {data && <>
          <div className="overflow-hidden rounded border border-border bg-muted">
            <Player component={Animation} inputProps={{ data: data.animation }} compositionWidth={data.config.width} compositionHeight={data.config.height} fps={data.config.fps} durationInFrames={data.config.frames} controls loop style={{ width: "100%", aspectRatio: `${data.config.width}/${data.config.height}` }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{data.config.width} × {data.config.height} · {data.config.fps} fps · {(data.config.frames / data.config.fps).toFixed(2)}s</p>
            {asset.project_id && <Button disabled={saving} onClick={useInEditor}><Scissors className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Use in editor"}</Button>}
          </div>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}