import { useState, useEffect } from "react";
import { useBusinessSettings, useUpdateBusinessSettings } from "@/hooks/useBusinessSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { data: settings, isLoading } = useBusinessSettings();
  const updateMutation = useUpdateBusinessSettings();

  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [subtitleEn, setSubtitleEn] = useState("");

  useEffect(() => {
    if (settings) {
      setName(settings.business_name);
      setSubtitle(settings.business_subtitle);
      setNameEn(settings.business_name_en);
      setSubtitleEn(settings.business_subtitle_en);
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate(
      {
        business_name: name,
        business_subtitle: subtitle,
        business_name_en: nameEn,
        business_subtitle_en: subtitleEn,
      },
      {
        onSuccess: () => toast.success("تم حفظ الإعدادات بنجاح"),
        onError: () => toast.error("حدث خطأ أثناء الحفظ"),
      }
    );
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">⚙️ إعدادات المحل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">اسم المحل (عربي)</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="المتوكل على الله للدواجن" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">الوصف (عربي)</label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="جميع أنواع الأعلاف والدواجن" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">اسم المحل (إنجليزي)</label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Al-Mutawakel" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">الوصف (إنجليزي)</label>
            <Input value={subtitleEn} onChange={(e) => setSubtitleEn(e.target.value)} placeholder="Poultry & Feed Trading" />
          </div>
          <Button className="w-full gap-2" onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
