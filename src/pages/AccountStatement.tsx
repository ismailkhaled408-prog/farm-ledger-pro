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
  
  // States for Delete & Edit
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  
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

  // Mutation for Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("تم حذف العملية بنجاح");
      setDeleteId(null);
    },
  });

  // Mutation for Update
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase
        .from("transactions")
        .update({
          date: payload.date,
          description: payload.description,
          debit: parseFloat(payload.debit) || 0,
          credit: parseFloat(payload.credit) || 0,
        })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("تم تحديث البيانات بنجاح");
      setEditItem(null);
    },
    onError: () => toast.error("حدث خطأ أثناء التحديث"),
  });

  const selectedPartner = partners?.find((p) => p.id === partnerId);
  const isSupplier = selectedPartner?.type === "supplier";

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
          body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #1a2332; color: white; padding: 10px; }
          td { padding: 8px; border-bottom: 1px solid #ddd; text-align: center; }
          .no-print { display: none !important; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body>
      </html>
    `);
    win.document.close();
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
              <Button variant="outline" className={cn("w-44 justify-start", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="ml-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "yyyy/MM/dd") : "اختر تاريخ"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">إلى تاريخ</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-44 justify-start", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="ml-2 h-4 w-4" />
                {dateTo ? format(dateTo, "yyyy/MM/dd") : "اختر تاريخ"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
            </PopoverContent>
          </Popover>
        </div>

        {partnerId && (
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            طباعة PDF
          </Button>
        )}
      </div>

      {/* Table Section */}
      {partnerId && (
        <div ref={printRef}>
          <div className="flex justify-between items-center border-b-4 border-primary pb-4 mb-4">
             <div className="text-center w-full">
                <h2 className="text-2xl font-bold">كشف حساب: {selectedPartner?.name}</h2>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">التفاصيل</th>
                  <th className="p-3">{isSupplier ? "مشتريات" : "عليه"}</th>
                  <th className="p-3">{isSupplier ? "مدفوعات" : "له"}</th>
                  <th className="p-3">الرصيد</th>
                  <th className="p-3 no-print">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={cn("border-b", i % 2 === 0 ? "bg-white" : "bg-slate-50")}>
                    <td className="p-3 text-center">{format(new Date(r.date), "yyyy/MM/dd")}</td>
                    <td className="p-3 text-center">{r.description}</td>
                    <td className="p-3 text-center text-red-600 font-bold">{Number(r.debit) || "-"}</td>
                    <td className="p-3 text-center text-green-600 font-bold">{Number(r.credit) || "-"}</td>
                    <td className="p-3 text-center font-bold">{r.balance.toLocaleString("ar-EG")}</td>
                    <td className="p-3 text-center no-print flex justify-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setEditItem(r)} className="text-blue-600">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)} className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                
                {/* صف إجمالي العمليات اللي طلبته */}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-800">
                  <td className="p-3 text-center" colSpan={2}>إجمالي العمليات</td>
                  <td className="p-3 text-center text-red-600">{totalDebit.toLocaleString("ar-EG")}</td>
                  <td className="p-3 text-center text-green-600">{totalCredit.toLocaleString("ar-EG")}</td>
                  <td className="p-3 text-center bg-slate-200">الصافي: {finalBalance.toLocaleString("ar-EG")}</td>
                  <td className="no-print"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تعديل العملية</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">التفاصيل</label>
              <Input 
                value={editItem?.description || ""} 
                onChange={(e) => setEditItem({...editItem, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">عليه / مدين</label>
                <Input 
                  type="number"
                  value={editItem?.debit || 0} 
                  onChange={(e) => setEditItem({...editItem, debit: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">له / دائن</label>
                <Input 
                  type="number"
                  value={editItem?.credit || 0} 
                  onChange={(e) => setEditItem({...editItem, credit: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full gap-2" onClick={() => updateMutation.mutate(editItem)}>
              <Save className="h-4 w-4" /> حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">حذف العملية؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيتم مسح البيانات نهائياً من الحساب.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>حذف</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountStatement;
