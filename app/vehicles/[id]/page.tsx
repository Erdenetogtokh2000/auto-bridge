import { and, eq, ne } from "drizzle-orm";
import { ArrowLeft, ArrowRight, Calculator, CarFront, ExternalLink, FileCheck2, Ship } from "lucide-react";
import { PublicHeader } from "@/app/components/public-header";
import { getDb } from "@/db";
import { vehicles } from "@/db/schema";

export const dynamic = "force-dynamic";

function inferredDrive(trim: string | null) {
  const value = (trim ?? "").toUpperCase();
  if (/AWD|4WD|4MATIC|QUATTRO|XDRIVE/.test(value)) return "AWD / 4WD";
  if (/RWD/.test(value)) return "RWD";
  if (/FWD/.test(value)) return "FWD";
  return "—";
}

export default async function PublicVehicleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [v] = await getDb().select().from(vehicles).where(and(eq(vehicles.id, id), eq(vehicles.isPublished, true), ne(vehicles.status, "ARCHIVED"))).limit(1);
  if (!v) return <main className="catalog-page"><PublicHeader section="Автомашины каталог" /><section className="container catalog-empty"><CarFront /><h2>Автомашин олдсонгүй</h2><a href="/vehicles"><ArrowLeft /> Каталог руу буцах</a></section></main>;

  const image = v.imageObjectKey ? `/api/vehicle-images/${encodeURIComponent(v.id)}` : v.imageUrl;
  let gallery: string[] = [];
  try { gallery = JSON.parse(v.galleryImageUrls ?? "[]"); } catch { gallery = []; }
  gallery = [...new Set([image, ...gallery].filter((value): value is string => Boolean(value)))];
  const price = Number(v.priceAmount ?? v.priceKrw ?? 0);

  return <main className="catalog-page vehicle-showroom-page">
    <PublicHeader section="Автомашины дэлгэрэнгүй" />
    <section className="container vehicle-public-detail">
      <a className="back-link" href="/vehicles"><ArrowLeft size={14} /> Каталог руу буцах</a>
      <div className="vehicle-public-detail-card">
        <div className={`vehicle-public-image ${image ? "has-image" : ""}`}>{image ? <img src={image} alt={`${v.make} ${v.model}`} /> : <CarFront size={125} />}</div>
        <div className="vehicle-public-copy">
          <span>{v.sourceMarket} · {v.stockNo} · {v.status}</span>
          <h1>{v.make} {v.model}</h1>
          <p>{v.productionYear} · {(v.mileageKm ?? 0).toLocaleString("mn-MN")} км · {v.fuelType ?? "Түлш тодорхойгүй"}</p>
          <strong>{price > 0 ? `${price.toLocaleString("mn-MN")} ${v.priceCurrency ?? "KRW"}` : "Үнэ санал болгоно"}</strong>
          {v.description && <div className="vehicle-public-description">{v.description}</div>}
          <div className="vehicle-public-specs">
            <span><small>VIN</small><b>{v.vin ?? "Бүртгэлгүй"}</b></span>
            <span><small>Комплектаци</small><b>{v.trim ?? "—"}</b></span>
            <span><small>Өнгө</small><b>{v.color ?? "—"}</b></span>
            <span><small>Хөдөлгүүр</small><b>{v.engineCapacityCc ? `${v.engineCapacityCc.toLocaleString("mn-MN")} cc` : "—"}</b></span>
            <span><small>Хөтлөгч</small><b>{inferredDrive(v.trim)}</b></span>
            <span><small>Зах зээл</small><b>{v.sourceMarket}</b></span>
          </div>
          <div className="vehicle-public-actions">
            <a className="admin-add" href="/#quote">Үнийн санал авах <ArrowRight size={15} /></a>
            <a className="document-download-link" href={`/calculator?listingUrl=${encodeURIComponent(v.listingUrl ?? "")}`}>Буух өртөг тооцох <Calculator size={14} /></a>
            {v.listingUrl && <a className="document-download-link" href={v.listingUrl} target="_blank" rel="noreferrer">Эх зар үзэх <ExternalLink size={14} /></a>}
          </div>
        </div>
      </div>
      {gallery.length > 1 && <section className="vehicle-photo-gallery" aria-label="Автомашины зургийн цомог">
        {gallery.map((photo,index)=><a key={photo} href={photo} target="_blank" rel="noreferrer"><img src={photo} alt={`${v.make} ${v.model} зураг ${index+1}`} loading={index<4?"eager":"lazy"}/></a>)}
      </section>}

      <div className="vehicle-showroom-sections">
        <section>
          <div><FileCheck2 size={20} /><span>INSPECTION &amp; HISTORY</span></div>
          <h2>Үзлэг ба түүхийн мэдээлэл</h2>
          <p>Одоогийн database-д тусдаа inspection report эсвэл vehicle-history record хадгалагдаагүй. Боломжтой түүх, үзлэгийн мэдээллийг эх зар болон менежерийн баталгаажуулалтаар шалгана.</p>
          {v.listingUrl && <a href={v.listingUrl} target="_blank" rel="noreferrer">Эх мэдээлэл шалгах <ExternalLink size={14} /></a>}
        </section>
        <section>
          <div><Ship size={20} /><span>EXPORT &amp; LOGISTICS</span></div>
          <h2>Экспорт ба тээврийн дараагийн алхам</h2>
          <p>Үнийн санал батлагдсаны дараа одоо байгаа захиалга, төлбөр, баримт бичиг, тээврийн workflow-оор үргэлжилнэ. Тээврийн бодит төлөв хувийн кабинетад харагдана.</p>
          <a href="/#quote">Энэ машиныг хүсэлт болгох <ArrowRight size={14} /></a>
        </section>
      </div>
    </section>
  </main>;
}
