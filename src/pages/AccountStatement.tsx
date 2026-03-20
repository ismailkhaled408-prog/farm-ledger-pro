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
  
  const [editItem, setEditItem] = useState<any>(null);
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editType, setEditType] = useState<"debit" | "credit">("debit");
  const [editProductName, setEditProductName] = useState("");
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
      toast.success("تم الحذف بنجاح");
      setDeleteId(null);
    },
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
      toast.success("تم التحديث بنجاح");
      setEditItem(null);
    },
  });

  const selectedPartner = partners?.find((p) => p.id === partnerId);
  const isSupplier = selectedPartner?.type === "supplier";
  const productOptions = bizSettings?.products || ["فراخ", "علف", "بيض", "أخرى"];

  const handleEditClick = (r: any) => {
    setEditDate(new Date(r.date));
    const isDebit = Number(r.debit) > 0;
    setEditType(isDebit ? "debit" : "credit");
    
    // Logic لفصل الوصف
    let parsedProduct = productOptions[0];
    let parsedQty = "";
    let parsedPrice = "";
    let parsedNotes = "";
    
    const desc = r.description || "";
    if (isDebit) {
      const parts = desc.split(" - ");
      if (parts.length > 0 && productOptions.includes(parts[0].trim())) parsedProduct = parts[0].trim();
      if (parts.length > 1) {
        const qp = parts[1].split(" ج.م")[0].split("×");
        if (qp.length === 2) { parsedQty = qp[0].trim(); parsedPrice = qp[1].trim(); }
      }
    } else {
      setEditCreditAmount(r.credit.toString());
    }
    
    setEditProductName(parsedProduct);
    setEditQuantity(parsedQty);
    setEditUnitPrice(parsedPrice);
    setEditItem(r);
  };

  const calculatedEditAmount = editType === "debit" 
    ? (parseFloat(editQuantity) || 0) * (parseFloat(editUnitPrice) || 0) 
    : parseFloat(editCreditAmount) || 0;

  const autoEditDescription = editType === "debit"
    ? `${editProductName} - ${editQuantity} × ${editUnitPrice} ج.م${editNotes ? ` (${editNotes})` : ""}`
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
    win?.document.write(`
      <html dir="rtl">
      <head>
        <title>كشف حساب</title>
        <style>
          body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background: #1a2332; color: white; }
          .no-print { display: none; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    win?.document.close();
    setTimeout(() => { win?.print(); win?.close(); }, 500);
  };

  return (
    <div className="p-2 md:p-6 space-y-4" dir="rtl">
      <h1 className="text-xl md:text-2xl font-bold text-right">كشف حساب</h1>

      {/* Filters - Responsive Grid */}
      <div className="no-print grid grid-cols-1 md:grid-cols-4 gap-2 items-end bg-muted/30 p-3 rounded-lg">
        <div className="text-right">
          <label className="text-[10px] md:text-xs font-bold block mb-1">العميل</label>
          <Select value={partnerId} onValueChange={setPartnerId}>
            <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
            <SelectContent>
              {partners?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2 md:col-span-2">
            <div>
              <label className="text-[10px] font-bold block mb-1">من</label>
              <Button variant="outline" className="w-full text-xs" onClick={() => {}}>{dateFrom ? format(dateFrom, "MM/dd") : "التاريخ"}</Button>
            </div>
            <div>
              <label className="text-[10px] font-bold block mb-1">إلى</label>
              <Button variant="outline" className="w-full text-xs">{dateTo ? format(dateTo, "MM/dd") : "التاريخ"}</Button>
            </div>
        </div>
        <Button onClick={handlePrint} className="w-full"><Printer className="ml-2 h-4 w-4" /> طباعة</Button>
      </div>

      {/* Table Section */}
      {partnerId && (
        <div ref={printRef} className="w-full overflow-hidden">
          <div className="text-center mb-4 border-b-4 border-primary pb-2">
             <h2 className="text-lg font-bold">كشف حساب: {selectedPartner?.name}</h2>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full border-collapse text-[10px] md:text-sm">
              <thead className="bg-table-header text-table-header-foreground">
                <tr>
                  <th className="p-1 md:p-3 border">تاريخ</th>
                  <th className="p-1 md:p-3 border min-w-[70px]">التفاصيل</th>
                  <th className="p-1 md:p-3 border">{isSupplier ? "عليه" : "له"}</th>
                  <th className="p-1 md:p-3 border">{isSupplier ? "له" : "عليه"}</th>
                  <th className="p-1 md:p-3 border">رصيد</th>
                  <th className="p-1 md:p-3 border no-print">تعديل</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={cn("border-b", i % 2 === 0 ? "bg-card" : "bg-muted/10")}>
                    <td className="p-1 text-center whitespace-nowrap">{format(new Date(r.date), "MM/dd")}</td>
                    <td className="p-1 text-right leading-tight max-w-[120px] truncate md:max-w-none md:whitespace-normal">{r.description}</td>
                    <td className="p-1 text-center font-bold text-destructive">{Number(r.debit) || "-"}</td>
                    <td className="p-1 text-center font-bold text-success">{Number(r.credit) || "-"}</td>
                    <td className="p-1 text-center font-bold">{r.balance}</td>
                    <td className="p-1 text-center no-print">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditClick(r)}>
                        <Pencil className="h-3 w-3 text-blue-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-primary/5 font-bold border-t-2 border-primary">
                  <td className="p-1" colSpan={2}>إجمالي العمليات</td>
                  <td className="p-1 text-center text-destructive">{totalDebit}</td>
                  <td className="p-1 text-center text-success">{totalCredit}</td>
                  <td className="p-1 text-center bg-primary/10">{finalBalance}</td>
                  <td className="no-print"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Dialog - Responsive */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-[400px] p-4 overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-right">تعديل عملية</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 text-right" dir="rtl">
            <div>
              <label className="text-xs font-bold">التاريخ</label>
              <Input type="date" value={format(editDate, "yyyy-MM-dd")} onChange={(e) => setEditDate(new Date(e.target.value))} className="h-9" />
            </div>
            <div>
              <label className="text-xs font-bold">المنتج</label>
              <Select value={editProductName} onValueChange={setEditProductName}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{productOptions.map((p:any) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs font-bold">الكمية</label><Input type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} /></div>
              <div><label className="text-xs font-bold">السعر</label><Input type="number" value={editUnitPrice} onChange={(e) => setEditUnitPrice(e.target.value)} /></div>
            </div>
            <div className="bg-muted p-2 rounded text-center text-sm font-bold text-primary">الإجمالي: {calculatedEditAmount}</div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => updateMutation.mutate({
              id: editItem.id,
              date: format(editDate, "yyyy-MM-dd"),
              description: autoEditDescription,
              debit: editType === "debit" ? calculatedEditAmount : 0,
              credit: editType === "credit" ? calculatedEditAmount : 0
            })}><Save className="ml-2 h-4 w-4" /> حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountStatement;
