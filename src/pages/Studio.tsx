import { useState, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Send, Loader2, Code2, Eye, RotateCcw } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import RemotionPreview from "@/components/RemotionPreview";
import { parseMultiFileCode } from "@/lib/code-parser";
import { detectConfig } from "@/lib/detect-config";
import { toast } from "sonner";

type Message = { role: "user" | "assistant"; content: string };

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-remotion`;

function cleanCodeFromResponse(text: string): string {
  // Extract code from markdown fences anywhere in the response
  const fenceMatch = text.match(/```(?:tsx?|jsx?|typescript|javascript)?\s*\n([\s\S]*?)```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  // If the response starts with a fence (no language tag)
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");
    return cleaned.trim();
  }
  // If it looks like raw code (has imports or JSX), use as-is
  if (/^(import |\/\*|\/\/|export )/.test(cleaned)) {
    return cleaned;
  }
  // Last resort: try to find code-like content after any preamble text
  const codeStart = cleaned.search(/\n(import |\/\*\s*__REMOTION)/);
  if (codeStart !== -1) {
    return cleaned.slice(codeStart).trim();
  }
  return cleaned;
}

const Studio = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const generatingRef = useRef(false);

  const parsedFiles = useMemo(() => parseMultiFileCode(generatedCode), [generatedCode]);
  const detectedConfig = useMemo(() => detectConfig(generatedCode), [generatedCode]);

  const handleGenerate = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || generatingRef.current) return;
    generatingRef.current = true;

    const userMsg: Message = { role: "user", content: prompt };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsGenerating(true);

    let fullResponse = "";

    try {
      const resp = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              // Update assistant message progressively
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: fullResponse } : m
                  );
                }
                return [...prev, { role: "assistant", content: fullResponse }];
              });
            }
          } catch {
            // partial JSON, wait for more data
          }
        }
      }

      // Set the generated code for preview
      const code = cleanCodeFromResponse(fullResponse);
      if (code) {
        setGeneratedCode(code);
        toast.success("Video generated! Check the preview.");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      toast.error(err.message || "Failed to generate video");
    } finally {
      setIsGenerating(false);
      generatingRef.current = false;
    }
  }, [input, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setGeneratedCode("");
    setInput("");
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/30">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">AI Studio</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {generatedCode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCode(!showCode)}
              className="text-xs gap-1.5"
            >
              {showCode ? <Eye className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
              {showCode ? "Preview" : "View Code"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left: Chat */}
          <ResizablePanel defaultSize={40} minSize={25}>
            <div className="flex flex-col h-full">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div ref={scrollRef} className="space-y-4">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 animate-float">
                        <Sparkles className="w-7 h-7 text-primary-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Describe your video
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Tell me what kind of animation or video you want to create. I'll generate
                        Remotion code and show you a live preview.
                      </p>
                      <div className="mt-6 space-y-2 w-full max-w-sm">
                        {[
                          "A modern logo reveal with particles",
                          "Animated bar chart showing monthly sales",
                          "Cinematic text intro with fade and scale",
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setInput(suggestion)}
                            className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                          >
                            "{suggestion}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border text-foreground"
                        }`}
                      >
                        {msg.role === "user" ? (
                          msg.content
                        ) : (
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-muted-foreground">
                              {isGenerating ? "Generating..." : "Video code generated ✓"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t border-border bg-card/30">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      messages.length > 0
                        ? "Describe changes... (e.g. 'make it faster', 'add a subtitle')"
                        : "Describe the video you want to create..."
                    }
                    className="min-h-[44px] max-h-[120px] resize-none text-sm bg-background"
                    disabled={isGenerating}
                  />
                  <Button
                    onClick={handleGenerate}
                    disabled={!input.trim() || isGenerating}
                    size="icon"
                    className="shrink-0 h-[44px] w-[44px]"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right: Preview or Code */}
          <ResizablePanel defaultSize={60} minSize={30}>
            {showCode ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center px-4 py-3 border-b border-border bg-card/50">
                  <Code2 className="w-4 h-4 text-secondary mr-2" />
                  <span className="text-sm font-medium text-foreground">Generated Code</span>
                </div>
                <ScrollArea className="flex-1">
                  <pre className="p-4 text-xs font-mono text-foreground whitespace-pre-wrap">
                    {generatedCode}
                  </pre>
                </ScrollArea>
              </div>
            ) : (
              <RemotionPreview
                parsedFiles={parsedFiles}
                detectedConfig={detectedConfig}
                error={null}
              />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Studio;
