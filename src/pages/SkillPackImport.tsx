import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Archive, ArrowDownToLine, Check, ChevronRight, CircleAlert, FileCode2, FileImage, FileText, FolderOpen,
  LoaderCircle, ShieldCheck, Upload, X,
} from "lucide-react";
import HubHeader from "@/components/HubHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CopyRow } from "@/features/hub/shared";
import { createGroup, listGroups, listSkills, manifestUrl, type AssetGroup } from "@/features/hub/api";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  buildPackStyleNote, formatBytes, importedSkillDescription, mergePackStyleGuide, parsePackFiles,
  slugForPackFile, slugify, type PackEntry, type ParsedPack,
} from "@/lib/skill-pack-import";

type ImportedSkillRow = Pick<Database["public"]["Tables"]["skills"]["Row"], "id" | "group_id" | "slug" | "source" | "name">;
type ImportedAssetRow = Pick<Database["public"]["Tables"]["assets"]["Row"], "id" | "storage_path" | "name" | "meta">;
const db = supabase;
const packSource = (groupSlug: string, path: string) => `shortdingus-pack:${groupSlug}:${path}`;
const fileBaseName = (path: string) => path.split("/").pop() || path;
const safeStorageName = (name: string) => name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-").replace(/-+/g, "-").slice(0, 100) || "reference";
const kindForMime = (mime: string): "image" | "audio" | "video" | "text" =>
  mime.startsWith("image/") ? "image" : mime.startsWith("audio/") ? "audio" : mime.startsWith("video/") ? "video" : "text";
const isPrimarySkill = (path: string) => fileBaseName(path).toLowerCase() === "skill.md";

interface ImportResult {
  group: AssetGroup;
  skills: number;
  assets: number;
  primarySkillName: string | null;
}

function asBlob(entry: PackEntry) {
  return new Blob([entry.bytes.slice().buffer as ArrayBuffer], { type: entry.mimeType });
}

export default function SkillPackImport() {
  const qc = useQueryClient();
  const zipRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const { data: groups = [], isLoading: groupsLoading, error: groupsError } = useQuery({ queryKey: ["groups"], queryFn: listGroups });
  const [parsed, setParsed] = useState<ParsedPack | null>(null);
  const [destinationId, setDestinationId] = useState("new");
  const [recentlyCreatedGroup, setRecentlyCreatedGroup] = useState<AssetGroup | null>(null);
  const [newHubTitle, setNewHubTitle] = useState("NextPhase Persa Shorts");
  const [addStyleIndex, setAddStyleIndex] = useState(true);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const selectedGroup = useMemo(() => groups.find((group) => group.id === destinationId) || (recentlyCreatedGroup?.id === destinationId ? recentlyCreatedGroup : null), [groups, destinationId, recentlyCreatedGroup]);
  const textCount = parsed?.entries.filter((entry) => entry.kind === "text").length || 0;
  const binaryCount = parsed?.entries.filter((entry) => entry.kind === "binary").length || 0;

  const loadFiles = async (files: File[]) => {
    if (!files.length) return;
    setReading(true);
    setResult(null);
    try {
      const next = await parsePackFiles(files);
      setParsed(next);
      setNewHubTitle(next.name);
      setAddStyleIndex(true);
      toast.success(`${next.entries.length} files ready to import`);
    } catch (error) {
      setParsed(null);
      toast.error((error as Error).message || "Could not read that pack.");
    } finally {
      setReading(false);
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    void loadFiles(files);
  };

  const importPack = async () => {
    if (!parsed?.entries.length || busy) return;
    if (destinationId === "new" && !newHubTitle.trim()) {
      toast.error("Give the new hub a name first.");
      return;
    }

    setBusy(true);
    setProgress("Preparing the destination hub…");
    setResult(null);
    let completedSkills = 0;
    let completedAssets = 0;
    try {
      let group: AssetGroup | null = selectedGroup;
      if (destinationId === "new") {
        group = await createGroup(newHubTitle.trim() || parsed.name);
        setRecentlyCreatedGroup(group);
        setDestinationId(group.id);
        await qc.invalidateQueries({ queryKey: ["groups"] });
      }
      if (!group) throw new Error("Choose a hub or create a new one.");

      const [savedSkills, assetResult] = await Promise.all([
        listSkills(group.id),
        db.from("assets").select("id, storage_path, name, meta").eq("group_id", group.id).is("project_id", null),
      ]);
      if (assetResult.error) throw assetResult.error;

      const currentSkills = savedSkills as ImportedSkillRow[];
      const currentAssets = (assetResult.data || []) as ImportedAssetRow[];
      const importedSkillSlugs: string[] = [];
      let primarySkillName: string | null = null;
      const total = parsed.entries.length;

      for (const [index, entry] of parsed.entries.entries()) {
        setProgress(`Importing ${index + 1} of ${total}: ${entry.path}`);
        if (entry.kind === "text") {
          const source = packSource(group.slug, entry.path);
          const previous = currentSkills.find((skill) => skill.group_id === group.id && skill.source === source);
          const primaryHasDefaultSlug = currentSkills.some((skill) => skill.slug === group.slug);
          const slug = previous?.slug || (isPrimarySkill(entry.path) && !primaryHasDefaultSlug ? group.slug : slugForPackFile(group.slug, entry.path));
          const name = `${parsed.name} · ${entry.path}`.slice(0, 120);
          const description = importedSkillDescription(parsed.name, entry.path);
          const body = entry.text ?? "";
          if (previous) {
            const { error } = await db.from("skills").update({ name, description, body, source }).eq("id", previous.id);
            if (error) throw new Error(`Could not update ${entry.path}: ${error.message}`);
            previous.name = name;
          } else {
            const { data, error } = await db.from("skills").insert({ group_id: group.id, slug, name, description, body, source }).select("id, group_id, slug, source, name").single();
            if (error) throw new Error(`Could not save ${entry.path}: ${error.message}`);
            currentSkills.push(data);
          }
          importedSkillSlugs.push(slug);
          completedSkills += 1;
          if (isPrimarySkill(entry.path)) primarySkillName = name;
          continue;
        }

        const existing = currentAssets.find((asset) => {
          const assetMeta = asset.meta;
          return typeof assetMeta === "object" && assetMeta !== null && !Array.isArray(assetMeta)
            && assetMeta.import_pack_slug === group.slug && assetMeta.source_path === entry.path;
        });
        const id = existing?.id || crypto.randomUUID();
        const assetName = `${parsed.name}/${entry.path}`.slice(0, 200);
        const storagePath = `groups/${group.slug}/${id}-${Date.now()}-${safeStorageName(fileBaseName(entry.path))}`;
        const { error: uploadError } = await supabase.storage.from("hub-media").upload(storagePath, asBlob(entry), { contentType: entry.mimeType, upsert: false });
        if (uploadError) throw new Error(`Could not upload ${entry.path}: ${uploadError.message}`);

        const mimeType = entry.mimeType || "application/octet-stream";
        const assetKind = kindForMime(mimeType);
        const existingMeta = existing?.meta;
        const priorMeta = existingMeta && typeof existingMeta === "object" && !Array.isArray(existingMeta) ? existingMeta : {};
        const meta: Json = { ...priorMeta, imported_from: "skill-pack", import_pack_slug: group.slug, pack_name: parsed.name, source_path: entry.path };
        if (existing) {
          const { error } = await db.from("assets").update({ name: assetName, storage_path: storagePath, mime_type: mimeType, size_bytes: entry.size, kind: assetKind, role: "reference", tags: ["skill-pack", group.slug], meta }).eq("id", id);
          if (error) {
            await supabase.storage.from("hub-media").remove([storagePath]);
            throw new Error(`Could not update ${entry.path}: ${error.message}`);
          }
          if (existing.storage_path) await supabase.storage.from("hub-media").remove([existing.storage_path]);
          existing.storage_path = storagePath;
          existing.meta = meta;
        } else {
          const { error } = await db.from("assets").insert({
            id, group_id: group.id, kind: assetKind, role: "reference", tags: ["skill-pack", group.slug],
            name: assetName, storage_path: storagePath, mime_type: mimeType,
            size_bytes: entry.size, meta,
          });
          if (error) {
            await supabase.storage.from("hub-media").remove([storagePath]);
            throw new Error(`Could not save ${entry.path}: ${error.message}`);
          }
          currentAssets.push({ id, storage_path: storagePath, name: assetName, meta });
        }
        completedAssets += 1;
      }

      if (addStyleIndex) {
        setProgress("Adding the pack index to this hub’s style guide…");
        const latestGroup = await db.from("asset_groups").select("style_guide").eq("id", group.id).single();
        if (latestGroup.error) throw latestGroup.error;
        const primarySlug = parsed.entries.find((entry) => entry.kind === "text" && isPrimarySkill(entry.path))
          ? importedSkillSlugs[parsed.entries.filter((entry) => entry.kind === "text").findIndex((entry) => isPrimarySkill(entry.path))]
          : null;
        const note = buildPackStyleNote(parsed.name, primarySlug, importedSkillSlugs);
        const styleGuide = mergePackStyleGuide(latestGroup.data?.style_guide || "", group.slug, note);
        const { error } = await db.from("asset_groups").update({ style_guide: styleGuide }).eq("id", group.id);
        if (error) throw new Error(`Files were imported, but the hub style index could not be saved: ${error.message}`);
      }

      setProgress("");
      setResult({ group, skills: completedSkills, assets: completedAssets, primarySkillName });
      setDestinationId(group.id);
      await qc.invalidateQueries({ queryKey: ["groups"] });
      await qc.invalidateQueries({ queryKey: ["group", group.slug] });
      await qc.invalidateQueries({ queryKey: ["skills", group.id] });
      toast.success(`Imported ${completedSkills + completedAssets} files into ${group.title}`);
    } catch (error) {
      setProgress("");
      toast.error((error as Error).message || "The pack could not be imported.", { duration: 10000 });
      if (completedSkills || completedAssets) {
        toast.message(`${completedSkills} text files and ${completedAssets} reference files were saved before the error. Re-importing is safe; matching pack files will be updated.`, { duration: 10000 });
      }
    } finally {
      setBusy(false);
    }
  };

  const clearPack = () => {
    setParsed(null);
    setResult(null);
    setProgress("");
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void loadFiles(Array.from(event.dataTransfer.files || []));
  };

  return (
    <div className="studio-theme min-h-screen bg-background pb-20 text-foreground md:pb-0">
      <HubHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary"><Archive className="h-3.5 w-3.5" /> ShortDingus utility</p>
          <h1 className="text-3xl font-semibold tracking-tight">Import an editing pack</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Bring in the whole folder at once. Rule documents, stylesheets, JSON and scripts become readable hub skills; images and other media become library references.</p>
        </div>

        <section className="mb-6 rounded-lg border border-border bg-card/50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Stored inside ShortDingus, ready for the editor agent</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">This imports into the selected hub’s ShortDingus database and media library, not the GitHub source tree. No GitHub token is placed in the browser. Imported scripts are saved as reference text and are never executed.</p>
            </div>
          </div>
        </section>

        {groupsError && <div className="mb-5 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><CircleAlert className="h-4 w-4" />Could not load hubs: {(groupsError as Error).message}</div>}

        <section className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6">
          <div>
            <Label htmlFor="pack-destination" className="text-sm font-medium">1. Where should it go?</Label>
            <Select value={destinationId} onValueChange={setDestinationId} disabled={groupsLoading || busy}>
              <SelectTrigger id="pack-destination" className="mt-2"><SelectValue placeholder={groupsLoading ? "Loading hubs…" : "Choose a hub"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Create a new hub for this pack</SelectItem>
                {groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.title} <span className="ml-2 text-muted-foreground">/{group.slug}</span></SelectItem>)}
              </SelectContent>
            </Select>
            {destinationId === "new" && (
              <div className="mt-3">
                <Label htmlFor="new-hub-title" className="text-xs text-muted-foreground">New hub name</Label>
                <Input id="new-hub-title" className="mt-1" value={newHubTitle} onChange={(event) => setNewHubTitle(event.target.value)} maxLength={100} placeholder="NextPhase Persa Shorts" disabled={busy} />
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium">2. Select the ZIP, folder, or files</Label>
            <div
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
              onDrop={onDrop}
              className={`mt-2 rounded-xl border border-dashed p-6 text-center transition-colors sm:p-8 ${dragging ? "border-primary bg-primary/5" : "border-border bg-background/40"}`}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Upload className="h-5 w-5 text-primary" /></div>
              <p className="mt-3 text-sm font-medium">Drop a ZIP or files here</p>
              <p className="mt-1 text-xs text-muted-foreground">Or use a picker. Folder selection keeps nested files together.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button type="button" size="sm" variant="default" onClick={() => zipRef.current?.click()} disabled={reading || busy}><Archive className="mr-1.5 h-3.5 w-3.5" />Choose ZIP</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => folderRef.current?.click()} disabled={reading || busy}><FolderOpen className="mr-1.5 h-3.5 w-3.5" />Choose folder</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => filesRef.current?.click()} disabled={reading || busy}><FileText className="mr-1.5 h-3.5 w-3.5" />Choose files</Button>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">ZIP up to 25 MB · pack up to 100 MB · 100 files max · text/scripts up to 2 MB total. Secret-key files and operating-system junk are skipped and listed.</p>
            </div>
            <input ref={zipRef} type="file" accept=".zip,application/zip,application/x-zip-compressed" hidden onChange={handleInput} />
            <input ref={folderRef} type="file" multiple hidden onChange={handleInput} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} />
            <input ref={filesRef} type="file" multiple hidden onChange={handleInput} />
          </div>

          {reading && <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm"><LoaderCircle className="h-4 w-4 animate-spin" />Reading and checking the pack in your browser…</div>}

          {parsed && !reading && (
            <div className="rounded-lg border border-border">
              <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{parsed.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{parsed.entries.length} files · {formatBytes(parsed.totalBytes)} · {textCount} text/rule files · {binaryCount} media/reference files</p>
                </div>
                <Badge variant="secondary">Preview ready</Badge>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={clearPack} disabled={busy} aria-label="Clear selected pack"><X className="h-4 w-4" /></Button>
              </div>
              <div className="max-h-72 divide-y divide-border overflow-auto">
                {parsed.entries.map((entry) => (
                  <div key={entry.path} className="flex items-center gap-3 px-4 py-2.5">
                    {entry.kind === "text"
                      ? (/(?:\.py|\.sh|\.css|\.json|\.js|\.ts|\.html?)$/i.test(entry.path) ? <FileCode2 className="h-4 w-4 shrink-0 text-muted-foreground" /> : <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />)
                      : entry.mimeType.startsWith("image/") ? <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ArrowDownToLine className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs" title={entry.path}>{entry.path}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.kind === "text" ? "Saved as a hub skill" : "Saved as a library reference"} · {entry.mimeType}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(entry.size)}</span>
                  </div>
                ))}
              </div>
              {parsed.skipped.length > 0 && (
                <details className="border-t border-border px-4 py-3">
                  <summary className="cursor-pointer text-xs text-amber-500">{parsed.skipped.length} file(s) skipped for safety</summary>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{parsed.skipped.map((path) => <li key={path} className="break-all font-mono">{path}</li>)}</ul>
                </details>
              )}
            </div>
          )}

          {parsed && !reading && (
            <div className="rounded-lg border border-border bg-background/40 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Make the rules easy for the agent to find</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Add a small index to the hub’s Style guide pointing to the pack’s primary skill and source files. Existing style text is kept, not replaced.</p>
                </div>
                <Switch id="pack-style-index" checked={addStyleIndex} onCheckedChange={setAddStyleIndex} disabled={busy} />
              </div>
              <Label htmlFor="pack-style-index" className="mt-3 block cursor-pointer text-xs text-muted-foreground">Add/update the pack index in the destination hub</Label>
            </div>
          )}

          {busy && (
            <div className="flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
              <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <span className="min-w-0 break-words">{progress}</span>
            </div>
          )}

          {result && (
            <div className="space-y-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"><Check className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Pack imported to {result.group.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{result.skills} readable skills/rules · {result.assets} library references. {result.primarySkillName ? `Primary file: ${fileBaseName(result.primarySkillName)}.` : "No SKILL.md was found; the source files are still available as skills."}</p>
                </div>
              </div>
              <CopyRow label="Agent manifest — paste this link into the chat so the pack can be read" value={manifestUrl(result.group.slug)} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild><Link to={`/groups/${result.group.slug}`}>Open hub <ChevronRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
                <Button size="sm" variant="outline" onClick={() => { setResult(null); setParsed(null); }}>Import another pack</Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <p className="max-w-lg text-xs leading-5 text-muted-foreground">Imported files are stored in ShortDingus and exposed through the hub manifest. This feature does not write commits to GitHub; a GitHub App/OAuth integration would be required for safe repository writes.</p>
            <Button type="button" onClick={importPack} disabled={!parsed?.entries.length || reading || busy || groupsLoading || (destinationId === "new" && !newHubTitle.trim())}>
              {busy ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Importing…</> : <>Import pack to hub <ChevronRight className="ml-1 h-4 w-4" /></>}
            </Button>
          </div>
        </section>
      </main>
      <MobileBottomNav />
    </div>
  );
}
