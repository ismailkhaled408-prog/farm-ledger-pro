import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessSettings {
  id: string;
  business_name: string;
  business_subtitle: string;
  business_name_en: string;
  business_subtitle_en: string;
  products: string[] | null;
}

export const useBusinessSettings = () => {
  return useQuery({
    queryKey: ["business-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as BusinessSettings;
    },
  });
};

export const useUpdateBusinessSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<Omit<BusinessSettings, "id">>) => {
      const { data: existing } = await supabase
        .from("business_settings")
        .select("id")
        .limit(1)
        .single();
      if (!existing) throw new Error("No settings found");
      const { error } = await supabase
        .from("business_settings")
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings"] });
    },
  });
};
