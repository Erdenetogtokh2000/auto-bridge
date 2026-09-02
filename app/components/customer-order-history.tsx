"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, CarFront, FileText, MapPin, Ship, WalletCards } from "lucide-react";

type HistoryItem = {
  id: string;
  orderNo: string;
  createdAt: string;
  statusLabel: string;
  progress: number;
  make: string;
  model: string;
  productionYear: number;
  sourceMarket: string;
  totalAmountMnt: number;
  paidMnt: number;
  balanceMnt: number;
  currentLocation: string;
  estimatedArrival: string;
  documentCount: number;
};

const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 });

export function CustomerOrderHistory({ items }: { items: HistoryItem[] }) {
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "DONE">("ALL");
  const visible = useMemo(() => items.filter((item) => filter === "ALL" || (filter === "DONE" ? item.progress >= 100 : item.progress < 100)), [items, filter]);
  return <section className="dashboard-panel customer-history-panel"><div className="dashboard-section-heading"><div><span>ЗАХИАЛГЫН ТҮҮХ</span><h2>Бүх захиалга</h2></div><div className="history-filters"><Button size="sm" variant={filter === "ALL" ? "default" : "outline"} onClick={() => setFilter("ALL")}>Бүгд ({items.length})</Button><Button size="sm" variant={filter === "ACTIVE" ? "default" : "outline"} onClick={() => setFilter("ACTIVE")}>Идэвхтэй</Button><Button size="sm" variant={filter === "DONE" ? "default" : "outline"} onClick={() => setFilter("DONE")}>Дууссан</Button></div></div>{visible.length ? <div className="customer-history-list">{visible.map((item) => <article key={item.id} className="customer-history-row"><div className="history-car-icon"><CarFront /></div><div className="history-car-main"><div className="history-car-title"><div><small>{item.orderNo} · {item.createdAt.slice(0, 10)}</small><h3>{item.productionYear} {item.make} {item.model}</h3></div><span className="status-chip shipping">{item.statusLabel}</span></div><div className="history-progress"><span><i style={{ width: `${item.progress}%` }} /></span><b>{item.progress}%</b></div><div className="history-meta"><span><WalletCards /><small>Төлсөн</small><strong>{money.format(item.paidMnt)} ₮</strong></span><span><WalletCards /><small>Нийт үнэ</small><strong>{money.format(item.totalAmountMnt)} ₮</strong></span><span><MapPin /><small>Байршил</small><strong>{item.currentLocation}</strong></span><span><CalendarDays /><small>Ирэх өдөр</small><strong>{item.estimatedArrival}</strong></span><span><FileText /><small>Баримт</small><strong>{item.documentCount} файл</strong></span></div></div><a className="history-detail-link" href={`/portal/vehicles/${encodeURIComponent(item.orderNo)}`}>Дэлгэрэнгүй <ArrowRight /></a></article>)}</div> : <div className="panel-empty">Энэ ангилалд захиалга алга.</div>}</section>;
}
