import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BookmarkPlus } from "lucide-react";
import { useSaveTemplate } from "@/hooks/use-saved-templates";
import { toast } from "sonner";

const EMOJIS = ["🎬", "🚀", "✨", "🔥", "💡", "🎨", "📊", "🌟", "⚡", "🎯"];

interface SaveTemplateDialogProps {
  code: string;
  trigger?: React.ReactNode;
}

const SaveTemplateDialog = ({ code, trigger }: SaveTemplateDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🎬");
  const saveTemplate = useSaveTemplate();

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    saveTemplate.mutate(
      { title: title.trim(), description: description.trim(), emoji, code },
      {
        onSuccess: () => {
          toast.success("Template saved!");
          setOpen(false);
          setTitle("");
          setDescription("");
          setEmoji("🎬");
        },
        onError: (err: any) => toast.error(err.message || "Failed to save"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-xs gap-1.5" disabled={!code}>
            <BookmarkPlus className="w-3.5 h-3.5" />
            Save as Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Emoji</Label>
            <div className="flex gap-1.5 flex-wrap">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition-colors ${
                    emoji === e
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My awesome animation"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description..."
              className="resize-none h-20"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={saveTemplate.isPending || !title.trim()}
            className="w-full bg-gradient-primary hover:opacity-90 border-0"
          >
            {saveTemplate.isPending ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaveTemplateDialog;
