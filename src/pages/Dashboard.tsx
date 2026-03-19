import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingDown, TrendingUp, DollarSign } from "lucide-react";

const Dashboard = () => {
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
        .select("*, partners(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalPartners = partners?.length ?? 0;
  const totalDebit = transactions?.reduce((sum, t) => sum + Number(t.debit), 0) ?? 0;
  const totalCredit = transactions?.reduce((sum, t) => sum + Number(t.credit), 0) ?? 0;
  const netBalance = totalDebit - totalCredit;

  // Top debtors
  const partnerBalances = new Map<string, { name: string; balance: number }>();
  transactions?.forEach((t) => {
    const name = (t.partners as any)?.name ?? "غير معروف";
    const existing = partnerBalances.get(t.partner_id) ?? { name, balance: 0 };
    existing.balance += Number(t.debit) - Number(t.credit);
    partnerBalances.set(t.partner_id, existing);
  });
  const topDebtors = Array.from(partnerBalances.values())
    .filter((p) => p.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  const recentTransactions = transactions?.slice(0, 10) ?? [];

  const kpis = [
    { label: "إجمالي العملاء", value: totalPartners, icon: Users, color: "text-primary" },
    { label: "إجمالي المديونيات", value: totalDebit.toLocaleString("ar-EG"), icon: TrendingDown, color: "text-destructive" },
    { label: "إجمالي المدفوعات", value: totalCredit.toLocaleString("ar-EG"), icon: TrendingUp, color: "text-success" },
    { label: "صافي الأرصدة", value: netBalance.toLocaleString("ar-EG"), icon: DollarSign, color: netBalance > 0 ? "text-destructive" : "text-success" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">لوحة التحكم</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Debtors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">أعلى العملاء المدينين</CardTitle>
          </CardHeader>
          <CardContent>
            {topDebtors.length === 0 ? (
              <p className="text-muted-foreground text-sm">لا توجد بيانات</p>
            ) : (
              <div className="space-y-3">
                {topDebtors.map((d, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="font-medium">{d.name}</span>
                    <span className="font-bold text-destructive">{d.balance.toLocaleString("ar-EG")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">آخر العمليات</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">لا توجد عمليات</p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="flex justify-between items-center text-sm border-b pb-2">
                    <div>
                      <span className="font-medium">{(t.partners as any)?.name}</span>
                      <span className="text-muted-foreground mx-2">-</span>
                      <span className="text-muted-foreground">{t.description}</span>
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
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
