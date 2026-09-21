import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Upload, Trash2, FileText, Image as ImageIcon, Film, Mic, Play, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MobileBottomNav from "@/components/MobileBottomNav";

interface Asset {
  id: string;
  kind: string;
  title: string;
  url: string;
  mime_type: string;
  created_at: string;
  duration_seconds?: number;
}

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchProject = async () => {
    setLoading(true);
    const { data: proj, error: projError } = await (supabase as any)
      .from("studio_projects")
      .select("*")
      .eq("id", id)
      .single();
    
    if (projError) {
      toast.error("Project not found");
      setLoading(false);
      return;
    }
    
    setProject(proj);
    
    const { data: assetData } = await (supabase as any)
      .from("studio_assets")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });
    
    setAssets(assetData || []);
    setLoading(false);
  };

  useEffect(() => {
    if (id) fetchProject();
  }, [id]);

  const uploadFile = async (file: File) => {
    if (!id) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("studio-media")
        .upload(path, file, { contentType: file.type });
      
      if (uploadError) throw uploadError;
      
      const { data: signed } = await supabase.storage
        .from("studio-media")
        .createSignedUrl(path, 60 * 60 * 24 * 30);
      
      const kind = file.type.startsWith("video/") ? "source_video" : 
                   file.type.startsWith("audio/") ? "voice" :
                   file.type.startsWith("image/") ? "generated_image" : "source_video";
      
      const { error: assetError } = await (supabase as any)
        .from("studio_assets")
        .insert({
          project_id: id,
          kind,
          title: file.name,
          url: signed?.signedUrl || path,
          storage_path: path,
          mime_type: file.type,
          metadata: { size: file.size, originalName: file.name }
        });
      
      if (assetError) throw assetError;
      
      toast.success(`Uploaded ${file.name}`);
      fetchProject();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const addTextAsset = async () => {
    if (!id || !textTitle.trim() || !textContent.trim()) {
      toast.error("Enter title and content");
      return;
    }
    
    try {
      const path = `${id}/text-${Date.now()}.txt`;
      const blob = new Blob([textContent], { type: "text/plain" });
      
      const { error: uploadError } = await supabase.storage
        .from("studio-media")
        .upload(path, blob, { contentType: "text/plain" });
      
      if (uploadError) throw uploadError;
      
      const { data: signed } = await supabase.storage
        .from("studio-media")
        .createSignedUrl(path, 60 * 60 * 24 * 30);
      
      const { error: assetError } = await (supabase as any)
        .from("studio_assets")
        .insert({
          project_id: id,
          kind: "source_video",
          title: textTitle,
          url: signed?.signedUrl || path,
          storage_path: path,
          mime_type: "text/plain",
          metadata: { text: textContent.slice(0, 500) }
        });
      
      if (assetError) throw assetError;
      
      toast.success("Added text asset");
      setTextTitle("");
      setTextContent("");
      fetchProject();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteAsset = async (assetId: string, storagePath: string) => {
    if (!confirm("Delete this asset?")) return;
    
    await supabase.storage.from("studio-media").remove([storagePath]);
    await (supabase as any).from("studio_assets").delete().eq("id", assetId);
    toast.success("Deleted");
    fetchProject();
  };

  const copyUrl = (url: string, assetId: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(assetId);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied URL");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading project...</div>;
  if (!project) return <div className="min-h-screen flex items-center justify-center">Project not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-3">
          <Link to="/projects" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-semibold truncate max-w-[200px]">{project.title}</span>
          <Badge variant="outline" className="text-xs">{project.stage}</Badge>
        </div>
        <div className="flex gap-2">
          <Link to={`/agent-studio?project=${id}`}><Button size="sm" variant="outline">Agent Studio</Button></Link>
          <Link to="/playground"><Button size="sm">Playground</Button></Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 pb-20 md:pb-4 space-y-6">
        {/* Project info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project: {project.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              ID: <span className="font-mono bg-muted px-2 py-1 rounded text-xs">{project.id}</span> - Use this in Arena chat: "work on {project.title}"
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Arena agent can access all assets below via Supabase. Add your reference video, idea, etc. here, then chat with agent to generate missing visuals/voices/TSX.
            </p>
          </CardHeader>
        </Card>

        {/* Upload */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4" /> Upload Asset</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Video, audio, images - anything you have that agent doesn't. Stored in Supabase studio-media bucket.</p>
              <Input type="file" accept="video/*,audio/*,image/*,text/*,.txt,.json" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary"><Film className="h-3 w-3 mr-1" />MP4</Badge>
                <Badge variant="secondary"><Mic className="h-3 w-3 mr-1" />MP3/WAV</Badge>
                <Badge variant="secondary"><ImageIcon className="h-3 w-3 mr-1" />PNG/JPG</Badge>
                <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" />TXT/JSON</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Add Text / Idea</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="Title e.g., idea.txt, plan, transcript" value={textTitle} onChange={(e) => setTextTitle(e.target.value)} />
              <Textarea placeholder="Paste idea, script, analysis JSON, transcript..." value={textContent} onChange={(e) => setTextContent(e.target.value)} className="min-h-[80px]" />
              <Button size="sm" onClick={addTextAsset} className="w-full">Add Text Asset</Button>
            </CardContent>
          </Card>
        </div>

        {/* Tools - Future */}
        <Card className="border-dashed">
          <CardHeader><CardTitle className="text-sm">One-Click Tools (Coming - After V1 Works)</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled>Analyze Video (Gemini)</Button>
            <Button size="sm" variant="outline" disabled>Transcribe (Whisper)</Button>
            <Button size="sm" variant="outline" disabled>Generate Voice (ElevenLabs)</Button>
            <Button size="sm" variant="outline" disabled>Generate Images</Button>
            <span className="text-xs text-muted-foreground py-2">These will call APIs and save results as assets here, so Arena agent can read them without calling APIs directly.</span>
          </CardContent>
        </Card>

        {/* Assets grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              Assets ({assets.length}) - Shared with Arena Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No assets yet. Upload video, audio, images, or text above.</p>
                <p className="text-xs mt-2">Example: Upload reference.mp4 + idea.txt, then say in Arena "work on {project.title}"</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {assets.map((asset) => (
                  <div key={asset.id} className="border border-border rounded p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {asset.kind === "source_video" && <Film className="h-4 w-4 text-primary" />}
                        {asset.kind === "generated_image" && <ImageIcon className="h-4 w-4 text-green-500" />}
                        {asset.kind === "voice" && <Mic className="h-4 w-4 text-purple-500" />}
                        {asset.kind === "render" && <Play className="h-4 w-4 text-orange-500" />}
                        <span className="text-sm font-medium truncate max-w-[150px]">{asset.title}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{asset.kind}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate font-mono">{asset.mime_type} {asset.duration_seconds ? `• ${asset.duration_seconds}s` : ""}</div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => copyUrl(asset.url, asset.id)}>
                        {copiedId === asset.id ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />} {copiedId === asset.id ? "Copied" : "Copy URL"}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                        <a href={asset.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteAsset(asset.id, (asset as any).storage_path)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {asset.mime_type.startsWith("image/") && (
                      <img src={asset.url} alt={asset.title} className="w-full h-32 object-cover rounded mt-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <MobileBottomNav />
    </div>
  );
};

const ExternalLink = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
);

export default ProjectDetail;
