import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { exampleTemplates } from "@/lib/example-templates";
import { useSavedTemplates, useDeleteTemplate } from "@/hooks/use-saved-templates";
import { toast } from "sonner";

const Examples = () => {
  const navigate = useNavigate();
  const { data: savedTemplates = [] } = useSavedTemplates();
  const deleteTemplate = useDeleteTemplate();

  const loadExample = (code: string) => {
    sessionStorage.setItem("playground-code", code);
    navigate("/playground");
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTemplate.mutate(id, {
      onSuccess: () => toast.success("Template deleted"),
      onError: () => toast.error("Failed to delete"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <span className="text-base sm:text-lg font-bold text-foreground">Remotion Playground</span>
        </Link>
        <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90 border-0 text-xs sm:text-sm">
          <Link to="/playground">Open Playground</Link>
        </Button>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Examples <span className="text-gradient">Gallery</span>
          </h1>
          <p className="text-muted-foreground mb-10">
            Browse ready-made Remotion templates. Click to load them into the playground instantly.
          </p>
        </motion.div>

        {/* Saved Templates */}
        {savedTemplates.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">My Templates</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {savedTemplates.map((template, i) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="group rounded-xl border border-border bg-card hover:border-primary/30 transition-all overflow-hidden"
                >
                  <div className="aspect-video bg-muted/30 flex items-center justify-center border-b border-border relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 group-hover:from-primary/10 group-hover:to-secondary/10 transition-all" />
                    <span className="text-5xl z-10">{template.emoji}</span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-foreground">{template.title}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                        onClick={(e) => handleDelete(template.id, e)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                    )}
                    <Button
                      onClick={() => loadExample(template.code)}
                      size="sm"
                      className="bg-gradient-primary hover:opacity-90 border-0"
                    >
                      Load in Playground
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Built-in Examples */}
        <h2 className="text-xl font-semibold text-foreground mb-4">Built-in Examples</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {exampleTemplates.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="group rounded-xl border border-border bg-card hover:border-primary/30 transition-all overflow-hidden"
            >
              <div className="aspect-video bg-muted/30 flex items-center justify-center border-b border-border relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 group-hover:from-primary/10 group-hover:to-secondary/10 transition-all" />
                <span className="text-5xl z-10">{template.emoji}</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-foreground mb-1">{template.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                <Button
                  onClick={() => loadExample(template.code)}
                  size="sm"
                  className="bg-gradient-primary hover:opacity-90 border-0"
                >
                  Load in Playground
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default Examples;
