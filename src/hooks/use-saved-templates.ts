import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SavedTemplate {
  id: string;
  created_at: string;
  title: string;
  description: string;
  emoji: string;
  code: string;
}

export function useSavedTemplates() {
  return useQuery({
    queryKey: ["saved_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SavedTemplate[];
    },
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: { title: string; description: string; emoji: string; code: string }) => {
      const { data, error } = await supabase
        .from("saved_templates")
        .insert(template)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved_templates"] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved_templates"] }),
  });
}
