"use client";

import { CheckCircle2, Clock3, Loader2, Send, XCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Existing = { id: string; requestType: string; requestedAmountMnt: number; approvedAmountMnt: number; termMonths: number; status: string; decisionNote: string | null } | null;
const labels: Record<string, string> = { NEW: "Шинэ хүсэлт", UNDER_REVIEW: "Шалгаж байна", APPROVED: "Зөвшөөрсөн", DECLINED: "Татгалзсан" };
const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 });

export function FinancingRequestForm({ orderId, maxAmountMnt, requestType, existing }: { orderId: string; maxAmountMnt: number; requestType: "VEHICLE_BALANCE" | "CUSTOMS_TAX"; existing: Existing }) {
  const [amount, setAmount] = useState(existing?.requestedAmountMnt ?? maxAmountMnt);
  const [term, setTerm] = useState(existing?.termMonths ?? 12);
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
      try { const response = await fetch(`/api/portal/orders/${encodeURIComponent(orderId)}/financing`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestedAmountMnt: amount, termMonths: term, purpose, requestType }) }); if (!response.ok) throw new Error(); toast.success("Санхүүжилтийн хүсэлтийг илгээлээ."); window.location.reload(); } catch { toast.error("Санхүүжилтийн хүсэлт илгээж чадсангүй."); } finally { setBusy(false); }
  }
  if (existing && existing.status !== "DECLINED") return <div className="financing-existing"><div><span className={`financing-status ${existing.status.toLowerCase()}`}>{existing.status === "APPROVED" ? <CheckCircle2/> : existing.status === "DECLINED" ? <XCircle/> : <Clock3/>}{labels[existing.status] ?? existing.status}</span><strong>{money.format(existing.requestedAmountMnt)} ₮ · {existing.termMonths} сар</strong></div>{existing.status === "APPROVED" && <small>Зөвшөөрсөн дүн: {money.format(existing.approvedAmountMnt || existing.requestedAmountMnt)} ₮</small>}{existing.decisionNote && <p>{existing.decisionNote}</p>}</div>;
  return <form className="financing-form" onSubmit={submit}><div className="financing-form-grid"><label><span>Хүсэх санхүүжилтийн дүн</span><div className="money-input"><Input type="number" min="1" max={Math.max(maxAmountMnt, 1)} value={amount} onChange={event => setAmount(Number(event.target.value) || 0)} required /><b>₮</b></div><small>Дээд хэмжээ: {money.format(maxAmountMnt)} ₮</small></label><label><span>Хугацаа</span><div className="money-input"><Input type="number" min="3" max="84" value={term} onChange={event => setTerm(Number(event.target.value) || 12)} required /><b>сар</b></div></label></div><label><span>Зориулалт / тайлбар</span><textarea value={purpose} onChange={event => setPurpose(event.target.value)} maxLength={500} placeholder="Санхүүжилтийн нэмэлт тайлбар..." /></label><Button type="submit" disabled={busy}><>{busy ? <Loader2 className="animate-spin" /> : <Send />} Санхүүжилт хүсэх</></Button></form>;
}
