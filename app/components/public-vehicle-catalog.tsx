"use client";

import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, CarFront, ExternalLink, Search } from "lucide-react";

export type CatalogVehicle = {
  id: string;
  stockNo: string;
  sourceMarket: "KOREA" | "USA" | "MONGOLIA";
  listingUrl: string | null;
  make: string;
  model: string;
  productionYear: number;
  mileageKm: number;
  fuelType: string | null;
  trim: string | null;
  priceAmount: number;
  priceCurrency: "KRW" | "USD" | "MNT";
  imageUrl: string | null;
  imageObjectKey: string | null;
  description: string | null;
  status: "AVAILABLE" | "RESERVED" | "SOLD";
};

const marketLabels = { KOREA: "СОЛОНГОС", USA: "АМЕРИК", MONGOLIA: "МОНГОЛД БЭЛЭН" };
const statusLabels = { AVAILABLE: "Бэлэн", RESERVED: "Захиалгатай", SOLD: "Зарагдсан" };

export function PublicVehicleCatalog({ vehicles, initialMarket = "ALL" }: { vehicles: CatalogVehicle[]; initialMarket?: string }) {
  const [q, setQ] = useState("");
  const [market, setMarket] = useState(initialMarket);
  const [make, setMake] = useState("ALL");
  const [year, setYear] = useState("ALL");
  const [fuel, setFuel] = useState("ALL");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const makes = useMemo(() => Array.from(new Set(vehicles.map(v => v.make))).sort(), [vehicles]);
  const years = useMemo(() => Array.from(new Set(vehicles.map(v => v.productionYear))).sort((a, b) => b - a), [vehicles]);
  const fuels = useMemo(() => Array.from(new Set(vehicles.map(v => v.fuelType).filter(Boolean) as string[])).sort(), [vehicles]);
  const filtered = useMemo(() => vehicles.filter(v =>
    `${v.stockNo} ${v.make} ${v.model} ${v.trim ?? ""}`.toLowerCase().includes(q.toLowerCase()) &&
    (market === "ALL" || v.sourceMarket === market) &&
    (make === "ALL" || v.make === make) &&
    (year === "ALL" || String(v.productionYear) === year) &&
    (fuel === "ALL" || v.fuelType === fuel) &&
    (!min || v.priceAmount >= Number(min)) &&
    (!max || v.priceAmount <= Number(max))
  ), [vehicles, q, market, make, year, fuel, min, max]);
  const image = (v: CatalogVehicle) => v.imageObjectKey ? `/api/vehicle-images/${encodeURIComponent(v.id)}` : v.imageUrl;

  return <>
    <section className="catalog-hero">
      <div className="container">
        <p>PREMIUM VEHICLE COLLECTION</p>
        <h1>Танд тохирох автомашинаа хайх</h1>
        <div className="catalog-search"><Search /><input aria-label="Автомашин хайх" value={q} onChange={e => setQ(e.target.value)} placeholder="Марк, загвар, Stock ID..." /><Select value={market} onValueChange={setMarket}><SelectTrigger aria-label="Зах зээл сонгох"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Бүх зах зээл</SelectItem><SelectItem value="KOREA">Солонгос</SelectItem><SelectItem value="USA">Америк</SelectItem><SelectItem value="MONGOLIA">Монголд бэлэн</SelectItem></SelectContent></Select></div>
      </div>
    </section>
    <section className="container catalog-content">
      <div className="catalog-filter-bar">
        <Select value={make} onValueChange={setMake}><SelectTrigger aria-label="Үйлдвэрлэгчээр шүүх"><SelectValue placeholder="Үйлдвэрлэгч" /></SelectTrigger><SelectContent><SelectItem value="ALL">Бүх үйлдвэрлэгч</SelectItem>{makes.map(v => <SelectItem value={v} key={v}>{v}</SelectItem>)}</SelectContent></Select>
        <Select value={year} onValueChange={setYear}><SelectTrigger aria-label="Үйлдвэрлэсэн оноор шүүх"><SelectValue placeholder="Он" /></SelectTrigger><SelectContent><SelectItem value="ALL">Бүх он</SelectItem>{years.map(v => <SelectItem value={String(v)} key={v}>{v}</SelectItem>)}</SelectContent></Select>
        <Select value={fuel} onValueChange={setFuel}><SelectTrigger aria-label="Түлшээр шүүх"><SelectValue placeholder="Түлш" /></SelectTrigger><SelectContent><SelectItem value="ALL">Бүх түлш</SelectItem>{fuels.map(v => <SelectItem value={v} key={v}>{v}</SelectItem>)}</SelectContent></Select>
        <input aria-label="Доод үнэ" type="number" min="0" value={min} onChange={e => setMin(e.target.value)} placeholder="Доод үнэ" />
        <input aria-label="Дээд үнэ" type="number" min="0" value={max} onChange={e => setMax(e.target.value)} placeholder="Дээд үнэ" />
      </div>
      <div className="catalog-toolbar"><span>Нийт <strong>{filtered.length}</strong> сонголт</span><span>Админы шинэчилсэн бодит каталог</span></div>
      {filtered.length ? <div className="catalog-grid">{filtered.map(v => <article className="catalog-card" key={v.id}>
        <div className={`catalog-photo ${image(v) ? "has-image" : ""}`}>{image(v) ? <img loading="lazy" decoding="async" src={image(v) ?? ""} alt={`${v.make} ${v.model}`} /> : <CarFront />}<span>{marketLabels[v.sourceMarket]}</span><em className={`public-stock-status ${v.status.toLowerCase()}`}>{statusLabels[v.status]}</em></div>
        <div className="catalog-info"><small>{v.productionYear} · {v.fuelType ?? "Түлш тодорхойгүй"} · {v.stockNo}</small><h2>{v.make} {v.model}</h2><p>{v.mileageKm.toLocaleString("mn-MN")} км{v.trim ? ` · ${v.trim}` : ""}</p>{v.description && <p className="catalog-description">{v.description}</p>}<div><span>Үндсэн үнэ</span><strong>{v.priceAmount > 0 ? `${v.priceAmount.toLocaleString("mn-MN")} ${v.priceCurrency}` : "Үнэ санал болгоно"}</strong></div><div className="catalog-card-actions">{v.listingUrl && <a href={v.listingUrl} target="_blank" rel="noreferrer">Эх зар <ExternalLink /></a>}<a href={`/vehicles/${encodeURIComponent(v.id)}`}>Дэлгэрэнгүй <ArrowRight /></a></div></div>
      </article>)}</div> : <div className="catalog-empty"><CarFront /><h2>Тохирох автомашин олдсонгүй</h2><p>Шүүлтүүрээ өөрчлөх эсвэл бүх зах зээлийг сонгоно уу.</p><a href="/#quote">Зарын линкээр үнэ авах <ArrowRight /></a></div>}
    </section>
  </>;
}
