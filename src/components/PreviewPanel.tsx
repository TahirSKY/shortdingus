import { type ParsedFile } from "@/lib/code-parser";
import { Play, AlertCircle, Film } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PreviewPanelProps {
  parsedFiles: ParsedFile[];
  error: string | null;
}

const PreviewPanel = ({ parsedFiles, error }: PreviewPanelProps) => {
  const hasCode = parsedFiles.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-secondary" />
          <span className="text-sm font-medium text-foreground">Live Preview</span>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center p-6">
        {error ? (
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Compilation Error</AlertTitle>
            <AlertDescription className="font-mono text-xs mt-2 whitespace-pre-wrap">
              {error}
            </AlertDescription>
          </Alert>
        ) : hasCode ? (
          <div className="w-full max-w-2xl aspect-video rounded-lg bg-muted/30 border border-border flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
            <div className="text-center z-10">
              <Film className="w-12 h-12 text-primary/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Preview will render here
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Remotion Player integration coming soon
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 animate-float">
              <Film className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              Paste code or load a template to see a preview
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;
