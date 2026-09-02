"use client";

import { CheckCircle2, Clock3, FileText, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type RequestRow = { id: string; orderNo: string | null; customerName: string | null; customerEmail: string; vehicleName: string; requestType: string; requestedAmountMnt: number; approvedAmountMnt: number; termMonths: number; purpose: string | null; status: string; decisionNote: string | null; createdAt: string };
const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 });
const statusLabels: Record<string, string> = { NEW: "Шинэ", UNDER_REVIEW: "Шалгаж байна", APPROVED: "Зөвшөөрсөн", DECLINED: "Татгалзсан" };
const requestTypeLabels: Record<string, string> = { VEHICLE_BALANCE: "1-р хэсэг · Машины суурь дүнгийн 70%", CUSTOMS_TAX: "2-р хэсэг · Гааль, татвар" };

export function FinancingRequestManager({ requests, canDecide = true }: { requests: RequestRow[]; canDecide?: boolean }) {
  const [rows, setRows] = useState(requests);
  const [busy, setBusy] = useState<string | null>(null);
  async function update(id: string, status: string, decisionNote: string) {
    setBusy(id);
    try { const response = await fetch(`/api/finance/financing/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, decisionNote }) }); if (!response.ok) throw new Error(); setRows(current => current.map(row => row.id === id ? { ...row, status, decisionNote } : row)); toast.success("Санхүүжилтийн шийдвэр хадгалагдлаа."); } catch { toast.error("Шийдвэр хадгалж чадсангүй."); } finally { setBusy(null); }
  }
  return <section className="dashboard-panel financing-directory-panel" id="requests"><div className="dashboard-section-heading"><div><span>ББСБ · САНХҮҮЖИЛТ</span><h2>Хэрэглэгчийн хүсэлтүүд</h2></div><span className="live-data-chip">LIVE DATA · {rows.length}</span></div>{rows.length ? <div className="financing-request-list">{rows.map(row => <FinancingRow key={row.id} row={row} busy={busy === row.id} onUpdate={update} canDecide={canDecide} />)}</div> : <div className="quote-empty compact"><FileText/><h3>Санхүүжилтийн хүсэлт одоогоор алга</h3><p>Админ захиалгыг баталгаажуулсны дараа хэрэглэгч энэ хэсгээс санхүүжилт хүснэ.</p></div>}</section>;
}

function FinancingRow({ row, busy, onUpdate, canDecide }: { row: RequestRow; busy: boolean; onUpdate: (id: string, status: string, note: string) => void; canDecide: boolean }) {
  const [status, setStatus] = useState(row.status === "NEW" ? "UNDER_REVIEW" : row.status);
  const [note, setNote] = useState(row.decisionNote ?? "");
  const finalized = ["APPROVED", "DECLINED"].includes(row.status);
  return <article className="financing-request-card"><div className="financing-request-main"><div className="financing-request-title"><div><span>{row.orderNo ?? row.id}</span><h3>{row.vehicleName}</h3><p>{requestTypeLabels[row.requestType] ?? row.requestType} · {row.customerName ?? row.customerEmail} · {row.customerEmail}</p></div><b className={`financing-status ${row.status.toLowerCase()}`}>{row.status === "APPROVED" ? <CheckCircle2/> : row.status === "DECLINED" ? <XCircle/> : <Clock3/>}{statusLabels[row.status] ?? row.status}</b></div><div className="financing-request-meta"><span><small>Хүссэн дүн</small><strong>{money.format(row.requestedAmountMnt)} ₮</strong></span><span><small>Зөвшөөрсөн</small><strong>{row.approvedAmountMnt ? `${money.format(row.approvedAmountMnt)} ₮` : "—"}</strong></span><span><small>Хугацаа</small><strong>{row.termMonths} сар</strong></span><span><small>Илгээсэн</small><strong>{row.createdAt.slice(0, 10)}</strong></span></div>{row.purpose && <p className="financing-purpose">{row.purpose}</p>}</div>{canDecide?<div className="financing-decision"><label><span>Шийдвэр</span><select value={status} onChange={event => setStatus(event.target.value)} disabled={finalized}><option value="UNDER_REVIEW">Шалгаж байна</option><option value="APPROVED">Зөвшөөрөх</option><option value="DECLINED">Татгалзах</option></select></label><label><span>Тайлбар</span><Textarea value={note} onChange={event => setNote(event.target.value)} disabled={finalized} placeholder="Шийдвэрийн тайлбар..." /></label>{finalized ? <small className="financing-final-note">Шийдвэр эцэслэгдсэн</small> : <Button onClick={() => onUpdate(row.id, status, note)} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Хадгалах</Button>}</div>:<div className="financing-decision"><small className="financing-final-note">Харах эрхтэй · Шийдвэрлэх эрх олгогдоогүй</small></div>}</article>;
}
