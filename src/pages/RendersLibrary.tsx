import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Trash2, Film, Image, Loader2, Sparkles, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SavedRender {
  id: string;
  title: string;
  notes: string | null;
  url: string;
  mode: string;
  created_at: string;
}

const RendersLibrary = () => {
  const [renders, setRenders] = useState<SavedRender[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRenders = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("saved_renders" as any).select("*").order("created_at", { ascending: false }) as any);
    if (error) {
      toast({ title: "Failed to load renders", description: error.message, variant: "destructive" });
    } else {
      setRenders(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRenders(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from("saved_renders" as any).delete().eq("id", id) as any);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      setRenders((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Deleted" });
    }
  };

  const handleDownload = async (url: string, mode: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `render.${mode === "poster" ? "png" : "mp4"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-border">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-lg font-bold text-foreground">Remotion Playground</span>
          </Link>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Library className="w-4 h-4" />
            Renders Library
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/playground" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Playground
          </Link>
          <Link to="/images" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Images
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">Renders Library</h1>
        <p className="text-muted-foreground mb-8">Your saved renders with notes and previews.</p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : renders.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Library className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg">No saved renders yet.</p>
            <p className="text-sm mt-1">Render something in the playground and save it here!</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/playground">Go to Playground</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {renders.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card overflow-hidden group hover:border-primary/30 transition-colors">
                {/* Preview */}
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {r.mode === "poster" ? (
                    <img src={r.url} alt={r.title} className="w-full h-full object-cover" />
                  ) : (
                    <video src={r.url} className="w-full h-full object-cover" muted preload="metadata" />
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">{r.title}</h3>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {r.mode === "poster" ? <Image className="w-3 h-3 mr-1" /> : <Film className="w-3 h-3 mr-1" />}
                      {r.mode}
                    </Badge>
                  </div>

                  {r.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.notes}</p>
                  )}

                  <p className="text-xs text-muted-foreground/60">
                    {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDownload(r.url, r.mode)}>
                      <Download className="w-3.5 h-3.5 mr-1" /> Download
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete render?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove "{r.title}" from your library. The original file is not affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(r.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RendersLibrary;
