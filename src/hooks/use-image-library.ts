import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LibraryImage {
  id: string;
  title: string;
  url: string;
  storage_path: string | null;
  created_at: string;
}

export function useImageLibrary() {
  return useQuery({
    queryKey: ["image_library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_library")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LibraryImage[];
    },
  });
}

export function useAddImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (image: { title: string; url: string; storage_path?: string }) => {
      const { data, error } = await supabase
        .from("image_library")
        .insert(image)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["image_library"] }),
  });
}

export function useDeleteImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (image: { id: string; storage_path: string | null }) => {
      // Delete from storage if it was uploaded
      if (image.storage_path) {
        await supabase.storage.from("images").remove([image.storage_path]);
      }
      const { error } = await supabase.from("image_library").delete().eq("id", image.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["image_library"] }),
  });
}
