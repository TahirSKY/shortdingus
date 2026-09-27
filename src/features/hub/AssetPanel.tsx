import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Trash2, ScanSearch, ChevronDown, Upload, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ASSET_KINDS, ROLES, type Analysis, type Asset, type AssetGroup, type AssetKind, addTextAsset, assetUrl, deleteAsset,
  fmtBytes, fmtTime, listAssets, relTime, runAnalysis, updateAssetTags, uploadFile,
} from "@/features/hub/api";

const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

function AnalysisView({ a }: { a: Analysis }) {
  const [open, setOpen] = useState(false);
  if (a.status === "running" || a.status === "pending") return <p className="text-xs text-muted-foreground">{a.tool === "gemini-words" ? "Timing every word…" : "Analysing…"} this can take a minute.</p>;
  if (a.status === "error") return <p className="text-xs text-destructive">Failed: {a.error_message}</p>;
  const r = a.report as any;
  const beats = r?.beats || [];
  const words = r?.words || [];
  return (
    <div className="text-sm">
      <p className="text-muted-foreground">{a.tool === "gemini-words" ? "Words: " : ""}{a.summary}</p>
      {(beats.length > 0 || words.length > 0) && (
        <button onClick={() => setOpen(!open)} className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} /> {beats.length ? `${beats.length} beats` : `transcript + ${r.cuts?.length || 0} cuts`}
        </button>
      )}
      {open && beats.length > 0 && (
        <ul className="mt-2 space-y-1 font-mono text-xs">
          {beats.map((b: any, i: number) => <li key={i}><span className="text-muted-foreground">{fmtTime(b.start)} – {fmtTime(b.end)}</span> {b.label} — <span className="text-muted-foreground">{b.detail}</span></li>)}
        </ul>
      )}
      {open && words.length > 0 && (
        <div className="mt-2 space-y-2 text-xs">
          <p>{r.text}</p>
          {r.cuts?.length > 0 && <ul className="font-mono text-muted-foreground">{r.cuts.map((c: any, i: number) => <li key={i}>cut {c.start.toFixed(2)}s–{c.end.toFixed(2)}s · {c.reason}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}

function Preview({ asset }: { asset: Asset }) {
  const url = assetUrl(asset.id);
  if (asset.kind === "image") return <img src={url} alt={asset.name} className="h-12 w-12 rounded object-cover" loading="lazy" />;
  if (asset.kind === "video") return <video src={url} controls preload="none" className="h-24 rounded" />;
  if (asset.kind === "audio") return <audio src={url} controls preload="none" className="h-8 w-48" />;
  return null;
}

function TagEditor({ a, onSaved }: { a: Asset; onSaved: () => void }) {
  const [tags, setTags] = useState((a.tags || []).join(", "));
  const save = async (role: string | null, t = tags) => {
    try { await updateAssetTags(a.id, role, t.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean)); onSaved(); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Select value={a.role || "none"} onValueChange={(v) => save(v === "none" ? null : v)}>
        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="none">no type</SelectItem>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
      </Select>
      <input value={tags} onChange={(e) => setTags(e.target.value)} onBlur={() => tags !== (a.tags || []).join(", ") && save(a.role || null)} placeholder="tags, comma separated" className="h-7 min-w-0 flex-1 rounded border border-border bg-transparent px-2 text-xs outline-none" />
    </div>
  );
}

export default function AssetPanel({ group, projectId = null, title }: { group: AssetGroup; projectId?: string | null; title: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState(false);
  const [textName, setTextName] = useState("");
  const [textKind, setTextKind] = useState<AssetKind>("text");
  const [textBody, setTextBody] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: content, refetch } = useQuery({
    queryKey: ["assets", group.id, projectId],
    queryFn: () => listAssets(group.id, projectId),
    refetchInterval: (q) => (q.state.data?.analyses.some((a) => a.status === "running" || a.status === "pending") ? 5000 : false),
  });
  const refresh = useCallback(() => { refetch(); qc.invalidateQueries({ queryKey: ["groups"] }); }, [refetch, qc]);

  const handleFiles = async (files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      const key = `${f.name}-${f.size}-${Math.random()}`;
      setUploads((u) => ({ ...u, [key]: `Uploading ${f.name}…` }));
      try { await uploadFile(group, f, projectId); setUploads((u) => { const { [key]: _, ...rest } = u; return rest; }); refresh(); }
      catch (e) { setUploads((u) => ({ ...u, [key]: `Failed: ${f.name} — ${(e as Error).message}` })); }
    }
  };

  const all = content?.assets || [];
  const analyses = content?.analyses || [];
  const roles = [...new Set(all.map((a) => a.role).filter(Boolean))] as string[];
  const assets = filter === "all" ? all : all.filter((a) => a.role === filter);

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-sm text-muted-foreground transition-colors ${drag ? "border-foreground bg-muted" : "border-border hover:border-foreground/40"}`}
      >
        <Upload className="mb-2 h-5 w-5" /> Drop video, audio, images, text or JSON — or click to pick
        <input ref={fileRef} type="file" multiple hidden accept="video/*,audio/*,image/*,.txt,.md,.json,text/*,application/json" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      </div>
      {Object.entries(uploads).map(([k, msg]) => <p key={k} className="mt-2 text-xs text-muted-foreground">{msg}</p>)}

      <form className="mt-3 space-y-2 rounded-lg border border-border p-4" onSubmit={async (e) => {
        e.preventDefault();
        if (!textName.trim() || !textBody.trim()) return;
        try { await addTextAsset(group, textName.trim(), textKind, textBody, projectId); setTextName(""); setTextBody(""); refresh(); toast.success("Saved"); }
        catch (err) { toast.error((err as Error).message); }
      }}>
        <div className="flex gap-2">
          <Input value={textName} onChange={(e) => setTextName(e.target.value)} placeholder="Name, e.g. script.md" maxLength={200} />
          <Select value={textKind} onValueChange={(v) => setTextKind(v as AssetKind)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{ASSET_KINDS.filter((k) => !["video", "image", "audio"].includes(k)).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Textarea value={textBody} onChange={(e) => setTextBody(e.target.value)} placeholder="Idea, script, notes or code…" rows={3} className="font-mono text-xs" />
        <Button type="submit" size="sm" disabled={!textName.trim() || !textBody.trim()}>Save text</Button>
      </form>

      <div className="mb-3 mt-8 flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title} ({all.length})</h2>
        <div className="flex-1" />
        {roles.length > 0 && ["all", ...roles].map((r) => (
          <button key={r} onClick={() => setFilter(r)} className={`rounded-full border px-2 py-0.5 text-xs ${filter === r ? "border-foreground text-foreground" : "border-border text-muted-foreground"}`}>{r}</button>
        ))}
      </div>
      {assets.length === 0 ? <p className="text-sm text-muted-foreground">Nothing here yet.</p> : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {assets.map((a) => {
            const mine = analyses.filter((x) => x.asset_id === a.id);
            const busy = mine.some((x) => x.status === "running" || x.status === "pending");
            const desc = (a.meta as any)?.description;
            return (
              <div key={a.id} className="p-3">
                <div className="flex items-start gap-3">
                  <Preview asset={a} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-all text-sm">{a.name}</span>
                      <Badge variant="secondary" className="font-mono text-[10px]">{a.kind}</Badge>
                      <span className="text-xs text-muted-foreground">{a.duration_seconds ? `${Number(a.duration_seconds).toFixed(1)}s` : fmtBytes(a.size_bytes)} · {relTime(a.created_at)}</span>
                    </div>
                    {desc && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{desc}</p>}
                    <TagEditor a={a} onSaved={refresh} />
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Copy link" onClick={() => copy(assetUrl(a.id))}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Open" asChild><a href={assetUrl(a.id)} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                    {(a.kind === "video" || (a.kind === "image" && !(a.meta as any)?.creating)) && <Button size="icon" variant="ghost" className="h-7 w-7" title="Describe / analyse" disabled={busy} onClick={async () => {
                      try { await runAnalysis(a.id); refresh(); toast.success("Analysis started"); } catch (e) { toast.error((e as Error).message); }
                    }}><ScanSearch className="h-3.5 w-3.5" /></Button>}
                    {(a.kind === "video" || a.kind === "audio") && a.storage_path && <Button size="icon" variant="ghost" className="h-7 w-7" title="Time every word (captions + cuts)" disabled={busy} onClick={async () => {
                      try { await runAnalysis(a.id, "gemini-words"); refresh(); toast.success("Word timing started"); } catch (e) { toast.error((e as Error).message); }
                    }}><AudioLines className="h-3.5 w-3.5" /></Button>}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete" onClick={async () => {
                      if (!confirm(`Delete ${a.name}?`)) return;
                      try { await deleteAsset(a); refresh(); } catch (e) { toast.error((e as Error).message); }
                    }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {mine.length > 0 && <div className="mt-3 space-y-2 rounded bg-muted/30 p-3">{mine.map((x) => <AnalysisView key={x.id} a={x} />)}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
