import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Printer } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

const AccountStatement = () => {
  const [partnerId, setPartnerId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
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

  const selectedPartner = partners?.find((p) => p.id === partnerId);

  // Calculate accumulated balance
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
          th { background: #4a6fa5; color: white; padding: 10px 8px; font-size: 14px; }
          td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 13px; text-align: center; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 3px solid #4a6fa5; padding-bottom: 15px; }
          .debit { color: #dc2626; font-weight: bold; }
          .credit { color: #16a34a; font-weight: bold; }
          .total-row { background: #f0f4f8; font-weight: bold; }
          .balance-row { background: #4a6fa5; color: white; font-weight: bold; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.print();
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
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
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
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
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

      {/* Printable Statement */}
      {partnerId && (
        <div ref={printRef}>
          {/* Header */}
          <div className="flex justify-between items-center border-b-4 border-primary pb-4 mb-4">
            <div className="text-right">
              <h2 className="text-xl font-bold">الديب لتجارة الأعلاف والدواجن</h2>
              <p className="text-sm text-muted-foreground">جميع أنواع الأعلاف والدواجن</p>
            </div>
            <div className="text-center">
              <div className="text-6xl">🐔</div>
              <p className="font-bold text-lg mt-1">كشف حساب: {selectedPartner?.name}</p>
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold">Ahmed Al-Deeb</h2>
              <p className="text-sm text-muted-foreground">Farm & Feed Trading</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-table-header text-table-header-foreground">
                <th className="p-3 text-center font-bold">التاريخ</th>
                <th className="p-3 text-center font-bold">التفاصيل</th>
                <th className="p-3 text-center font-bold">عليه</th>
                <th className="p-3 text-center font-bold">له</th>
                <th className="p-3 text-center font-bold">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    لا توجد عمليات
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((r, i) => (
                    <tr key={r.id} className={cn("border-b border-border", i % 2 === 0 ? "bg-card" : "bg-muted/30")}>
                      <td className="p-3 text-center text-sm">{format(new Date(r.date), "yyyy/MM/dd")}</td>
                      <td className="p-3 text-center text-sm">{r.description}</td>
                      <td className="p-3 text-center font-bold text-destructive">
                        {Number(r.debit) > 0 ? Number(r.debit).toLocaleString("ar-EG") : "-"}
                      </td>
                      <td className="p-3 text-center font-bold text-success">
                        {Number(r.credit) > 0 ? Number(r.credit).toLocaleString("ar-EG") : "-"}
                      </td>
                      <td className={cn("p-3 text-center font-bold", r.balance > 0 ? "text-destructive" : "text-success")}>
                        {r.balance.toLocaleString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-muted font-bold border-t-2 border-primary">
                    <td className="p-3 text-center" colSpan={2}>إجمالي العمليات</td>
                    <td className="p-3 text-center text-destructive">{totalDebit.toLocaleString("ar-EG")}</td>
                    <td className="p-3 text-center text-success">{totalCredit.toLocaleString("ar-EG")}</td>
                    <td className="p-3 text-center">-</td>
                  </tr>
                  {/* Final Balance Row */}
                  <tr className="bg-primary text-primary-foreground font-bold">
                    <td className="p-3 text-center" colSpan={4}>الرصيد الإجمالي</td>
                    <td className="p-3 text-center text-lg">{finalBalance.toLocaleString("ar-EG")}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AccountStatement;
