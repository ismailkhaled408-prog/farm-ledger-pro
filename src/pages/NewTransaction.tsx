import { useState, useEffect } from "react";
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
  const [type, setType] = useState<"debit" | "credit">("debit");

  // Debit fields (purchase)
  const [productName, setProductName] = useState("فراخ");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  // Credit fields (payment)
  const [creditAmount, setCreditAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");

  // Extra notes
  const [notes, setNotes] = useState("");

  const calculatedAmount = type === "debit"
    ? (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0)
    : parseFloat(creditAmount) || 0;

  const autoDescription = type === "debit"
    ? `${productName} - ${quantity || "0"} × ${unitPrice || "0"} ج.م${notes ? ` (${notes})` : ""}`
    : `دفع ${paymentMethod}${notes ? ` - ${notes}` : ""}`;

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
      if (!partnerId || calculatedAmount <= 0) {
        throw new Error("بيانات غير صحيحة");
      }
      const { error } = await supabase.from("transactions").insert({
        partner_id: partnerId,
        date: format(date, "yyyy-MM-dd"),
        description: autoDescription,
        debit: type === "debit" ? calculatedAmount : 0,
        credit: type === "credit" ? calculatedAmount : 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-all"] });
      setQuantity("");
      setUnitPrice("");
      setCreditAmount("");
      setNotes("");
      toast.success("تمت إضافة العملية بنجاح");
    },
    onError: (e) => toast.error(e.message || "حدث خطأ"),
  });

  const isValid = partnerId && calculatedAmount > 0;

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
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

          {type === "debit" ? (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">اسم المنتج</label>
                <Select value={productName} onValueChange={setProductName}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="فراخ">فراخ</SelectItem>
                    <SelectItem value="علف">علف</SelectItem>
                    <SelectItem value="بيض">بيض</SelectItem>
                    <SelectItem value="أخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">الكمية</label>
                  <Input type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="مثال: 50" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">سعر الوحدة</label>
                  <Input type="number" min="0" step="0.5" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="مثال: 85" />
                </div>
              </div>
              {calculatedAmount > 0 && (
                <div className="bg-muted rounded-lg p-3 text-center">
                  <span className="text-sm text-muted-foreground">الإجمالي: </span>
                  <span className="text-lg font-bold text-destructive">{calculatedAmount.toLocaleString("ar-EG")} ج.م</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">طريقة الدفع</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="نقدي">نقدي</SelectItem>
                    <SelectItem value="بريد">بريد</SelectItem>
                    <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                    <SelectItem value="فودافون كاش">فودافون كاش</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">المبلغ</label>
                <Input type="number" min="0" step="0.01" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="0.00" />
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium mb-1 block">ملاحظات إضافية (اختياري)</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي تفاصيل إضافية..." />
          </div>

          {/* Auto-generated description preview */}
          {calculatedAmount > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <span className="text-xs text-muted-foreground block mb-1">التفاصيل (تلقائي):</span>
              <span className="text-sm font-medium">{autoDescription}</span>
            </div>
          )}

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
