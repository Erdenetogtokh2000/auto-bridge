"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CarFront, ExternalLink, FileText } from "lucide-react";

type QuoteItem = { id: string; sourceUrl: string; market: string; status: string; createdAt: string; vehicleName: string; totalMnt: number | null; depositMnt: number | null; orderNo: string | null };
const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 });
const labels: Record<string, string> = { NEW: "Шинэ хүсэлт", REVIEWING: "Шалгаж байна", CONTACTED: "Холбогдсон", QUOTE_READY: "Шийдвэр хүлээж буй", CUSTOMER_ACCEPTED: "Зөвшөөрсөн", CUSTOMER_DECLINED: "Татгалзсан", CONVERTED: "Захиалга болсон", CLOSED: "Хаагдсан" };
const groups: Record<string, string[]> = { WAITING: ["NEW", "REVIEWING", "CONTACTED", "QUOTE_READY"], DECIDED: ["CUSTOMER_ACCEPTED", "CUSTOMER_DECLINED"], ORDERED: ["CONVERTED"] };

export function CustomerQuoteHistory({ items }: { items: QuoteItem[] }) {
  const [filter, setFilter] = useState("ALL");
  const visible = useMemo(() => items.filter((item) => filter === "ALL" || groups[filter]?.includes(item.status)), [items, filter]);
  const filters: [string, string][] = [["ALL", "Бүгд"], ["WAITING", "Хүлээгдэж буй"], ["DECIDED", "Шийдвэрлэсэн"], ["ORDERED", "Захиалга болсон"]];
  return <section className="dashboard-panel customer-quote-history"><div className="dashboard-section-heading"><div><span>ҮНИЙН САНАЛ</span><h2>Миний үнийн хүсэлтүүд</h2></div><div className="history-filters">{filters.map(([value, label]) => <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)}>{label}</Button>)}</div></div>{visible.length ? <div className="quote-history-list">{visible.map((item) => <article className="quote-history-row" key={item.id}><div className="history-car-icon"><CarFront /></div><div className="quote-history-main"><div className="history-car-title"><div><small>{item.id} · {item.createdAt.slice(0, 10)} · {item.market === "USA" ? "Америк" : "Солонгос"}</small><h3>{item.vehicleName}</h3></div><span className={`quote-history-status ${item.status.toLowerCase()}`}>{labels[item.status] ?? item.status}</span></div><div className="quote-history-details"><span>Монголд буух үнэ <strong>{item.totalMnt ? `${money.format(item.totalMnt)} ₮` : "Тооцоо хүлээгдэж байна"}</strong></span>{item.depositMnt ? <span>Барьцаа <strong>{money.format(item.depositMnt)} ₮</strong></span> : null}{item.orderNo ? <span className="quote-order-linked">Захиалга: <strong>{item.orderNo}</strong></span> : null}</div></div><div className="quote-history-actions">{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label="Эх зар харах"><ExternalLink /></a>}{item.status === "QUOTE_READY" && <a className="history-detail-link" href={`/portal/quotes/${encodeURIComponent(item.id)}`}>Шийдвэрлэх <ArrowRight /></a>}{item.status !== "QUOTE_READY" && item.totalMnt && <a className="history-detail-link" href={`/portal/quotes/${encodeURIComponent(item.id)}`}>Харах <ArrowRight /></a>}</div></article>)}</div> : <div className="panel-empty"><FileText /><span>Энэ ангилалд үнийн санал алга.</span></div>}</section>;
}
