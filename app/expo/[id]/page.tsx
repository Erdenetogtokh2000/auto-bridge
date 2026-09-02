import { and, eq } from "drizzle-orm";
import { ArrowLeft, ArrowUpRight, CalendarDays, CarFront, Globe2, MapPin, Ticket } from "lucide-react";
import { PublicHeader } from "@/app/components/public-header";
import { getDb } from "@/db";
import { expos } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function ExpoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [expo] = await getDb().select().from(expos).where(and(eq(expos.id, id), eq(expos.isPublished, true))).limit(1);
  if (!expo) return <main className="expo-page"><PublicHeader section="Олон улсын авто экспо"/><section className="container expo-empty expo-detail-empty"><CarFront/><h2>Экспо олдсонгүй</h2><a href="/expo"><ArrowLeft/> Экспогийн жагсаалт руу буцах</a></section></main>;
  const today = new Date().toISOString().slice(0, 10);
  const past = expo.endDate < today;
  const live = !past && expo.startDate <= today;
  const image = expo.imageObjectKey ? `/api/expo-images/${encodeURIComponent(expo.id)}` : expo.imageUrl;
  return <main className="expo-page"><PublicHeader section="Экспогийн дэлгэрэнгүй"/><section className="container expo-detail"><a className="back-link" href="/expo"><ArrowLeft size={14}/> Бүх экспо руу буцах</a><div className="expo-detail-card">{image ? <div className="expo-detail-image"><img src={image} alt={expo.title}/></div> : <div className="expo-detail-image placeholder"><Globe2 size={92}/></div>}<div className="expo-detail-copy"><small>{expo.category ?? expo.region} · {past ? "ӨНГӨРСӨН" : live ? "ЯВАГДАЖ БАЙНА" : "УДАХГҮЙ"}</small><h1>{expo.title}</h1><p className="expo-detail-location"><MapPin size={16}/>{expo.venue ? `${expo.venue} · ` : ""}{expo.city}, {expo.country}</p><div className="expo-detail-meta"><span><CalendarDays/><b>Огноо</b>{expo.startDate} – {expo.endDate}</span>{expo.registrationDeadline && <span><CalendarDays/><b>Бүртгэл</b>{expo.registrationDeadline}</span>}{expo.ticketInfo && <span><Ticket/><b>Тасалбар</b>{expo.ticketInfo}</span>}</div>{expo.description && <p className="expo-detail-description">{expo.description}</p>}{expo.participationTerms && <div className="expo-detail-terms"><h3>Оролцох нөхцөл</h3><p>{expo.participationTerms}</p></div>}<div className="expo-detail-actions">{expo.officialUrl && <a className="admin-add" href={expo.officialUrl} target="_blank" rel="noreferrer">Албан ёсны бүртгэл <ArrowUpRight size={15}/></a>}{expo.videoUrl && <a className="document-download-link" href={expo.videoUrl} target="_blank" rel="noreferrer">Видео үзэх <ArrowUpRight size={14}/></a>}</div></div></div></section></main>;
}
