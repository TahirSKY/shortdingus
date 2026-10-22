import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, ExternalLink, Film, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listAssets, type AssetGroup } from "./api";
import { saveMedia, searchMedia, type MediaResult, type MediaSource, type MediaType } from "./media-search";

export default function MediaBrowser({ group, projectId }: { group: AssetGroup; projectId: string }) {
  const qc = useQueryClient();
  const [source, setSource] = useState<MediaSource>("pexels");
  const [type, setType] = useState<MediaType>("video");
  const [orientation, setOrientation] = useState("any");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, MediaResult>>({});
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const request = useRef(0);
  const savingRef = useRef(false);
  const { data: assets } = useQuery({ queryKey: ["assets", group.id, projectId], queryFn: () => listAssets(group.id, projectId) });
  const saved = new Set((assets?.assets || []).map((a) => `${a.meta.media_source}:${a.meta.media_id}`));
  const key = (r: MediaResult) => `${r.source}:${r.id}`;
  const reset = () => { request.current++; setResults([]); setPage(0); setError(""); setBusy(false); };
  const search = async (nextPage = 1) => {
    const q = (nextPage === 1 ? query : lastQuery).trim();
    if (!q) return;
    const current = ++request.current;
    setBusy(true); setError("");
    try {
      const data = await searchMedia({ projectId, source, type, orientation, q, page: nextPage });
      if (current !== request.current) return;
      setResults(data.results); setPage(data.page); setHasMore(data.hasMore); setLastQuery(q);
    } catch (e) { if (current === request.current) { setError((e as Error).message); setResults([]); } }
    finally { if (current === request.current) setBusy(false); }
  };
  const add = async (picks: MediaResult[]) => {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true);
    let count = 0;
    try {
      for (const [i, r] of picks.entries()) {
        if (saved.has(key(r))) continue;
        setProgress(`Downloading ${i + 1} of ${picks.length}…`);
        try {
          await saveMedia(r, group, projectId, (p) => setProgress(`Saving ${i + 1} of ${picks.length}… ${Math.round(p * 100)}%`));
          count++;
          setSelected((s) => { const next = { ...s }; delete next[key(r)]; return next; });
          await qc.invalidateQueries({ queryKey: ["assets", group.id, projectId] });
        } catch (e) { toast.error(`${r.title}: ${(e as Error).message}`); }
      }
      if (count) toast.success(`Added ${count} ${count === 1 ? "file" : "files"} to project`);
      qc.invalidateQueries({ queryKey: ["groups"] });
    } finally { setSaving(false); savingRef.current = false; setProgress(""); }
  };
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="secondary" size="sm"><Film className="mr-2 h-4 w-4" /> Find B-roll & GIFs</Button></DialogTrigger>
      <DialogContent className="studio-theme flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl flex-col overflow-hidden text-foreground">
        <div className="pr-6"><DialogTitle>Find B-roll & GIFs</DialogTitle><DialogDescription className="sr-only">Search Pexels and GIPHY for project media</DialogDescription></div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Media provider">
          {(["pexels", "giphy"] as const).map((s) => <Button key={s} size="sm" variant={source === s ? "default" : "secondary"} aria-pressed={source === s} onClick={() => { setSource(s); setType(s === "pexels" ? "video" : "gifs"); reset(); }}>{s === "pexels" ? "Pexels" : "GIPHY"}</Button>)}
        </div>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); search(); }}>
          <Input aria-label="Search media" placeholder={source === "pexels" ? "Search B-roll…" : "Search GIFs…"} value={query} maxLength={50} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 basis-40" />
          <Select value={type} onValueChange={(v) => { setType(v as MediaType); reset(); }}><SelectTrigger className="w-28" aria-label="Media type"><SelectValue /></SelectTrigger><SelectContent>{(source === "pexels" ? [["video", "Videos"], ["photo", "Photos"]] : [["gifs", "GIFs"], ["stickers", "Stickers"]]).map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}</SelectContent></Select>
          {source === "pexels" && <Select value={orientation} onValueChange={(v) => { setOrientation(v); reset(); }}><SelectTrigger className="w-32" aria-label="Orientation"><SelectValue /></SelectTrigger><SelectContent>{[["any", "All shapes"], ["portrait", "Vertical"], ["landscape", "Horizontal"], ["square", "Square"]].map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}</SelectContent></Select>}
          <Button type="submit" disabled={busy || !query.trim()}><Search className="mr-2 h-4 w-4" />Search</Button>
        </form>
        <div className="min-h-40 flex-1 overflow-y-auto" aria-live="polite">
          {busy ? <div className="flex h-40 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Searching…</div> : error ? <p role="alert" className="break-words py-8 text-sm text-destructive">{error}</p> : results.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">{page ? `No results for “${lastQuery}”.` : "Pexels · GIPHY"}</p> : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((r) => {
                const id = key(r), isSaved = saved.has(id), checked = Boolean(selected[id]);
                return <article key={id} className={`overflow-hidden rounded-lg border bg-card ${checked ? "border-primary" : "border-border"}`}>
                  <div className="aspect-video overflow-hidden bg-muted">
                    {r.kind === "video" ? <video src={r.url} poster={r.preview} controls muted playsInline preload="none" className="h-full w-full object-contain" aria-label={r.title} /> : <img src={r.source === "giphy" ? r.url : r.preview} alt={r.title} loading="lazy" className="h-full w-full object-contain" />}
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="truncate text-sm font-medium" title={r.title}>{r.title}</p>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><a href={r.pageUrl} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1 hover:text-foreground"><span className="truncate">{r.credit}</span><ExternalLink className="h-3 w-3 shrink-0" /></a><span className="shrink-0">{r.duration ? `${r.duration}s · ` : ""}{r.width}×{r.height}</span></div>
                    <div className="flex items-center gap-2"><label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-xs"><input type="checkbox" aria-label={`Select ${r.title}`} checked={checked} disabled={saving || isSaved} onChange={() => setSelected((s) => { const next = { ...s }; if (next[id]) delete next[id]; else next[id] = r; return next; })} className="h-4 w-4 accent-primary" />Select</label><Button size="sm" variant={isSaved ? "ghost" : "secondary"} disabled={saving || isSaved} onClick={() => add([r])}>{isSaved ? <Check className="mr-1 h-3.5 w-3.5" /> : <Plus className="mr-1 h-3.5 w-3.5" />}{isSaved ? "Added" : "Add"}</Button></div>
                  </div>
                </article>;
              })}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex items-center gap-2"><Button variant="ghost" size="icon" aria-label="Previous page" disabled={busy || page <= 1} onClick={() => search(page - 1)}><ChevronLeft className="h-4 w-4" /></Button><span className="text-xs text-muted-foreground">{page ? `Page ${page}` : ""}</span><Button variant="ghost" size="icon" aria-label="Next page" disabled={busy || !hasMore || !page} onClick={() => search(page + 1)}><ChevronRight className="h-4 w-4" /></Button></div>
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground" role="status">{progress}</span>{Object.keys(selected).length > 0 && <Button variant="ghost" size="sm" disabled={saving} onClick={() => setSelected({})}>Clear selection</Button>}<Button disabled={saving || !Object.keys(selected).length} onClick={() => add(Object.values(selected))}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Add selected ({Object.keys(selected).length})</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}