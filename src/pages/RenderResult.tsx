import { useState, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Sparkles, BookmarkPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const RenderResult = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const singleUrl = params.get("url");
  const multiUrls = params.get("urls");
  const mode = params.get("mode") || "video";

  // Support both single and multi-page results
  const urls: string[] = multiUrls
    ? multiUrls.split(",").filter(Boolean)
    : singleUrl
      ? [singleUrl]
      : [];
  const url = urls[0] || null;
  const isMultiPage = urls.length > 1;

  const isImage = mode === "poster";
  const fileExt = isImage ? "png" : "mp4";
  const fileName = `remotion-${mode}.${fileExt}`;
  const [downloading, setDownloading] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const handleDownload = useCallback(async () => {
    if (urls.length === 0) return;
    setDownloading(true);
    try {
      for (let i = 0; i < urls.length; i++) {
        const pageUrl = urls[i];
        const pageName = isMultiPage
          ? `remotion-${mode}-page${i + 1}.${fileExt}`
          : fileName;
        const res = await fetch(pageUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = pageName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        // Small delay between downloads to avoid browser blocking
        if (isMultiPage && i < urls.length - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    } catch {
      if (url) window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  }, [urls, url, fileName, fileExt, mode, isMultiPage]);

  const handleSave = async () => {
    if (!url || !title.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("saved_renders" as any).insert({
        title: title.trim(),
        notes: notes.trim() || null,
        url,
        mode,
      });
      if (error) throw error;
      toast({ title: "Saved to library!", description: "You can find it in the Renders Library." });
      setSaved(true);
      setSaveOpen(false);
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!url) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">No render result found.</p>
        <Button asChild variant="outline">
          <Link to="/playground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Playground
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/30">
        <div className="flex items-center gap-3">
          <Link
            to="/playground"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Playground
          </Link>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {isImage ? (isMultiPage ? `Poster (${urls.length} pages)` : "Poster") : "Video"} Result
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setSaveOpen(true)}
            disabled={saved}
          >
            {saved ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <BookmarkPlus className="w-4 h-4 mr-2" />
            )}
            {saved ? "Saved" : "Save to Library"}
          </Button>
          <Button onClick={handleDownload} disabled={downloading} className="bg-gradient-primary hover:opacity-90 border-0 glow-primary">
            {downloading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isMultiPage ? `Download All (${urls.length})` : `Download ${fileExt.toUpperCase()}`}
          </Button>
        </div>
      </div>

      {/* Content preview */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div className="max-w-5xl w-full flex flex-col items-center gap-6">
          {isMultiPage ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
              {urls.map((pageUrl, i) => (
                <div key={i} className="relative group">
                  <img
                    src={pageUrl}
                    alt={`Page ${i + 1}`}
                    className="w-full rounded-lg border border-border shadow-md object-contain bg-muted/30"
                  />
                  <span className="absolute top-2 left-2 bg-background/80 text-foreground text-xs font-medium px-2 py-0.5 rounded">
                    Page {i + 1}
                  </span>
                </div>
              ))}
            </div>
          ) : isImage ? (
            <img
              src={url!}
              alt="Rendered poster"
              className="max-w-full max-h-[75vh] rounded-lg border border-border shadow-lg object-contain"
            />
          ) : (
            <video
              src={url!}
              controls
              autoPlay
              className="max-w-full max-h-[75vh] rounded-lg border border-border shadow-lg"
            />
          )}

          <p className="text-xs text-muted-foreground">
            {isMultiPage
              ? "Click Download All to save all pages individually."
              : `Right-click the ${isImage ? "image" : "video"} to save, or use the download button above.`}
          </p>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to Library</DialogTitle>
            <DialogDescription>
              Give this render a title and optional notes for future reference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Client A flythrough v2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any extra details…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RenderResult;
