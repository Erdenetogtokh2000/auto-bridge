"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock3, Plus, ReceiptText } from "lucide-react";
import { toast } from "sonner";

type Payment = {
  id: string;
  paymentType: string;
  currency: string;
  amount: number;
  amountMnt: number;
  status: string;
  dueDate: string | null;
  referenceNo: string | null;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  receiptDocumentId: string | null;
};

const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 2 });
const typeLabels: Record<string, string> = {
  DEPOSIT: "Барьцаа",
  VEHICLE: "Автомашины төлбөр",
  SHIPPING: "Тээврийн төлбөр",
  CUSTOMS: "Гааль, татвар",
  OTHER: "Бусад төлбөр",
};

export function PaymentManager({ orderId, totalAmountMnt, payments }: { orderId: string; totalAmountMnt: number; payments: Payment[] }) {
  const router = useRouter();
  const [paymentType, setPaymentType] = useState(payments.some(item => item.paymentType === "DEPOSIT") ? "VEHICLE" : "DEPOSIT");
  const [currency, setCurrency] = useState("MNT");
  const [status, setStatus] = useState("PAID");
  const [amount, setAmount] = useState("");
  const [amountMnt, setAmountMnt] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [dueDates, setDueDates] = useState<Record<string, string>>(() => Object.fromEntries(payments.map(item => [item.id, item.dueDate ?? ""])));
  const paid = payments.filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.amountMnt, 0);
  const pending = payments.filter((item) => item.status === "PENDING").reduce((sum, item) => sum + item.amountMnt, 0);
  const balance = Math.max(totalAmountMnt - paid, 0);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/payments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentType, currency, status, amount: Number(amount), amountMnt: currency === "MNT" ? Number(amount) : Number(amountMnt), dueDate: dueDate || null, referenceNo, note }),
      });
      if (!response.ok) throw new Error("Төлбөр бүртгэхэд алдаа гарлаа.");
      setAmount(""); setAmountMnt(""); setDueDate(""); setReferenceNo(""); setNote("");
      toast.success("Төлбөр амжилттай бүртгэгдлээ.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Төлбөр бүртгэхэд алдаа гарлаа.");
    } finally { setBusy(false); }
  }

  async function saveDueDate(paymentId: string) {
    const value = dueDates[paymentId] || null;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(paymentId)}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ dueDate: value }),
      });
      if (!response.ok) throw new Error("Төлөх хугацааг хадгалахад алдаа гарлаа.");
      toast.success("Төлөх хугацаа хадгалагдлаа.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Төлөх хугацааг хадгалж чадсангүй.");
    } finally { setBusy(false); }
  }

  async function markPaid(paymentId: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(paymentId)}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "PAID" }),
      });
      if (!response.ok) throw new Error("Төлөв шинэчлэхэд алдаа гарлаа.");
      toast.success("Төлбөр төлөгдсөнөөр тэмдэглэгдлээ.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Төлөв шинэчлэхэд алдаа гарлаа.");
    } finally { setBusy(false); }
  }

  return <>
    <section className="admin-payment-summary">
      <div><span>Захиалгын нийт үнэ</span><strong>{money.format(totalAmountMnt)} ₮</strong></div>
      <div className="paid"><span>Нийт төлсөн</span><strong>{money.format(paid)} ₮</strong></div>
      <div className="pending"><span>Хүлээгдэж байгаа</span><strong>{money.format(pending)} ₮</strong></div>
      <div className="balance"><span>Үлдэгдэл</span><strong>{money.format(balance)} ₮</strong></div>
    </section>

    <div className="admin-payment-layout">
      <section className="dashboard-panel payment-entry-panel">
        <div className="panel-heading"><div><span>ШИНЭ ГҮЙЛГЭЭ</span><h2>Төлбөр бүртгэх</h2></div><Plus size={20}/></div>
        <form className="payment-entry-form" onSubmit={submit}>
          <label><span>Төлбөрийн төрөл</span><Select value={paymentType} onValueChange={setPaymentType}><SelectTrigger className="payment-select"><SelectValue/></SelectTrigger><SelectContent>{!payments.some(item => item.paymentType === "DEPOSIT") && <SelectItem value="DEPOSIT">Суурь дүнгийн урьдчилгаа · 30%</SelectItem>}<SelectItem value="VEHICLE">Машины үлдэгдэл · 70%</SelectItem><SelectItem value="SHIPPING">Олон улсын тээвэр</SelectItem><SelectItem value="CUSTOMS">Гааль, татвар</SelectItem><SelectItem value="OTHER">Бусад төлбөр</SelectItem></SelectContent></Select></label>
          <div className="payment-form-row"><label><span>Валют</span><Select value={currency} onValueChange={setCurrency}><SelectTrigger className="payment-select"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="MNT">MNT · Төгрөг</SelectItem><SelectItem value="KRW">KRW · Вон</SelectItem><SelectItem value="USD">USD · Доллар</SelectItem></SelectContent></Select></label><label><span>Дүн</span><Input type="number" min="0.01" step="0.01" value={amount} onChange={(event)=>setAmount(event.target.value)} required placeholder="0"/></label></div>
          {currency !== "MNT" && <label><span>Төгрөгөөр тооцсон дүн</span><Input type="number" min="1" step="1" value={amountMnt} onChange={(event)=>setAmountMnt(event.target.value)} required placeholder="0 ₮"/></label>}
          <label><span>Төлөв</span><Select value={status} onValueChange={setStatus}><SelectTrigger className="payment-select"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="PAID">Төлсөн</SelectItem><SelectItem value="PENDING">Хүлээгдэж байгаа</SelectItem></SelectContent></Select></label>
          <label><span>Төлөх хугацаа</span><Input type="date" value={dueDate} onChange={(event)=>setDueDate(event.target.value)} required={status === "PENDING"} /></label>
          <label><span>Гүйлгээний дугаар</span><Input value={referenceNo} onChange={(event)=>setReferenceNo(event.target.value)} placeholder="Жишээ: 20260828-001" maxLength={100}/></label>
          <label><span>Тайлбар</span><textarea value={note} onChange={(event)=>setNote(event.target.value)} placeholder="Нэмэлт тэмдэглэл" maxLength={500}/></label>
          <Button type="submit" disabled={busy}><ReceiptText/>{busy ? "Хадгалж байна..." : "Төлбөр бүртгэх"}</Button>
        </form>
      </section>

      <section className="dashboard-panel payment-history-panel">
        <div className="panel-heading"><div><span>БОДИТ ӨГӨГДӨЛ</span><h2>Төлбөрийн түүх</h2></div><span className="live-data-chip">{payments.length} ГҮЙЛГЭЭ</span></div>
        {payments.length ? <div className="admin-payment-list">{payments.map((item)=><article key={item.id}>
          <i className={item.status === "PAID" ? "paid" : item.dueDate && item.dueDate < today ? "overdue" : "pending"}>{item.status === "PAID" ? <CheckCircle2/> : <Clock3/>}</i>
          <span><strong>{typeLabels[item.paymentType] ?? item.paymentType}</strong><small>{item.referenceNo ? `Гүйлгээ: ${item.referenceNo} · ` : ""}{(item.paidAt ?? item.createdAt).slice(0, 10)}</small>{item.dueDate && <small className={item.status === "PENDING" && item.dueDate < today ? "payment-due overdue-text" : "payment-due"}>Төлөх хугацаа: {item.dueDate}{item.status === "PENDING" && item.dueDate < today ? " · Хугацаа хэтэрсэн" : ""}</small>}{item.note && <small>{item.note}</small>}</span>
          <b>{money.format(item.amount)} {item.currency}{item.currency !== "MNT" && <small>≈ {money.format(item.amountMnt)} ₮</small>}</b>
          <div className="admin-payment-actions">{item.status === "PENDING" && <Input className="payment-due-input" type="date" value={dueDates[item.id] ?? item.dueDate ?? ""} onChange={(event)=>setDueDates(current=>({...current,[item.id]:event.target.value}))} aria-label="Төлөх хугацаа" />}{item.status === "PENDING" && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={()=>saveDueDate(item.id)}>Хугацаа хадгалах</Button>}{item.receiptDocumentId && <a className="payment-receipt-link" href={`/api/documents/${encodeURIComponent(item.receiptDocumentId)}`}>Баримт харах</a>}{item.status === "PENDING" ? <Button type="button" size="sm" variant="outline" disabled={busy} onClick={()=>markPaid(item.id)}>Төлсөн болгох</Button> : <em>ТӨЛСӨН</em>}</div>
        </article>)}</div> : <div className="panel-empty">Төлбөрийн гүйлгээ бүртгэгдээгүй байна.</div>}
      </section>
    </div>
  </>;
}
