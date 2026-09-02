"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Calculator, Info, Link2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { calculateLandedCost, type LandedCostCurrency, type LandedCostInput, type LandedCostMarket } from "@/lib/landed-cost";

const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 });

const initialForm: LandedCostInput = {
  market: "KOREA", vehiclePrice: 39800000, vehicleCurrency: "KRW", purchaseFeeMnt: 0, inlandTransportMnt: 0,
  oceanFreightUsd: 1800, krwMntRate: 2.6, usdMntRate: 3500, customsMnt: 0, vatMnt: 0, otherCostsMnt: 0, depositMnt: 0,
};

const fieldLabels: Array<[keyof LandedCostInput, string, string]> = [
  ["vehiclePrice", "Автомашины үнэ", ""],
  ["purchaseFeeMnt", "Худалдан авалтын шимтгэл", "₮"],
  ["inlandTransportMnt", "Эх орны доторх тээвэр", "₮"],
  ["oceanFreightUsd", "Олон улсын тээвэр", "USD"],
  ["customsMnt", "Гаалийн татвар", "₮"],
  ["vatMnt", "НӨАТ", "₮"],
  ["otherCostsMnt", "Бусад зардал", "₮"],
];

export function PublicCostCalculator({ compact = false }: { compact?: boolean }) {
  const [form, setForm] = useState<LandedCostInput>(initialForm);
  const [listingUrl, setListingUrl] = useState("");
  const totals = useMemo(() => calculateLandedCost(form), [form]);

  const updateNumber = (field: keyof LandedCostInput, value: string) => {
    setForm((current) => ({ ...current, [field]: Math.max(Number(value) || 0, 0) }));
  };

  const updateMarket = (market: LandedCostMarket) => {
    setForm((current) => ({ ...current, market, vehicleCurrency: market === "USA" ? "USD" : "KRW" }));
  };

  const rows = [
    ["Автомашины үнэ", totals.vehiclePriceMnt],
    ["Худалдан авалт ба дотоод тээвэр", totals.originCostsMnt],
    ["Олон улсын тээвэр", totals.oceanFreightMnt],
    ["Гаалийн татвар", totals.customsMnt],
    ["НӨАТ", totals.vatMnt],
    ["Бусад зардал", totals.otherCostsMnt],
  ] as const;

  const quoteHref = (() => {
    const params = new URLSearchParams({ calculatorSubmitted: "true", market: form.market, vehiclePrice: String(form.vehiclePrice), vehicleCurrency: form.vehicleCurrency, purchaseFeeMnt: String(form.purchaseFeeMnt), inlandTransportMnt: String(form.inlandTransportMnt), oceanFreightUsd: String(form.oceanFreightUsd), krwMntRate: String(form.krwMntRate), usdMntRate: String(form.usdMntRate), customsMnt: String(form.customsMnt), vatMnt: String(form.vatMnt), otherCostsMnt: String(form.otherCostsMnt), depositMnt: String(totals.depositMnt) });
    if (listingUrl) params.set("listingUrl", listingUrl);
    return `/request-quote?${params.toString()}`;
  })();

  return <div className={`public-calculator ${compact ? "is-compact" : ""}`}>
    <section className="public-calculator-form">
      <div className="calculator-form-heading"><div><span>PRELIMINARY ESTIMATE</span><h2>Буух өртгөө тооцоолох</h2></div><Calculator size={25} /></div>
      <div className="calculator-fields">
        <label className="calculator-field"><span>Зах зээл</span><select value={form.market} onChange={(event) => updateMarket(event.target.value as LandedCostMarket)}><option value="KOREA">Солонгос</option><option value="USA">Америк</option></select></label>
        <label className="calculator-field"><span>Үнийн валют</span><select value={form.vehicleCurrency} onChange={(event) => setForm((current) => ({ ...current, vehicleCurrency: event.target.value as LandedCostCurrency }))}><option value="KRW">KRW — Вон</option><option value="USD">USD — Доллар</option></select></label>
        {fieldLabels.map(([field, label, unit]) => <label className="calculator-field" key={field}><span>{label}</span><div className="calculator-input"><input type="number" min="0" step={field === "oceanFreightUsd" ? "1" : "100"} value={form[field] as number} onChange={(event) => updateNumber(field, event.target.value)} /><b>{field === "vehiclePrice" ? form.vehicleCurrency : unit}</b></div></label>)}
      </div>
      <div className="calculator-rate-box"><div><span>KRW → MNT ханш</span><div className="calculator-input"><input type="number" min="0" step="0.01" value={form.krwMntRate} onChange={(event) => updateNumber("krwMntRate", event.target.value)} /><b>₮</b></div></div><div><span>USD → MNT ханш</span><div className="calculator-input"><input type="number" min="0" step="1" value={form.usdMntRate} onChange={(event) => updateNumber("usdMntRate", event.target.value)} /><b>₮</b></div></div></div>
      <label className="calculator-field calculator-url-field"><span>Зарын линк (заавал биш)</span><div className="calculator-input"><Link2 size={14} /><input type="url" value={listingUrl} onChange={(event) => setListingUrl(event.target.value)} placeholder="https://www.encar.com/..." /></div></label>
      <div className="calculator-note"><Info size={15} /><span>Гааль, НӨАТ болон бусад зардлыг таны мэдээлэлд тулгуурлан оруулна. Эцсийн дүн нь гаалийн албан ёсны шийдвэр, тээврийн баталгаажсан нэхэмжлэхээс хамаарна.</span></div>
    </section>
    <aside className="calculator-summary">
      <div className="calculator-summary-heading"><span>ЗАДАРГАА</span><h2>Монголд буух ойролцоох үнэ</h2></div>
      <div className="calculator-lines">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{money.format(value)} ₮</strong></div>)}</div>
      <div className="calculator-total"><span>НИЙТ ӨРТӨГ</span><strong>{money.format(totals.totalMnt)} ₮</strong><small>{form.market === "USA" ? "Америкийн зах зээл" : "Солонгосын зах зээл"} · урьдчилсан тооцоо</small></div>
      <div className="calculator-balance"><span>Урьдчилгаа · суурь дүнгийн 30%</span><strong>{money.format(totals.depositMnt)} ₮</strong></div><div className="calculator-balance"><span>Машины үлдэгдэл · 70%</span><strong>{money.format(totals.balanceMnt)} ₮</strong></div>
      <Link className="calculator-cta" href={quoteHref}>Энэ тооцоогоор үнийн санал авах <ArrowRight size={15} /></Link>
      <p className="calculator-disclaimer"><ShieldCheck size={14} /> Таны оруулсан мэдээлэл зөвхөн урьдчилсан тооцоонд ашиглагдана.</p>
    </aside>
  </div>;
}
