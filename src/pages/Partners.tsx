import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Partner = Database["public"]["Tables"]["partners"]["Row"];
type PartnerInsert = Database["public"]["Tables"]["partners"]["Insert"];

const Partners = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<PartnerInsert>({ name: "", type: "client", phone: "", notes: "" });

  const { data: partners, isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PartnerInsert & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from("partners").update(data).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partners").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      setOpen(false);
      setEditing(null);
      setForm({ name: "", type: "client", phone: "", notes: "" });
      toast.success("تم الحفظ بنجاح");
    },
    onError: () => toast.error("حدث خطأ أثناء الحفظ"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("تم الحذف بنجاح");
    },
    onError: () => toast.error("لا يمكن حذف هذا الشريك (قد تكون هناك عمليات مرتبطة)"),
  });

  const openEdit = (p: Partner) => {
    setEditing(p);
    setForm({ name: p.name, type: p.type, phone: p.phone ?? "", notes: p.notes ?? "" });
    setOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", type: "client", phone: "", notes: "" });
    setOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">العملاء والموردين</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              إضافة شريك
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل" : "إضافة"} شريك</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">الاسم</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم العميل/المورد" />
              </div>
              <div>
                <label className="text-sm font-medium">النوع</label>
                <Select value={form.type ?? "client"} onValueChange={(v) => setForm({ ...form, type: v as "client" | "supplier" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">عميل</SelectItem>
                    <SelectItem value="supplier">مورد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">رقم التليفون</label>
                <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" />
              </div>
              <div>
                <label className="text-sm font-medium">ملاحظات</label>
                <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات..." />
              </div>
              <Button
                className="w-full"
                disabled={!form.name || saveMutation.isPending}
                onClick={() => saveMutation.mutate(editing ? { ...form, id: editing.id } : form)}
              >
                {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الاسم</TableHead>
            <TableHead>النوع</TableHead>
            <TableHead>التليفون</TableHead>
            <TableHead>ملاحظات</TableHead>
            <TableHead className="w-24">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} className="text-center">جاري التحميل...</TableCell></TableRow>
          ) : partners?.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">لا يوجد شركاء</TableCell></TableRow>
          ) : (
            partners?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.type === "client" ? "عميل" : "مورد"}</TableCell>
                <TableCell>{p.phone ?? "-"}</TableCell>
                <TableCell className="max-w-48 truncate">{p.notes ?? "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default Partners;
