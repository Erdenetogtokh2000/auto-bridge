"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays, CarFront, MapPin, Search, Ticket } from "lucide-react";

export type PublicExpo = {
  id: string; title: string; country: string; city: string; venue: string | null;
  startDate: string; endDate: string; officialUrl: string | null; videoUrl: string | null;
  region: "ASIA" | "EUROPE" | "AMERICAS" | "OTHER"; category: string | null;
  description: string | null; registrationDeadline: string | null; ticketInfo: string | null;
  participationTerms: string | null; imageUrl: string | null; imageObjectKey: string | null;
};

const labels = { ASIA: "Ази", EUROPE: "Европ", AMERICAS: "Америк", OTHER: "Бусад" };

export function PublicExpoList({ expos, today }: { expos: PublicExpo[]; today: string }) {
  const [region, setRegion] = useState("ALL");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => expos.filter(expo =>
    (region === "ALL" || expo.region === region) &&
    `${expo.title} ${expo.country} ${expo.city} ${expo.category ?? ""}`.toLowerCase().includes(query.toLowerCase())
  ), [expos, region, query]);
  const image = (expo: PublicExpo) => expo.imageObjectKey ? `/api/expo-images/${encodeURIComponent(expo.id)}` : expo.imageUrl;
  return <section className="container expo-list">
    <div className="expo-filter"><div>{["ALL", "ASIA", "EUROPE", "AMERICAS", "OTHER"].map(item => <button key={item} className={region === item ? "active" : ""} onClick={() => setRegion(item)}>{item === "ALL" ? "Бүгд" : labels[item as keyof typeof labels]}</button>)}</div><label><Search/><input aria-label="Экспо хайх" value={query} onChange={e => setQuery(e.target.value)} placeholder="Нэр, улс, хот..."/></label><span><CalendarDays/> {filtered.length} арга хэмжээ</span></div>
    {filtered.map(expo => {
      const past = expo.endDate < today;
      const live = !past && expo.startDate <= today;
      return <article className={`expo-event ${image(expo) ? "with-image" : ""}`} key={expo.id}>
        {image(expo) && <div className="expo-event-image"><img src={image(expo) ?? ""} alt={expo.title}/></div>}
        <div className="expo-event-date"><strong>{expo.startDate.slice(8, 10)}–{expo.endDate.slice(8, 10)}</strong><span>{expo.startDate.slice(5, 7)} сар · {expo.startDate.slice(0, 4)}</span></div>
        <div className="expo-event-copy"><small>{expo.category ?? labels[expo.region]} · {past ? "ӨНГӨРСӨН" : live ? "ЯВАГДАЖ БАЙНА" : "УДАХГҮЙ"}</small><h2>{expo.title}</h2><p><MapPin/>{expo.venue ? `${expo.venue} · ` : ""}{expo.city}, {expo.country}</p>{expo.description && <p className="expo-description">{expo.description}</p>}<div className="expo-public-meta">{expo.registrationDeadline && <span><CalendarDays/>Бүртгэл: {expo.registrationDeadline}</span>}{expo.ticketInfo && <span><Ticket/>{expo.ticketInfo}</span>}</div>{expo.participationTerms && <details><summary>Оролцох нөхцөл</summary><p>{expo.participationTerms}</p></details>}</div>
        <div className="expo-event-actions"><a className="expo-detail-link" href={`/expo/${encodeURIComponent(expo.id)}`}>Дэлгэрэнгүй <ArrowRight/></a>{expo.videoUrl && <a href={expo.videoUrl} target="_blank" rel="noreferrer">Видео</a>}{expo.officialUrl && <a href={expo.officialUrl} target="_blank" rel="noreferrer">Албан ёсны сайт <ArrowUpRight/></a>}</div>
      </article>;
    })}
    {!filtered.length && <div className="expo-empty"><CarFront/><h2>Тохирох экспо олдсонгүй</h2><p>Шүүлтүүр эсвэл хайлтын үгээ өөрчилж үзнэ үү.</p></div>}
  </section>;
}
