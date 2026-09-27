import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

export function EditableText({ value, onSave, className, multiline, placeholder, rows = 2 }: { value: string; onSave: (v: string) => void; className?: string; multiline?: boolean; placeholder?: string; rows?: number }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => { if (v !== value) onSave(v); };
  return multiline
    ? <Textarea value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} placeholder={placeholder} className={className} rows={rows} />
    : <input value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className={`w-full bg-transparent outline-none ${className}`} />;
}

export function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded bg-muted px-2 py-1 font-mono text-xs">{value}</code>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(value)} aria-label="Copy"><Copy className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}
