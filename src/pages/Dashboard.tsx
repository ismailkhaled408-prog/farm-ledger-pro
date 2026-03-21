import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingDown, TrendingUp, DollarSign, ChevronDown, ChevronUp, ShoppingCart, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type Section = "debtors" | "recent" | null;
type FilterType = "all" | "client" | "supplier";

const Dashboard = () => {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState<Section>(null);
  const [filterType, setFilterType] = useState<FilterType>("all");

  const { data: partners } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*");
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
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredPartnerIds = new Set(
    partners
      ?.filter((p) => filterType === "all" || p.type === filterType)
      .map((p) => p.id) ?? []
  );

  const filteredTransactions = transactions?.filter((t) => filteredPartnerIds.has(t.partner_id)) ?? [];

  const totalPartners = partners?.filter((p) => filterType === "all" || p.type === filterType).length ?? 0;
  const totalDebit = filteredTransactions.reduce((sum, t) => sum + Number(t.debit), 0);
  const totalCredit = filteredTransactions.reduce((sum, t) => sum + Number(t.credit), 0);
  const netBalance = totalDebit - totalCredit;

  // Partner balances
  const partnerBalances = new Map<string, { name: string; balance: number; type: string }>();
  filteredTransactions.forEach((t) => {
    const p = t.partners as any;
    const name = p?.name ?? "غير معروف";
    const type = p?.type ?? "client";
    const existing = partnerBalances.get(t.partner_id) ?? { name, balance: 0, type };
    existing.balance += Number(t.debit) - Number(t.credit);
    partnerBalances.set(t.partner_id, existing);
  });

  const topDebtors = Array.from(partnerBalances.values())
    .filter((p) => p.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  const recentTransactions = filteredTransactions.slice(0, 10);

  const toggle = (section: Section) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const kpis = [
    {
      label: filterType === "supplier" ? "الموردين" : filterType === "client" ? "العملاء" : "الشركاء",
      value: totalPartners,
      icon: Users,
      gradient: "from-primary/20 to-primary/5",
      iconColor: "text-primary",
      action: () => navigate("/partners"),
    },
    {
      label: filterType === "supplier" ? "المشتريات" : "المديونيات",
      value: totalDebit.toLocaleString("ar-EG"),
      icon: ShoppingCart,
      gradient: "from-destructive/20 to-destructive/5",
      iconColor: "text-destructive",
      action: () => toggle("debtors"),
    },
    {
      label: filterType === "supplier" ? "المدفوع لهم" : "المدفوعات",
      value: totalCredit.toLocaleString("ar-EG"),
      icon: Wallet,
      gradient: "from-success/20 to-success/5",
      iconColor: "text-success",
      action: () => toggle("recent"),
    },
    {
      label: "صافي الأرصدة",
      value: netBalance.toLocaleString("ar-EG"),
      icon: DollarSign,
      gradient: netBalance > 0 ? "from-destructive/20 to-destructive/5" : "from-success/20 to-success/5",
      iconColor: netBalance > 0 ? "text-destructive" : "text-success",
      action: () => toggle("debtors"),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg md:text-2xl font-bold">لوحة التحكم</h1>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
          <SelectTrigger className="w-28 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="client">العملاء</SelectItem>
            <SelectItem value="supplier">الموردين</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className={cn("cursor-pointer active:scale-[0.97] transition-all border-0 bg-gradient-to-br", kpi.gradient)}
            onClick={kpi.action}
          >
            <CardContent className="p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-medium">{kpi.label}</span>
                <kpi.icon className={cn("h-4 w-4", kpi.iconColor)} />
              </div>
              <div className={cn("text-base md:text-xl font-bold", kpi.iconColor)}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Debtors */}
      <Card className="border-0 bg-card/80">
        <CardHeader
          className="cursor-pointer flex flex-row items-center justify-between p-3 pb-2"
          onClick={() => toggle("debtors")}
        >
          <CardTitle className="text-sm font-bold">
            {filterType === "supplier" ? "أعلى الموردين المستحقين" : "أعلى العملاء المدينين"}
          </CardTitle>
          {openSection === "debtors" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CardHeader>
        {openSection === "debtors" && (
          <CardContent className="p-3 pt-0">
            {topDebtors.length === 0 ? (
              <p className="text-muted-foreground text-xs">لا توجد بيانات</p>
            ) : (
              <div className="space-y-2">
                {topDebtors.map((d, i) => (
                  <div key={i} className="flex justify-between items-center bg-muted/30 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{d.name}</span>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                        d.type === "supplier"
                          ? "bg-accent/20 text-accent"
                          : "bg-primary/20 text-primary"
                      )}>
                        {d.type === "supplier" ? "مورد" : "عميل"}
                      </span>
                    </div>
                    <span className="font-bold text-xs text-destructive">{d.balance.toLocaleString("ar-EG")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Recent Transactions */}
      <Card className="border-0 bg-card/80">
        <CardHeader
          className="cursor-pointer flex flex-row items-center justify-between p-3 pb-2"
          onClick={() => toggle("recent")}
        >
          <CardTitle className="text-sm font-bold">آخر العمليات</CardTitle>
          {openSection === "recent" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CardHeader>
        {openSection === "recent" && (
          <CardContent className="p-3 pt-0">
            {recentTransactions.length === 0 ? (
              <p className="text-muted-foreground text-xs">لا توجد عمليات</p>
            ) : (
              <div className="space-y-1.5">
                {recentTransactions.map((t) => {
                  const partnerType = (t.partners as any)?.type;
                  return (
                    <div key={t.id} className="flex justify-between items-center text-xs bg-muted/30 rounded-lg p-2 gap-2">
                      <div className="min-w-0 flex-1 flex items-center gap-1.5">
                        <span className={cn(
                          "shrink-0 w-1.5 h-1.5 rounded-full",
                          partnerType === "supplier" ? "bg-accent" : "bg-primary"
                        )} />
                        <span className="font-medium truncate">{(t.partners as any)?.name}</span>
                        <span className="text-muted-foreground truncate hidden sm:inline">- {t.description}</span>
                      </div>
                      <div className="shrink-0">
                        {Number(t.debit) > 0 && <span className="text-destructive font-bold">{Number(t.debit).toLocaleString("ar-EG")}</span>}
                        {Number(t.credit) > 0 && <span className="text-success font-bold">{Number(t.credit).toLocaleString("ar-EG")}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
