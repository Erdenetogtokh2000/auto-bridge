"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Calculator } from "lucide-react";

const statuses = [
  ["NEW", "Шинэ"], ["REVIEWING", "Судалж байгаа"], ["CONTACTED", "Холбогдсон"],
  ["QUOTE_READY", "Үнийн санал бэлэн"], ["CUSTOMER_ACCEPTED", "Харилцагч зөвшөөрсөн"], ["CUSTOMER_DECLINED", "Харилцагч татгалзсан"], ["CONVERTED", "Захиалга болсон"], ["CLOSED", "Хаагдсан"],
] as const;

const assignees = ["Хуваарилаагүй", "Сөүл худалдан авалт", "Админ", "Санхүү", "Тээврийн зохицуулагч"];

export const quoteStatusLabels = Object.fromEntries(statuses);

export function QuoteActions({ id, status, assignedTo, hasEstimate }: { id: string; status: string; assignedTo: string | null; hasEstimate: boolean }) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentAssignee, setCurrentAssignee] = useState(assignedTo ?? "Хуваарилаагүй");
  const [isPending, startTransition] = useTransition();

  async function update(patch: { status?: string; assignedTo?: string }) {
    const response = await fetch(`/api/admin/quotes/${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch),
    });
    if (!response.ok) throw new Error("update failed");
    startTransition(() => router.refresh());
  }

  return <div className={`quote-actions ${isPending ? "is-pending" : ""}`}>
    <Select value={currentAssignee} onValueChange={async (value) => { const previous=currentAssignee; setCurrentAssignee(value); try { await update({assignedTo:value === "Хуваарилаагүй" ? "" : value}); toast.success("Хариуцсан ажилтан шинэчлэгдлээ"); } catch { setCurrentAssignee(previous); toast.error("Шинэчилж чадсангүй"); } }}>
      <SelectTrigger size="sm" className="quote-select assignee-select"><SelectValue /></SelectTrigger>
      <SelectContent className="bg-white text-slate-900 border-slate-200">{assignees.map(item=><SelectItem key={item} value={item} className="focus:bg-blue-50">{item}</SelectItem>)}</SelectContent>
    </Select>
    <Select value={currentStatus} onValueChange={async (value) => { const previous=currentStatus; setCurrentStatus(value); try { await update({status:value}); toast.success("Хүсэлтийн төлөв шинэчлэгдлээ"); } catch { setCurrentStatus(previous); toast.error("Шинэчилж чадсангүй"); } }}>
      <SelectTrigger size="sm" className="quote-select status-select"><SelectValue /></SelectTrigger>
      <SelectContent className="bg-white text-slate-900 border-slate-200">{statuses.map(([value,label])=><SelectItem key={value} value={value} className="focus:bg-blue-50">{label}</SelectItem>)}</SelectContent>
    </Select>
    <Link className={`estimate-link ${hasEstimate ? "has-estimate" : ""}`} href={`/admin/quotes/${encodeURIComponent(id)}`}><Calculator size={13}/>{hasEstimate ? "Санал засах" : "Санал бэлтгэх"}</Link>
  </div>;
}
