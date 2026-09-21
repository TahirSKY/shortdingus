import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Folder, Film, Image as ImageIcon, Mic, FileText, Clock, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MobileBottomNav from "@/components/MobileBottomNav";

interface Project {
  id: string;
  title: string;
  mode: string;
  stage: string;
  created_at: string;
  updated_at: string;
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("studio_projects")
      .select("id, title, mode, stage, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    
    if (error) {
      toast.error("Failed to load projects");
      console.error(error);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const createProject = async () => {
    if (!newTitle.trim()) {
      toast.error("Enter a project name");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await (supabase as any)
        .from("studio_projects")
        .insert({
          title: newTitle.trim(),
          mode: "need_footage",
          stage: "start"
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(`Created project: ${data.title}`);
      setNewTitle("");
      fetchProjects();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project and all its assets?")) return;
    
    const { error } = await (supabase as any)
      .from("studio_projects")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted");
      fetchProjects();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="h-4 w-px bg-border" />
          <Folder className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Projects</span>
          <Badge variant="secondary" className="text-xs">{projects.length} total</Badge>
        </div>
        <Link to="/agent-studio"><Button size="sm" variant="outline">Agent Studio</Button></Link>
      </header>

      <main className="max-w-6xl mx-auto p-4 pb-20 md:pb-4 space-y-6">
        {/* Create new project */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create Project Node
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Each video is a project. Add assets here (video, audio, images, text) and reference the project name in Arena chat. Agent here can access all files and add more.
            </p>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              placeholder="e.g., loan-horror-01, steadywalks-treat-test, fireship-react"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              className="flex-1"
            />
            <Button onClick={createProject} disabled={creating || !newTitle.trim()}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </CardContent>
        </Card>

        {/* Projects grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No projects yet. Create one above.</p>
            <p className="text-xs text-muted-foreground mt-2">Example: "loan-horror-01" then upload reference video + idea, then chat with agent here</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="hover:border-primary/30 transition-colors group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm leading-tight line-clamp-2">{project.title}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteProject(project.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <Badge variant={project.mode === "have_footage" ? "default" : "secondary"} className="text-[10px]">{project.mode}</Badge>
                    <Badge variant="outline" className="text-[10px]">{project.stage}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {new Date(project.updated_at).toLocaleString()}
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1">
                      <Link to={`/projects/${project.id}`}>Open</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link to={`/studio?project=${project.id}`}>Studio</Link>
                    </Button>
                  </div>
                  <div className="text-[11px] font-mono bg-muted p-2 rounded truncate">
                    ID: {project.id.slice(0, 8)}... (use in Arena chat)
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* How it works */}
        <Card className="bg-card/50">
          <CardHeader><CardTitle className="text-sm">How Project Nodes Work (Arena + Vercel)</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p><strong>1. Create project here</strong> in Vercel app: e.g., "loan-horror-01"</p>
            <p><strong>2. Upload assets</strong> inside project: video file, audio, images, idea.txt - stored in Supabase studio-media bucket</p>
            <p><strong>3. Click tools:</strong> [Analyze Video] → Gemini timecoded beats, [Transcribe] → Whisper word timestamps - saves as JSON assets</p>
            <p><strong>4. Come to Arena chat</strong> and say "work on loan-horror-01" - I fetch all assets via Supabase and can see everything</p>
            <p><strong>5. I generate missing:</strong> anime visuals, voices, TSX code - upload back to same project as new assets</p>
            <p><strong>6. You render:</strong> Copy TSX → paste into /playground → Lambda → mp4 download</p>
            <p className="pt-2 text-xs">This solves video understanding + timecode without me calling APIs directly - you click button in Vercel, I read result from Supabase.</p>
          </CardContent>
        </Card>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Projects;
