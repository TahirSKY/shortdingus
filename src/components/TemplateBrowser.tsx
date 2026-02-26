import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Trash2, ArrowRight } from "lucide-react";
import { exampleTemplates } from "@/lib/example-templates";
import { useSavedTemplates, useDeleteTemplate } from "@/hooks/use-saved-templates";
import { toast } from "sonner";

interface TemplateBrowserProps {
  onSelect: (code: string) => void;
  trigger?: React.ReactNode;
}

const TemplateBrowser = ({ onSelect, trigger }: TemplateBrowserProps) => {
  const [open, setOpen] = useState(false);
  const { data: savedTemplates = [], isLoading } = useSavedTemplates();
  const deleteTemplate = useDeleteTemplate();

  const handleSelect = (code: string) => {
    onSelect(code);
    setOpen(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTemplate.mutate(id, {
      onSuccess: () => toast.success("Template deleted"),
      onError: () => toast.error("Failed to delete"),
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-xs gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" />
            Templates
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle>Templates</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="saved" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mb-2">
            <TabsTrigger value="saved">My Templates</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full px-6 pb-6">
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
              ) : savedTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No saved templates yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use "Save as Template" from the Playground or Studio to add one.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {savedTemplates.map((t) => (
                    <div
                      key={t.id}
                      className="group rounded-lg border border-border bg-card hover:border-primary/30 transition-all p-4 cursor-pointer"
                      onClick={() => handleSelect(t.code)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl shrink-0">{t.emoji}</span>
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium text-foreground truncate">{t.title}</h4>
                            {t.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                            onClick={(e) => handleDelete(t.id, e)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="examples" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full px-6 pb-6">
              <div className="space-y-3 pt-2">
                {exampleTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="group rounded-lg border border-border bg-card hover:border-primary/30 transition-all p-4 cursor-pointer"
                    onClick={() => handleSelect(t.code)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{t.emoji}</span>
                        <div>
                          <h4 className="text-sm font-medium text-foreground">{t.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default TemplateBrowser;
