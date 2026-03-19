import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingDown, TrendingUp, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Section = "debtors" | "recent" | null;

const Dashboard = () => {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState<Section>(null);

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

  const totalPartners = partners?.length ?? 0;
  const totalDebit = transactions?.reduce((sum, t) => sum + Number(t.debit), 0) ?? 0;
  const totalCredit = transactions?.reduce((sum, t) => sum + Number(t.credit), 0) ?? 0;
  const netBalance = totalDebit - totalCredit;

  // Top debtors (clients who owe us)
  const partnerBalances = new Map<string, { name: string; balance: number; type: string }>();
  transactions?.forEach((t) => {
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

  const recentTransactions = transactions?.slice(0, 10) ?? [];

  const toggle = (section: Section) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const kpis = [
    {
      label: "إجمالي العملاء",
      value: totalPartners,
      icon: Users,
      color: "text-primary",
      action: () => navigate("/partners"),
    },
    {
      label: "إجمالي المديونيات",
      value: totalDebit.toLocaleString("ar-EG"),
      icon: TrendingDown,
      color: "text-destructive",
      action: () => toggle("debtors"),
    },
    {
      label: "إجمالي المدفوعات",
      value: totalCredit.toLocaleString("ar-EG"),
      icon: TrendingUp,
      color: "text-success",
      action: () => toggle("recent"),
    },
    {
      label: "صافي الأرصدة",
      value: netBalance.toLocaleString("ar-EG"),
      icon: DollarSign,
      color: netBalance > 0 ? "text-destructive" : "text-success",
      action: () => toggle("debtors"),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">لوحة التحكم</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className="cursor-pointer active:scale-95 transition-transform"
            onClick={kpi.action}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 md:h-5 md:w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className={`text-lg md:text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expandable: Top Debtors */}
      <Card>
        <CardHeader
          className="cursor-pointer flex flex-row items-center justify-between"
          onClick={() => toggle("debtors")}
        >
          <CardTitle className="text-lg">أعلى العملاء المدينين</CardTitle>
          {openSection === "debtors" ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </CardHeader>
        {openSection === "debtors" && (
          <CardContent>
            {topDebtors.length === 0 ? (
              <p className="text-muted-foreground text-sm">لا توجد بيانات</p>
            ) : (
              <div className="space-y-3">
                {topDebtors.map((d, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{d.name}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        d.type === "supplier" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"
                      )}>
                        {d.type === "supplier" ? "مورد" : "عميل"}
                      </span>
                    </div>
                    <span className="font-bold text-destructive">{d.balance.toLocaleString("ar-EG")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Expandable: Recent Transactions */}
      <Card>
        <CardHeader
          className="cursor-pointer flex flex-row items-center justify-between"
          onClick={() => toggle("recent")}
        >
          <CardTitle className="text-lg">آخر العمليات</CardTitle>
          {openSection === "recent" ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </CardHeader>
        {openSection === "recent" && (
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">لا توجد عمليات</p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="flex justify-between items-center text-xs md:text-sm border-b border-border pb-2 gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{(t.partners as any)?.name}</span>
                      <span className="text-muted-foreground mx-1">-</span>
                      <span className="text-muted-foreground truncate">{t.description}</span>
                    </div>
                    <div>
                      {Number(t.debit) > 0 && <span className="text-destructive font-bold">{Number(t.debit).toLocaleString("ar-EG")}</span>}
                      {Number(t.credit) > 0 && <span className="text-success font-bold">{Number(t.credit).toLocaleString("ar-EG")}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
