import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { parseMultiFileCode, type ParsedFile } from "@/lib/code-parser";
import { exampleTemplates } from "@/lib/example-templates";
import { FileCode2, Sparkles, Trash2 } from "lucide-react";

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
        <div className="p-4 border-b border-border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-3">Load an example to get started:</p>
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
      <ScrollArea className="flex-1">
        <Textarea
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder={`Paste your Remotion code here...\n\nUse file markers to separate files:\n// --- file: MyVideo.tsx ---\n// your component code\n\n// --- file: Root.tsx ---\n// your root composition`}
          className="h-full min-h-[500px] resize-none rounded-none border-0 bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed"
        />
      </ScrollArea>
    </div>
  );
};

export default CodeEditor;
