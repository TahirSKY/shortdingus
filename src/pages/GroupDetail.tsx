import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Trash2, ScanSearch, ChevronDown, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import HubHeader from "@/components/HubHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  ASSET_KINDS, type Analysis, type Asset, type AssetGroup, type AssetKind, addTextAsset, assetUrl, deleteAsset, deleteGroup,
  fetchManifest, fmtBytes, fmtTime, getGroup, ingestUrl, listAssets, manifestUrl, relTime, runAnalysis, updateGroup, uploadFile,
} from "@/features/hub/api";

const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-10"><h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h2>{children}</section>;
}

function EditableText({ value, onSave, className, multiline, placeholder }: { value: string; onSave: (v: string) => void; className?: string; multiline?: boolean; placeholder?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => { if (v !== value) onSave(v); };
  return multiline
    ? <Textarea value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} placeholder={placeholder} className={className} rows={2} />
    : <input value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className={`w-full bg-transparent outline-none ${className}`} />;
}

function AnalysisView({ a }: { a: Analysis }) {
  const [open, setOpen] = useState(false);
  if (a.status === "running" || a.status === "pending") return <p className="text-xs text-muted-foreground">Analysing… this can take a minute.</p>;
  if (a.status === "error") return <p className="text-xs text-destructive">Analysis failed: {a.error_message}</p>;
  const beats = a.report?.beats || [];
  return (
    <div className="text-sm">
      <p className="text-muted-foreground">{a.summary}</p>
      {beats.length > 0 && (
        <button onClick={() => setOpen(!open)} className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} /> {beats.length} beats
        </button>
      )}
      {open && (
        <ul className="mt-2 space-y-1 font-mono text-xs">
          {beats.map((b, i) => <li key={i}><span className="text-muted-foreground">{fmtTime(b.start)} – {fmtTime(b.end)}</span> {b.label} — <span className="text-muted-foreground">{b.detail}</span></li>)}
        </ul>
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

export default function GroupDetail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState(false);
  const [textName, setTextName] = useState("");
  const [textKind, setTextKind] = useState<AssetKind>("text");
  const [textBody, setTextBody] = useState("");
  const [manifest, setManifest] = useState<string | null>(null);

  const { data: group, isLoading } = useQuery({ queryKey: ["group", slug], queryFn: () => getGroup(slug) });
  const { data: content, refetch } = useQuery({
    queryKey: ["assets", group?.id], enabled: !!group, queryFn: () => listAssets(group!.id),
    refetchInterval: (q) => (q.state.data?.analyses.some((a) => a.status === "running" || a.status === "pending") ? 5000 : false),
  });

  const refresh = useCallback(() => { refetch(); qc.invalidateQueries({ queryKey: ["groups"] }); }, [refetch, qc]);

  const handleFiles = async (files: FileList | File[]) => {
    if (!group) return;
    for (const f of Array.from(files)) {
      const key = `${f.name}-${f.size}-${Math.random()}`;
      setUploads((u) => ({ ...u, [key]: `Uploading ${f.name}…` }));
      try { await uploadFile(group, f); setUploads((u) => { const { [key]: _, ...rest } = u; return rest; }); refresh(); }
      catch (e) { setUploads((u) => ({ ...u, [key]: `Failed: ${f.name} — ${(e as Error).message}` })); }
    }
  };

  const save = async (patch: Partial<AssetGroup>) => {
    if (!group) return;
    try { await updateGroup(group.id, patch); qc.invalidateQueries({ queryKey: ["group", slug] }); } catch (e) { toast.error((e as Error).message); }
  };

  if (isLoading) return <div className="studio-theme min-h-screen bg-background" />;
  if (!group) return (
    <div className="studio-theme min-h-screen bg-background text-foreground"><HubHeader />
      <p className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">No group called “{slug}”. <Link to="/" className="underline">Back to groups</Link></p>
    </div>
  );

  const assets = content?.assets || [];
  const analyses = content?.analyses || [];

  return (
    <div className="studio-theme min-h-screen bg-background pb-20 text-foreground md:pb-0">
      <HubHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <EditableText value={group.title} onSave={(title) => title.trim() && save({ title: title.trim() })} className="text-2xl font-semibold" />
        <div className="mt-2 flex items-center gap-2">
          <code className="rounded bg-muted px-2 py-1 font-mono text-sm">{group.slug}</code>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(group.slug)} aria-label="Copy slug"><Copy className="h-3.5 w-3.5" /></Button>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => {
            if (!confirm(`Delete "${group.title}" and all its files?`)) return;
            try { await deleteGroup(group); qc.invalidateQueries({ queryKey: ["groups"] }); navigate("/"); } catch (e) { toast.error((e as Error).message); }
          }}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete group</Button>
        </div>
        <EditableText multiline value={group.notes || ""} onSave={(notes) => save({ notes })} placeholder="Notes for you or the agent…" className="mt-3" />

        {/* Add */}
        <Section title="Add assets">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground transition-colors ${drag ? "border-foreground bg-muted" : "border-border hover:border-foreground/40"}`}
          >
            <Upload className="mb-2 h-5 w-5" /> Drop video, audio, images, text or JSON — or click to pick
            <input ref={fileRef} type="file" multiple hidden accept="video/*,audio/*,image/*,.txt,.md,.json,text/*,application/json" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          </div>
          {Object.entries(uploads).map(([k, msg]) => <p key={k} className="mt-2 text-xs text-muted-foreground">{msg}</p>)}

          <form className="mt-4 space-y-2 rounded-lg border border-border p-4" onSubmit={async (e) => {
            e.preventDefault();
            if (!textName.trim() || !textBody.trim()) return;
            try { await addTextAsset(group, textName.trim(), textKind, textBody); setTextName(""); setTextBody(""); refresh(); toast.success("Saved"); }
            catch (err) { toast.error((err as Error).message); }
          }}>
            <div className="flex gap-2">
              <Input value={textName} onChange={(e) => setTextName(e.target.value)} placeholder="Name, e.g. idea.md" maxLength={200} />
              <Select value={textKind} onValueChange={(v) => setTextKind(v as AssetKind)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{ASSET_KINDS.filter((k) => !["video", "image", "audio"].includes(k)).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Textarea value={textBody} onChange={(e) => setTextBody(e.target.value)} placeholder="Idea, script, or code…" rows={4} className="font-mono text-xs" />
            <Button type="submit" size="sm" disabled={!textName.trim() || !textBody.trim()}>Save text asset</Button>
          </form>
        </Section>

        {/* Assets */}
        <Section title={`Assets (${assets.length})`}>
          {assets.length === 0 ? <p className="text-sm text-muted-foreground">Nothing here yet.</p> : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr><th className="p-3 font-normal">Name</th><th className="p-3 font-normal">Kind</th><th className="hidden p-3 font-normal md:table-cell">Type</th><th className="p-3 font-normal">Size / length</th><th className="hidden p-3 font-normal md:table-cell">Added</th><th className="p-3 text-right font-normal">Actions</th></tr>
                </thead>
                <tbody>
                  {assets.map((a) => {
                    const mine = analyses.filter((x) => x.asset_id === a.id);
                    const busy = mine.some((x) => x.status === "running" || x.status === "pending");
                    return [
                      <tr key={a.id} className="border-b border-border align-top last:border-0">
                        <td className="p-3"><div className="flex items-center gap-3"><Preview asset={a} /><span className="break-all">{a.name}</span></div></td>
                        <td className="p-3"><Badge variant="secondary" className="font-mono text-[10px]">{a.kind}</Badge></td>
                        <td className="hidden p-3 font-mono text-xs text-muted-foreground md:table-cell">{a.mime_type}</td>
                        <td className="p-3 text-xs text-muted-foreground">{a.duration_seconds ? `${Number(a.duration_seconds).toFixed(1)}s` : fmtBytes(a.size_bytes)}</td>
                        <td className="hidden p-3 text-xs text-muted-foreground md:table-cell">{relTime(a.created_at)}</td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Copy URL" onClick={() => copy(assetUrl(a.id))}><Copy className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Open" asChild><a href={assetUrl(a.id)} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                            {(a.kind === "video" || (a.kind === "image" && !(a.meta as any)?.creating)) && <Button size="icon" variant="ghost" className="h-7 w-7" title="Run analysis" disabled={busy} onClick={async () => {
                              try { await runAnalysis(a.id); refresh(); toast.success("Analysis started"); } catch (e) { toast.error((e as Error).message); }
                            }}><ScanSearch className="h-3.5 w-3.5" /></Button>}
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete" onClick={async () => {
                              if (!confirm(`Delete ${a.name}?`)) return;
                              try { await deleteAsset(a); refresh(); } catch (e) { toast.error((e as Error).message); }
                            }}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>,
                      ...(mine.length ? [<tr key={`${a.id}-an`} className="border-b border-border"><td colSpan={6} className="space-y-3 bg-muted/30 px-3 py-3">{mine.map((x) => <AnalysisView key={x.id} a={x} />)}</td></tr>] : []),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Agent access */}
        <Section title="Agent access">
          <div className="space-y-4 rounded-lg border border-border p-4 text-sm">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Read the whole group (GET)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-muted px-2 py-1 font-mono text-xs">{manifestUrl(group.slug)}</code>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(manifestUrl(group.slug))}><Copy className="h-3.5 w-3.5" /></Button>
              </div>
              <Button size="sm" variant="outline" className="mt-2" onClick={async () => {
                if (manifest) return setManifest(null);
                try { setManifest(JSON.stringify(await fetchManifest(group.slug), null, 2)); } catch (e) { toast.error((e as Error).message); }
              }}>{manifest ? "Hide manifest" : "Preview manifest"}</Button>
              {manifest && <pre className="mt-2 max-h-96 overflow-auto rounded bg-muted p-3 font-mono text-xs">{manifest}</pre>}
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Add files back (POST)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-muted px-2 py-1 font-mono text-xs">{ingestUrl}</code>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(ingestUrl)}><Copy className="h-3.5 w-3.5" /></Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Send JSON with <code className="font-mono">token</code>, <code className="font-mono">slug: "{group.slug}"</code>, <code className="font-mono">kind</code>, <code className="font-mono">name</code>, and either <code className="font-mono">sourceUrl</code> or <code className="font-mono">inlineContent</code>. The token is a private write key stored in the app's secrets as HUB_WRITE_TOKEN — give it only to agents you trust.
              </p>
            </div>
          </div>
        </Section>
      </main>
      <MobileBottomNav />
    </div>
  );
}
