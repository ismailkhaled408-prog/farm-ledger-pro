import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const NewTransaction = () => {
  const queryClient = useQueryClient();
  const [partnerId, setPartnerId] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"debit" | "credit">("debit");
  const [amount, setAmount] = useState("");

  const { data: partners } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const numAmount = parseFloat(amount);
      if (!partnerId || !description || isNaN(numAmount) || numAmount <= 0) {
        throw new Error("بيانات غير صحيحة");
      }
      const { error } = await supabase.from("transactions").insert({
        partner_id: partnerId,
        date: format(date, "yyyy-MM-dd"),
        description,
        debit: type === "debit" ? numAmount : 0,
        credit: type === "credit" ? numAmount : 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-all"] });
      setDescription("");
      setAmount("");
      toast.success("تمت إضافة العملية بنجاح");
    },
    onError: (e) => toast.error(e.message || "حدث خطأ"),
  });

  const isValid = partnerId && description && amount && parseFloat(amount) > 0;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">إضافة عملية جديدة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">العميل/المورد</label>
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر..." />
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
            <label className="text-sm font-medium mb-1 block">التاريخ</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start")}>
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {format(date, "yyyy/MM/dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">التفاصيل</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: 5000 محمد نور، أو بريد (دفع نقدي)" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">النوع</label>
            <Select value={type} onValueChange={(v) => setType(v as "debit" | "credit")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debit">عليه (سحب بضاعة)</SelectItem>
                <SelectItem value="credit">له (دفع نقدي / بريد)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">المبلغ</label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>

          <Button className="w-full gap-2" disabled={!isValid || mutation.isPending} onClick={() => mutation.mutate()}>
            <Save className="h-4 w-4" />
            {mutation.isPending ? "جاري الحفظ..." : "حفظ العملية"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewTransaction;
