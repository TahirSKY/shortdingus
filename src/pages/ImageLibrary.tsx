import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload, Link2, Trash2, Copy, Loader2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useImageLibrary, useAddImage, useDeleteImage } from "@/hooks/use-image-library";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ImageLibrary() {
  const { data: images, isLoading } = useImageLibrary();
  const addImage = useAddImage();
  const deleteImage = useDeleteImage();

  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload file to storage then save to DB
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `library/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("images").upload(path, file);
        if (uploadErr) throw uploadErr;
        const { data: publicData } = supabase.storage.from("images").getPublicUrl(path);
        await addImage.mutateAsync({
          title: file.name.replace(/\.[^/.]+$/, ""),
          url: publicData.publicUrl,
          storage_path: path,
        });
      }
      toast.success(`${files.length} image(s) uploaded`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Download image from URL via proxy, upload to storage
  const handleUrlDownload = async () => {
    if (!pasteUrl.trim()) return;
    setIsDownloading(true);
    try {
      // Use the fetch-image edge function to proxy
      const { data: blob, error } = await supabase.functions.invoke("fetch-image", {
        body: { url: pasteUrl.trim() },
      });
      if (error) throw error;

      // blob is the raw response; convert to File
      const ext = pasteUrl.split(".").pop()?.split("?")[0]?.slice(0, 4) || "jpg";
      const path = `library/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("images").upload(path, blob);
      if (uploadErr) throw uploadErr;
      const { data: publicData } = supabase.storage.from("images").getPublicUrl(path);
      await addImage.mutateAsync({
        title: pasteTitle.trim() || "Downloaded image",
        url: publicData.publicUrl,
        storage_path: path,
      });
      toast.success("Image downloaded & saved");
      setUrlDialogOpen(false);
      setPasteUrl("");
      setPasteTitle("");
    } catch (err: any) {
      toast.error(err.message || "Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = (img: { id: string; storage_path: string | null }) => {
    deleteImage.mutate(img, {
      onSuccess: () => toast.success("Image deleted"),
      onError: (e) => toast.error(e.message),
    });
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/studio">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <ImagePlus className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold font-[Space_Grotesk]">Image Library</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setUrlDialogOpen(true)}>
            <Link2 className="w-4 h-4 mr-1" /> Paste URL
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </header>

      {/* Grid */}
      <main className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !images || images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <ImagePlus className="w-12 h-12 opacity-40" />
            <p className="text-sm">No images yet. Upload or paste a URL to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative rounded-lg overflow-hidden border border-border bg-card aspect-square"
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white hover:bg-white/20"
                      onClick={() => copyUrl(img.url)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-white/20"
                      onClick={() => handleDelete({ id: img.id, storage_path: img.storage_path })}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-white truncate">{img.title}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Paste URL Dialog */}
      <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download Image from URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Image URL</Label>
              <Input
                placeholder="https://example.com/photo.jpg"
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
              />
            </div>
            <div>
              <Label>Title (optional)</Label>
              <Input
                placeholder="My image"
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUrlDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUrlDownload} disabled={isDownloading || !pasteUrl.trim()}>
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Link2 className="w-4 h-4 mr-1" />}
              Download & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
