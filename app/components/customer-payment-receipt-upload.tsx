"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";

const paymentTypes = { DEPOSIT: "Барьцаа", VEHICLE: "Автомашины төлбөр", SHIPPING: "Тээврийн төлбөр", CUSTOMS: "Гааль, татвар", OTHER: "Бусад төлбөр" };

export function CustomerPaymentReceiptUpload({ orderId }: { orderId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [paymentType, setPaymentType] = useState("DEPOSIT");
  const [amountMnt, setAmountMnt] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("Төлбөрийн баримтын файлаа сонгоно уу."); return; }
    const body = new FormData(); body.set("file", file); body.set("paymentType", paymentType); body.set("amountMnt", amountMnt); body.set("referenceNo", referenceNo);
    setBusy(true);
    try {
      const response = await fetch(`/api/portal/orders/${encodeURIComponent(orderId)}/payment-receipts`, { method: "POST", body });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error === "unsupported file" ? "PDF, JPG, PNG, DOC, DOCX төрлийн 10MB хүртэл файл оруулна уу." : "Төлбөрийн баримт илгээхэд алдаа гарлаа.");
      setAmountMnt(""); setReferenceNo(""); if (fileRef.current) fileRef.current.value = "";
      toast.success("Төлбөрийн баримт илгээгдлээ. Админ баталгаажуулна."); router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Төлбөрийн баримт илгээхэд алдаа гарлаа."); }
    finally { setBusy(false); }
  }

  return <section className="customer-payment-receipt-upload"><div><strong>Төлбөрийн баримт илгээх</strong><small>Банкны шилжүүлгийн баримтаа хавсаргана уу. Админ шалгасны дараа төлөлт баталгаажна.</small></div><form onSubmit={submit}><label><span>Төлбөрийн төрөл</span><Select value={paymentType} onValueChange={setPaymentType}><SelectTrigger className="payment-select"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(paymentTypes).map(([value, label]) => <SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectContent></Select></label><label><span>Төлсөн дүн (₮)</span><Input type="number" min="1" step="1" value={amountMnt} onChange={(event) => setAmountMnt(event.target.value)} required placeholder="0" /></label><label><span>Гүйлгээний дугаар</span><Input value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} placeholder="Заавал биш" /></label><label className="customer-document-file"><span>Баримтын файл</span><input ref={fileRef} type="file" required accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" /><small>PDF, JPG, PNG, DOC, DOCX · 10MB хүртэл</small></label><Button type="submit" disabled={busy}><UploadCloud />{busy ? "Илгээж байна..." : "Баримт илгээх"}</Button></form></section>;
}
