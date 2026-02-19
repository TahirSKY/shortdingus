import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseMultiFileCode, type ParsedFile } from "@/lib/code-parser";
import { exampleTemplates, starterTemplate } from "@/lib/example-templates";
import { FileCode2, Sparkles, Trash2, Rocket } from "lucide-react";
import LineNumberedEditor from "@/components/LineNumberedEditor";

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  parsedFiles: ParsedFile[];
}

const CodeEditor = ({ code, onCodeChange, parsedFiles }: CodeEditorProps) => {
  const [showTemplates, setShowTemplates] = useState(!code);

  const loadTemplate = (templateCode: string) => {
    onCodeChange(templateCode);
    setShowTemplates(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Code Editor</span>
          {parsedFiles.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {parsedFiles.length} file{parsedFiles.length > 1 ? "s" : ""}
            </Badge>
          )}
          {code && (
            <Badge variant="outline" className="text-xs text-muted-foreground font-mono">
              {code.split("\n").length} lines
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Templates
          </Button>
          {code && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCodeChange("")}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* File tabs */}
      {parsedFiles.length > 1 && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border overflow-x-auto">
          {parsedFiles.map((file) => (
            <Badge
              key={file.filename}
              variant="outline"
              className="text-xs font-mono shrink-0 bg-muted/50"
            >
              {file.filename}
            </Badge>
          ))}
        </div>
      )}

      {/* Templates panel */}
      {showTemplates && !code && (
        <div className="p-4 border-b border-border bg-muted/30 overflow-y-auto">
          {/* Starter template — prominent CTA */}
          <button
            onClick={() => loadTemplate(starterTemplate.code)}
            className="w-full text-left p-4 rounded-xl mb-4 border border-primary/40 bg-gradient-to-br from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 transition-all group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Rocket className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {starterTemplate.title}
              </span>
              <Badge variant="secondary" className="text-xs ml-auto">Recommended</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{starterTemplate.description}</p>
            <p className="text-xs text-primary/70 mt-1.5 font-mono">
              Intro.tsx · MainScene.tsx · Root.tsx
            </p>
          </button>

          <p className="text-xs text-muted-foreground mb-2">Or choose a quick example:</p>
          <div className="grid grid-cols-2 gap-2">
            {exampleTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => loadTemplate(template.code)}
                className="text-left p-3 rounded-lg bg-card border border-border hover:border-primary/40 hover:glow-primary transition-all group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{template.emoji}</span>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {template.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Code input */}
      <div className="flex-1 overflow-auto">
        <LineNumberedEditor
          value={code}
          onChange={onCodeChange}
          placeholder={`Paste your Remotion code here...\n\nUse file markers to separate files:\n// --- file: MyVideo.tsx ---\n// your component code\n\n// --- file: Root.tsx ---\n// your root composition`}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
