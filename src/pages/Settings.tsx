import { useState, useEffect } from "react";
import { useBusinessSettings, useUpdateBusinessSettings } from "@/hooks/useBusinessSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Plus, X } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { data: settings, isLoading } = useBusinessSettings();
  const updateMutation = useUpdateBusinessSettings();

  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [subtitleEn, setSubtitleEn] = useState("");

  // إعدادات المنتجات الجديدة
  const [products, setProducts] = useState<string[]>(["فراخ", "علف", "بيض", "أخرى"]);
  const [newProduct, setNewProduct] = useState("");

  useEffect(() => {
    if (settings) {
      setName(settings.business_name || "");
      setSubtitle(settings.business_subtitle || "");
      setNameEn(settings.business_name_en || "");
      setSubtitleEn(settings.business_subtitle_en || "");
      
      // لو في منتجات متسجلة في الداتا بيز، اعرضها، لو مفيش سيب الأساسية
      if (settings.products && Array.isArray(settings.products)) {
        setProducts(settings.products);
      }
    }
  }, [settings]);

  // دالة إضافة منتج جديد
  const handleAddProduct = () => {
    const trimmed = newProduct.trim();
    if (!trimmed) return;
    
    if (products.includes(trimmed)) {
      toast.error("هذا المنتج موجود بالفعل");
      return;
    }
    
    setProducts([...products, trimmed]);
    setNewProduct("");
  };

  // دالة مسح منتج
  const handleRemoveProduct = (prodToRemove: string) => {
    setProducts(products.filter((p) => p !== prodToRemove));
  };

  const handleSave = () => {
    updateMutation.mutate(
      {
        business_name: name,
        business_subtitle: subtitle,
        business_name_en: nameEn,
        business_subtitle_en: subtitleEn,
        products: products, // حفظ قائمة المنتجات
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
          <CardTitle className="text-xl text-right">⚙️ إعدادات المحل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* إعدادات المحل الأساسية */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-right">اسم المحل (عربي)</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="المتوكل على الله للدواجن" dir="rtl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-right">الوصف (عربي)</label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="جميع أنواع الأعلاف والدواجن" dir="rtl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-right">اسم المحل (إنجليزي)</label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Al-Mutawakel" dir="ltr" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-right">الوصف (إنجليزي)</label>
              <Input value={subtitleEn} onChange={(e) => setSubtitleEn(e.target.value)} placeholder="Poultry & Feed Trading" dir="ltr" />
            </div>
          </div>

          <div className="border-t border-border my-4"></div>

          {/* إعدادات المنتجات */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-right">📦 قائمة المنتجات</h3>
            <p className="text-sm text-muted-foreground text-right mb-2">
              هذه المنتجات ستظهر لك في القائمة المنسدلة عند إضافة أو تعديل أي عملية.
            </p>
            
            <div className="flex gap-2" dir="rtl">
              <Input 
                value={newProduct} 
                onChange={(e) => setNewProduct(e.target.value)} 
                placeholder="اسم المنتج الجديد..." 
                onKeyDown={(e) => e.key === 'Enter' && handleAddProduct()}
              />
              <Button onClick={handleAddProduct} type="button" variant="secondary" className="gap-2">
                <Plus className="h-4 w-4" /> إضافة
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 justify-end mt-4">
              {products.map((prod) => (
                <div key={prod} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full border border-border">
                  <span className="text-sm font-medium">{prod}</span>
                  <button 
                    onClick={() => handleRemoveProduct(prod)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {products.length === 0 && (
                <span className="text-sm text-muted-foreground">لا توجد منتجات مضافة.</span>
              )}
            </div>
          </div>

          <div className="border-t border-border my-4"></div>

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
