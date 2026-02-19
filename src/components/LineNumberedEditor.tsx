import { useRef, useEffect, useCallback } from "react";

interface LineNumberedEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const LineNumberedEditor = ({ value, onChange, placeholder }: LineNumberedEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = value ? value.split("\n") : [];
  const lineCount = Math.max(lines.length, 1);

  const syncScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.addEventListener("scroll", syncScroll);
    return () => textarea.removeEventListener("scroll", syncScroll);
  }, [syncScroll]);

  return (
    <div className="flex h-full min-h-[500px] font-mono text-sm relative overflow-hidden">
      {/* Line numbers */}
      <div
        ref={lineNumbersRef}
        className="select-none overflow-hidden shrink-0 text-right pr-3 pl-3 pt-3 bg-muted/30 border-r border-border text-muted-foreground/50 leading-relaxed"
        style={{ minWidth: `${String(lineCount).length * 10 + 24}px` }}
        aria-hidden
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i + 1} className="leading-relaxed">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="flex-1 resize-none bg-transparent px-4 pt-3 pb-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none w-full"
        style={{ lineHeight: "inherit" }}
      />
    </div>
  );
};

export default LineNumberedEditor;
