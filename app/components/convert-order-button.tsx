"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function ConvertOrderButton({ quoteId, existingOrderNo }: { quoteId: string; existingOrderNo?: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  if (existingOrderNo) return <span className="converted-order-chip"><BadgeCheck/>{existingOrderNo}</span>;
  async function convert() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/quotes/${encodeURIComponent(quoteId)}/convert`, { method: "POST" });
      if (!response.ok) throw new Error("convert failed");
      const result = await response.json() as { order: { orderNo: string } };
      toast.success(`${result.order.orderNo} захиалга үүслээ`);
      router.push("/admin#orders");
      router.refresh();
    } catch { toast.error("Захиалга үүсгэж чадсангүй"); }
    finally { setLoading(false); }
  }
  return <AlertDialog>
    <AlertDialogTrigger className="convert-order-button"><BadgeCheck/>Захиалга болгох</AlertDialogTrigger>
    <AlertDialogContent className="bg-white text-slate-900 border-slate-200">
      <AlertDialogHeader><AlertDialogTitle>Захиалга үүсгэх үү?</AlertDialogTitle><AlertDialogDescription>Үнийн саналын автомашин, харилцагч, төлбөрийн мэдээллийг шинэ захиалгад хуулна. Энэ хүсэлт дахин захиалга болж давхардахгүй.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Буцах</AlertDialogCancel><AlertDialogAction onClick={convert} disabled={loading}>{loading && <Loader2 className="animate-spin"/>}Захиалга үүсгэх</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
