import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Printer, Trash2, Pencil, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const AccountStatement = () => {
  const queryClient = useQueryClient();
  const { data: bizSettings } = useBusinessSettings();
  const [partnerId, setPartnerId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // States for Edit Mode
  const [editItem, setEditItem] = useState<any>(null);
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editType, setEditType] = useState<"debit" | "credit">("debit");
  const [editProductName, setEditProductName] = useState("فراخ");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnitPrice, setEditUnitPrice] = useState("");
  const [editCreditAmount, setEditCreditAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("نقدي");
  const [editNotes, setEditNotes] = useState("");
  
  const printRef = useRef<HTMLDivElement>(null);

  const { data: partners } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions", partnerId, dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async () => {
      if (!partnerId) return [];
      let query = supabase
        .from("transactions")
        .select("*")
        .eq("partner_id", partnerId)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (dateFrom) query = query.gte("date", format(dateFrom, "yyyy-MM-dd"));
      if (dateTo) query = query.lte("date", format(dateTo, "yyyy-MM-dd"));

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!partnerId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-all"] });
      toast.success("تم حذف العملية بنجاح");
      setDeleteId(null);
    },
    onError: () => toast.error("حدث خطأ أثناء الحذف"),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase
        .from("transactions")
        .update({
          date: payload.date,
          description: payload.description,
          debit: payload.debit,
          credit: payload.credit,
        })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-all"] });
      toast.success("تم التعديل بنجاح");
      setEditItem(null);
    },
    onError: () => toast.error("حدث خطأ أثناء التعديل"),
  });

  const selectedPartner = partners?.find((p) => p.id === partnerId);
  const isSupplier = selectedPartner?.type === "supplier";

  // قائمة المنتجات الديناميكية من الإعدادات
  const productOptions = bizSettings?.products && Array.isArray(bizSettings.products) && bizSettings.products.length > 0
    ? bizSettings.products
    : ["فراخ", "علف", "بيض", "أخرى"];

  // Data processing for Edit Mode
  const handleEditClick = (r: any) => {
    setEditDate(new Date(r.date));
    const isDebit = Number(r.debit) > 0;
    setEditType(isDebit ? "debit" : "credit");

    let parsedProductName = productOptions[0] || "فراخ";
    let parsedQty = "";
    let parsedPrice = "";
    let parsedNotes = "";
    let parsedMethod = "نقدي";

    const desc = r.description || "";

    if (isDebit) {
      const parts = desc.split(" - ");
      if (parts.length > 0) {
        const possibleProduct = parts[0].trim();
        if (productOptions.includes(possibleProduct)) parsedProductName = possibleProduct;
      }
      if (parts.length > 1) {
        const qtyPriceStr = parts[1].split(" ج.م")[0];
        const qpParts = qtyPriceStr.split("×").map((s: string) => s.trim());
        if (qpParts.length === 2) {
          parsedQty = qpParts[0];
          parsedPrice = qpParts[1];
        }
      }
      const noteMatch = desc.match(/\((.*?)\)$/);
      if (noteMatch) parsedNotes = noteMatch[1];
    } else {
      if (desc.startsWith("دفع ")) {
        const pParts = desc.replace("دفع ", "").split(" - ");
        const possibleMethod = pParts[0].trim();
        if (["نقدي", "بريد", "تحويل بنكي", "فودافون كاش"].includes(possibleMethod)) parsedMethod = possibleMethod;
        if (pParts.length > 1) parsedNotes = pParts[1].trim();
      }
      setEditCreditAmount(r.credit.toString());
    }

    setEditProductName(parsedProductName);
    setEditQuantity(parsedQty);
    setEditUnitPrice(parsedPrice);
    setEditPaymentMethod(parsedMethod);
    setEditNotes(parsedNotes);
    setEditItem(r);
  };

  const calculatedEditAmount = editType === "debit"
    ? (parseFloat(editQuantity) || 0) * (parseFloat(editUnitPrice) || 0)
    : parseFloat(editCreditAmount) || 0;

  const autoEditDescription = editType === "debit"
    ? `${editProductName} - ${editQuantity || "0"} × ${editUnitPrice || "0"} ج.م${editNotes ? ` (${editNotes})` : ""}`
    : `دفع ${editPaymentMethod}${editNotes ? ` - ${editNotes}` : ""}`;

  let runningBalance = 0;
  const rows = (transactions ?? []).map((t) => {
    runningBalance += Number(t.debit) - Number(t.credit);
    return { ...t, balance: runningBalance };
  });

  const totalDebit = rows.reduce((s, r) => s + Number(r.debit), 0);
  const totalCredit = rows.reduce((s, r) => s + Number(r.credit), 0);
  const finalBalance = totalDebit - totalCredit;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html dir="rtl">
      <head>
        <title>كشف حساب - ${selectedPartner?.name ?? ""}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; background: #fff; color: #111; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #1a2332; color: white; padding: 10px 8px; font-size: 14px; }
          td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 13px; text-align: center; color: #222; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 3px solid #1a2332; padding-bottom: 15px; }
          .debit { color: #dc2626; font-weight: bold; }
          .credit { color: #16a34a; font-weight: bold; }
          .total-row { background: #f0f4f8; font-weight: bold; }
          .balance-row { background: #1a2332; color: white; font-weight: bold; }
          .back-btn { display: inline-block; margin-bottom: 16px; padding: 8px 24px; background: #1a2332; color: white; border: none; border-radius: 8px; font-family: 'Cairo', sans-serif; font-size: 14px; cursor: pointer; }
          .back-btn:hover { background: #2a3a4f; }
          .delete-col { display: none; }
          @media print { .back-btn { display: none !important; } .delete-col { display: none !important; } }
        </style>
      </head>
      <body>
        <button class="back-btn" onclick="window.close()">✕ إغلاق والرجوع</button>
        ${content.innerHTML}
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">كشف حساب</h1>

      {/* Filters */}
      <div className="no-print flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 items-stretch sm:items-end">
        <div className="w-full sm:w-64">
          <label className="text-sm font-medium mb-1 block">اختر العميل</label>
          <Select value={partnerId} onValueChange={setPartnerId}>
            <SelectTrigger>
              <SelectValue placeholder="اختر عميل..." />
            </SelectTrigger>
            <SelectContent>
              {partners?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.type === "client" ? "عميل" : "مورد"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">من تاريخ</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full md:w-44 justify-start", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="ml-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "yyyy/MM/dd") : "اختر تاريخ"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">إلى تاريخ</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full md:w-44 justify-start", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="ml-2 h-4 w-4" />
                {dateTo ? format(dateTo, "yyyy/MM/dd") : "اختر تاريخ"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        {partnerId && (
          <Button onClick={handlePrint} className="gap-2 w-full sm:w-auto">
            <Printer className="h-4 w-4" />
            طباعة PDF
          </Button>
        )}
      </div>

      {/* Printable Statement */}
      {partnerId && (
        <div ref={printRef}>
          <div className="flex flex-col md:flex-row justify-between items-center border-b-4 border-primary pb-4 mb-4 gap-2">
            <div className="text-right hidden md:block">
              <h2 className="text-xl font-bold">{bizSettings?.business_name ?? "المتوكل على الله للدواجن"}</h2>
              <p className="text-sm text-muted-foreground">{bizSettings?.business_subtitle ?? "جميع أنواع الأعلاف والدواجن"}</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-6xl">🐔</div>
              <p className="font-bold text-sm md:text-lg mt-1">كشف حساب: {selectedPartner?.name}</p>
              <p className="text-xs text-muted-foreground">{selectedPartner?.type === "client" ? "عميل" : "مورد"}</p>
            </div>
            <div className="text-left hidden md:block">
              <h2 className="text-xl font-bold">{bizSettings?.business_name_en ?? "Al-Mutawakel"}</h2>
              <p className="text-sm text-muted-foreground">{bizSettings?.business_subtitle_en ?? "Poultry & Feed Trading"}</p>
            </div>
          </div>

          <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-table-header text-table-header-foreground">
                <th className="p-1 sm:p-2 md:p-3 text-center font-bold text-[10px] sm:text-xs md:text-sm">التاريخ</th>
                <th className="p-1 sm:p-2 md:p-3 text-center font-bold text-[10px] sm:text-xs md:text-sm">التفاصيل</th>
                <th className="p-1 sm:p-2 md:p-3 text-center font-bold text-[10px] sm:text-xs md:text-sm">{isSupplier ? "مشتريات" : "عليه"}</th>
                <th className="p-1 sm:p-2 md:p-3 text-center font-bold text-[10px] sm:text-xs md:text-sm">{isSupplier ? "مدفوعات" : "له"}</th>
                <th className="p-1 sm:p-2 md:p-3 text-center font-bold text-[10px] sm:text-xs md:text-sm">{isSupplier ? "الباقي عليك" : "الرصيد"}</th>
                <th className="p-1 sm:p-2 md:p-3 text-center font-bold text-[10px] sm:text-xs md:text-sm no-print delete-col">تعديل/حذف</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-[10px] sm:text-xs md:text-sm">
                    لا توجد عمليات
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((r, i) => (
                    <tr key={r.id} className={cn("border-b border-border", i % 2 === 0 ? "bg-card" : "bg-muted/30")}>
                      <td className="p-1 sm:p-2 md:p-3 text-center text-[10px] sm:text-xs md:text-sm whitespace-nowrap">{format(new Date(r.date), "yyyy/MM/dd")}</td>
                      <td className="p-1 sm:p-2 md:p-3 text-center text-[10px] sm:text-xs md:text-sm">{r.description}</td>
                      <td className="p-1 sm:p-2 md:p-3 text-center font-bold text-destructive text-[10px] sm:text-xs md:text-sm">
                        {Number(r.debit) > 0 ? Number(r.debit).toLocaleString("ar-EG") : "-"}
                      </td>
                      <td className="p-1 sm:p-2 md:p-3 text-center font-bold text-success text-[10px] sm:text-xs md:text-sm">
                        {Number(r.credit) > 0 ? Number(r.credit).toLocaleString("ar-EG") : "-"}
                      </td>
                      <td className={cn("p-1 sm:p-2 md:p-3 text-center font-bold text-[10px] sm:text-xs md:text-sm", r.balance > 0 ? "text-destructive" : "text-success")}>
                        {r.balance.toLocaleString("ar-EG")}
                      </td>
                      <td className="p-1 sm:p-2 md:p-3 text-center no-print delete-col">
                        <div className="flex flex-col sm:flex-row justify-center gap-1 items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 md:h-8 md:w-8 text-blue-500 hover:bg-blue-100"
                            onClick={() => handleEditClick(r)}
                          >
                            <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 md:h-8 md:w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(r.id)}
                          >
                            <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted font-bold border-t-2 border-primary">
                    <td className="p-1 sm:p-2 md:p-3 text-center text-[10px] sm:text-xs md:text-sm" colSpan={2}>إجمالي العمليات</td>
                    <td className="p-1 sm:p-2 md:p-3 text-center text-destructive text-[10px] sm:text-xs md:text-sm">{totalDebit.toLocaleString("ar-EG")}</td>
                    <td className="p-1 sm:p-2 md:p-3 text-center text-success text-[10px] sm:text-xs md:text-sm">{totalCredit.toLocaleString("ar-EG")}</td>
                    <td className="p-1 sm:p-2 md:p-3 text-center text-[10px] sm:text-xs md:text-sm">-</td>
                    <td className="no-print delete-col"></td>
                  </tr>
                  <tr className="bg-primary text-primary-foreground font-bold">
                    <td className="p-1 sm:p-2 md:p-3 text-center text-[10px] sm:text-xs md:text-sm" colSpan={4}>الرصيد الإجمالي</td>
                    <td className="p-1 sm:p-2 md:p-3 text-center font-bold text-xs sm:text-sm md:text-lg">{finalBalance.toLocaleString("ar-EG")}</td>
                    <td className="no-print delete-col"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Advanced Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تعديل العملية</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-2">
            
            <div>
              <label className="text-sm font-medium mb-1 block text-right">التاريخ</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start", !editDate && "text-muted-foreground")}>
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {editDate ? format(editDate, "yyyy/MM/dd") : "اختر تاريخ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={editDate} onSelect={(d) => d && setEditDate(d)} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block text-right">النوع</label>
              <Select value={editType} onValueChange={(v) => setEditType(v as "debit" | "credit")}>
                <SelectTrigger dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="debit">
                    {isSupplier ? "شراء منه (عليك)" : "عليه (سحب بضاعة)"}
                  </SelectItem>
                  <SelectItem value="credit">
                    {isSupplier ? "دفع له" : "له (دفع نقدي / بريد)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editType === "debit" ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block text-right">اسم المنتج</label>
                  <Select value={editProductName} onValueChange={setEditProductName}>
                    <SelectTrigger dir="rtl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {/* المنتجات الديناميكية هنا */}
                      {productOptions.map((prod: string) => (
                        <SelectItem key={prod} value={prod}>{prod}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block text-right">الكمية</label>
                    <Input type="number" min="0" step="1" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block text-right">سعر الوحدة</label>
                    <Input type="number" min="0" step="0.5" value={editUnitPrice} onChange={(e) => setEditUnitPrice(e.target.value)} />
                  </div>
                </div>
                {calculatedEditAmount > 0 && (
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <span className="text-sm text-muted-foreground">الإجمالي: </span>
                    <span className="text-lg font-bold text-destructive">{calculatedEditAmount.toLocaleString("ar-EG")} ج.م</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block text-right">طريقة الدفع</label>
                  <Select value={editPaymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger dir="rtl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="نقدي">نقدي</SelectItem>
                      <SelectItem value="بريد">بريد</SelectItem>
                      <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                      <SelectItem value="فودافون كاش">فودافون كاش</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-right">المبلغ</label>
                  <Input type="number" min="0" step="0.01" value={editCreditAmount} onChange={(e) => setEditCreditAmount(e.target.value)} />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block text-right">ملاحظات إضافية (اختياري)</label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="أي تفاصيل إضافية..." />
            </div>

            {calculatedEditAmount > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <span className="text-xs text-muted-foreground block mb-1 text-right">التفاصيل الجديدة:</span>
                <span className="text-sm font-medium text-right block">{autoEditDescription}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              className="w-full gap-2" 
              disabled={calculatedEditAmount <= 0}
              onClick={() => {
                updateMutation.mutate({
                  id: editItem.id,
                  date: format(editDate, "yyyy-MM-dd"),
                  description: autoEditDescription,
                  debit: editType === "debit" ? calculatedEditAmount : 0,
                  credit: editType === "credit" ? calculatedEditAmount : 0,
                });
              }}
            >
              <Save className="h-4 w-4" /> حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذه العملية؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف العملية نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountStatement;
