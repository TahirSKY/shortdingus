import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Upload, Link as LinkIcon, Copy, Download, Trash2, Plus, Image as ImageIcon, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "images";
const BASE_URL = `https://rfbrxohavioeaexhztxa.supabase.co/storage/v1/object/public/${BUCKET}/`;

interface StoredImage {
  name: string;
  url: string;
}

function sanitizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 50);
}

function randomChars(n: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < n; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

const ImageLibrary = () => {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [label, setLabel] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchImages = useCallback(async () => {
    const { data, error } = await supabase.storage.from(BUCKET).list("", {
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) {
      toast({ title: "Error loading images", description: error.message, variant: "destructive" });
      return;
    }
    const imgs = (data || [])
      .filter((f) => f.name && !f.name.startsWith("."))
      .map((f) => ({ name: f.name, url: `${BASE_URL}${f.name}` }));
    setImages(imgs);
    setLoading(false);
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const generateFilename = (lbl: string) => {
    const sanitized = sanitizeLabel(lbl) || "image";
    return `${sanitized}_${randomChars(6)}.jpg`;
  };

  const uploadBlob = async (blob: Blob, filename: string) => {
    const { error } = await supabase.storage.from(BUCKET).upload(filename, blob, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (error) throw error;
  };

  const handleAddFromUrl = async () => {
    if (!imageUrl.trim()) { toast({ title: "Please enter an image URL" }); return; }
    if (!label.trim()) { toast({ title: "Please enter a label" }); return; }

    setUploading(true);
    try {
      const res = await supabase.functions.invoke("fetch-image", {
        body: { url: imageUrl.trim() },
      });
      if (res.error) throw new Error(res.error.message || "Failed to fetch image");

      const blob = new Blob([res.data], { type: "image/jpeg" });
      const filename = generateFilename(label);
      await uploadBlob(blob, filename);

      setImageUrl("");
      setLabel("");
      toast({ title: "Image added!", description: filename });
      fetchImages();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!label.trim()) { toast({ title: "Please enter a label first" }); return; }

    setUploading(true);
    try {
      const filename = generateFilename(label);
      const blob = new Blob([await file.arrayBuffer()], { type: "image/jpeg" });
      await uploadBlob(blob, filename);

      setLabel("");
      toast({ title: "Image uploaded!", description: filename });
      fetchImages();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (name: string) => {
    const { error } = await supabase.storage.from(BUCKET).remove([name]);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Image deleted" });
    fetchImages();
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyForLLM = () => {
    const block = `IMAGE BASE URL: ${BASE_URL}\n\nUploaded images (download and upload these to this chat):\n${images.map((img) => `- ${img.name}`).join("\n")}\n\nTo use in code: {BASE_URL} + filename\nExample: ${BASE_URL}${images[0]?.name || "example_a1b2c3.jpg"}`;
    navigator.clipboard.writeText(block);
    toast({ title: "Copied for LLM!" });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <span className="text-lg font-bold text-foreground">Remotion Playground</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/playground" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Playground</Link>
          <Link to="/examples" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Examples</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Header + Base URL */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Image Library</h1>
          <p className="text-muted-foreground mb-4">Upload images and get clean URLs for your LLM-generated Remotion videos.</p>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border font-mono text-sm break-all">
            <span className="text-muted-foreground">Base URL:</span>
            <span className="text-foreground flex-1">{BASE_URL}</span>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => copyText(BASE_URL, "base")}>
              {copiedId === "base" ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">LLMs can reconstruct full URLs: Base URL + filename</p>
        </div>

        {/* Upload Section */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="label" className="text-foreground">Image Label</Label>
              <Input id="label" placeholder='e.g. "kitchen", "master_bedroom"' value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Used in filename: label_random.jpg</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* URL input */}
              <div className="space-y-2">
                <Label className="text-foreground">From URL</Label>
                <div className="flex gap-2">
                  <Input placeholder="https://example.com/image.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                  <Button onClick={handleAddFromUrl} disabled={uploading} className="bg-gradient-primary border-0 shrink-0">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* File upload */}
              <div className="space-y-2">
                <Label className="text-foreground">From Device</Label>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-sm text-muted-foreground">Drop or click to upload</p>
                  <input id="file-input" type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Grid */}
        {loading ? (
          <div className="text-center py-10 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : images.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No images yet. Upload one above!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((img) => (
                <Card key={img.name} className="overflow-hidden group">
                  <div className="aspect-square bg-muted">
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <p className="text-xs font-mono text-foreground truncate" title={img.name}>{img.name}</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyText(img.url, img.name)}>
                        {copiedId === img.name ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
                      </Button>
                      <a href={img.url} download={img.name} className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent/10 transition-colors">
                        <Download className="w-3 h-3 text-foreground" />
                      </a>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDelete(img.name)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Copy for LLM */}
            <div className="text-center">
              <Button onClick={copyForLLM} size="lg" className="bg-gradient-primary border-0 glow-primary">
                <Copy className="w-4 h-4 mr-2" /> Copy for LLM
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Copies base URL + all filenames in a format ready for LLM prompts</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageLibrary;
