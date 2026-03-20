import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type FilterType = "all" | "client" | "supplier";

const Statistics = () => {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { data: partners } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, partners(name, type)")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Filter transactions by type and date
  const filtered = (transactions ?? []).filter((t) => {
    const p = t.partners as any;
    if (filterType !== "all" && p?.type !== filterType) return false;
    if (dateFrom && t.date < format(dateFrom, "yyyy-MM-dd")) return false;
    if (dateTo && t.date > format(dateTo, "yyyy-MM-dd")) return false;
    return true;
  });

  // Build per-partner stats
  const statsMap = new Map<string, {
    name: string;
    type: string;
    totalDebit: number;
    totalCredit: number;
    transactionCount: number;
  }>();

  filtered.forEach((t) => {
    const p = t.partners as any;
    const name = p?.name ?? "غير معروف";
    const type = p?.type ?? "client";
    const existing = statsMap.get(t.partner_id) ?? {
      name, type, totalDebit: 0, totalCredit: 0, transactionCount: 0,
    };
    existing.totalDebit += Number(t.debit);
    existing.totalCredit += Number(t.credit);
    existing.transactionCount += 1;
    statsMap.set(t.partner_id, existing);
  });

  const stats = Array.from(statsMap.values()).sort((a, b) => (b.totalDebit - b.totalCredit) - (a.totalDebit - a.totalCredit));

  const grandDebit = stats.reduce((s, r) => s + r.totalDebit, 0);
  const grandCredit = stats.reduce((s, r) => s + r.totalCredit, 0);
  const grandBalance = grandDebit - grandCredit;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">📊 الإحصائيات</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
        <div>
          <label className="text-sm font-medium mb-1 block">النوع</label>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="client">العملاء</SelectItem>
              <SelectItem value="supplier">الموردين</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">من تاريخ</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-40 justify-start", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="ml-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "yyyy/MM/dd") : "اختر"}
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
              <Button variant="outline" className={cn("w-40 justify-start", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="ml-2 h-4 w-4" />
                {dateTo ? format(dateTo, "yyyy/MM/dd") : "اختر"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
            مسح التاريخ
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">{filterType === "supplier" ? "إجمالي المشتريات" : "إجمالي المديونيات"}</p>
            <p className="text-lg font-bold text-destructive">{grandDebit.toLocaleString("ar-EG")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-success mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">إجمالي المدفوعات</p>
            <p className="text-lg font-bold text-success">{grandCredit.toLocaleString("ar-EG")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className={cn("h-5 w-5 mx-auto mb-1", grandBalance > 0 ? "text-destructive" : "text-success")} />
            <p className="text-xs text-muted-foreground">الصافي</p>
            <p className={cn("text-lg font-bold", grandBalance > 0 ? "text-destructive" : "text-success")}>
              {grandBalance.toLocaleString("ar-EG")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">تفاصيل حسب {filterType === "supplier" ? "المورد" : filterType === "client" ? "العميل" : "الشريك"}</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">لا توجد بيانات</p>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full border-collapse min-w-[450px]">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-3 text-right text-sm font-bold">الاسم</th>
                    <th className="p-3 text-center text-sm font-bold">النوع</th>
                    <th className="p-3 text-center text-sm font-bold">عدد العمليات</th>
                    <th className="p-3 text-center text-sm font-bold">{filterType === "supplier" ? "مشتريات" : "عليه"}</th>
                    <th className="p-3 text-center text-sm font-bold">{filterType === "supplier" ? "مدفوعات" : "دفع"}</th>
                    <th className="p-3 text-center text-sm font-bold">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s, i) => {
                    const balance = s.totalDebit - s.totalCredit;
                    return (
                      <tr key={i} className={cn("border-b border-border", i % 2 === 0 ? "bg-card" : "bg-muted/30")}>
                        <td className="p-3 text-right text-sm font-medium">{s.name}</td>
                        <td className="p-3 text-center">
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded",
                            s.type === "supplier" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"
                          )}>
                            {s.type === "supplier" ? "مورد" : "عميل"}
                          </span>
                        </td>
                        <td className="p-3 text-center text-sm">{s.transactionCount}</td>
                        <td className="p-3 text-center text-sm font-bold text-destructive">
                          {s.totalDebit.toLocaleString("ar-EG")}
                        </td>
                        <td className="p-3 text-center text-sm font-bold text-success">
                          {s.totalCredit.toLocaleString("ar-EG")}
                        </td>
                        <td className={cn("p-3 text-center text-sm font-bold", balance > 0 ? "text-destructive" : "text-success")}>
                          {balance.toLocaleString("ar-EG")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Statistics;
