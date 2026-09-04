"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Calculator, CheckCircle2, Info, Link2, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { calculateLandedCost, type LandedCostCurrency, type LandedCostInput, type LandedCostMarket } from "@/lib/landed-cost";
import { calculateVehicleImportTaxes, type VehicleFuelClass } from "@/lib/vehicle-import-taxes";

const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 });
const currentYear = new Date().getFullYear();

type EncarResolvedVehicle = {
  carId: string;
  make: string | null;
  model: string | null;
  grade: string | null;
  productionYear: number | null;
  mileageKm: number | null;
  fuelName: string | null;
  fuelClass: VehicleFuelClass;
  engineCapacityCc: number | null;
  priceKrw: number | null;
};

const initialForm: LandedCostInput = {
  market: "KOREA", vehiclePrice: 39800000, vehicleCurrency: "KRW", purchaseFeeMnt: 0, inlandTransportMnt: 0,
  oceanFreightUsd: 1800, krwMntRate: 2.6, usdMntRate: 3500, customsMnt: 0, exciseMnt: 0, vatMnt: 0, otherCostsMnt: 0, depositMnt: 0,
};

const editableFieldLabels: Array<[keyof LandedCostInput, string, string]> = [
  ["vehiclePrice", "Автомашины үнэ", ""],
  ["purchaseFeeMnt", "Худалдан авалтын шимтгэл", "₮"],
  ["inlandTransportMnt", "Эх орны доторх тээвэр", "₮"],
  ["oceanFreightUsd", "Олон улсын тээвэр", "USD"],
  ["otherCostsMnt", "Бусад зардал", "₮"],
];

export function PublicCostCalculator({ compact = false }: { compact?: boolean }) {
  const [form, setForm] = useState<LandedCostInput>(initialForm);
  const [listingUrl, setListingUrl] = useState("");
  const [productionYear, setProductionYear] = useState(currentYear - 3);
  const [engineCapacityCc, setEngineCapacityCc] = useState(2000);
  const [fuelClass, setFuelClass] = useState<VehicleFuelClass>("GASOLINE_DIESEL");
  const [encarVehicle, setEncarVehicle] = useState<EncarResolvedVehicle | null>(null);
  const [encarStatus, setEncarStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    const trimmed = listingUrl.trim();
    if (!trimmed || !/encar\.com/i.test(trimmed)) {
      setEncarVehicle(null);
      setEncarStatus("idle");
      return;
    }
    const timer = window.setTimeout(async () => {
      setEncarStatus("loading");
      try {
        const response = await fetch(`/api/encar/resolve?url=${encodeURIComponent(trimmed)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("lookup failed");
        const payload = await response.json() as { vehicle?: EncarResolvedVehicle };
        if (!payload.vehicle) throw new Error("vehicle missing");
        const vehicle = payload.vehicle;
        setEncarVehicle(vehicle);
        setEncarStatus("success");
        setForm((current) => ({
          ...current,
          market: "KOREA",
          vehicleCurrency: "KRW",
          vehiclePrice: vehicle.priceKrw ?? current.vehiclePrice,
        }));
        if (vehicle.productionYear) setProductionYear(vehicle.productionYear);
        if (vehicle.engineCapacityCc !== null) setEngineCapacityCc(vehicle.engineCapacityCc);
        setFuelClass(vehicle.fuelClass);
      } catch {
        setEncarVehicle(null);
        setEncarStatus("error");
      }
    }, 550);
    return () => window.clearTimeout(timer);
  }, [listingUrl]);

  const automaticTaxes = useMemo(() => {
    const currencyRate = form.vehicleCurrency === "USD" ? form.usdMntRate : form.krwMntRate;
    const vehiclePriceMnt = Math.max(form.vehiclePrice * currencyRate, 0);
    const originCostsMnt = Math.max(form.purchaseFeeMnt + form.inlandTransportMnt, 0);
    const oceanFreightMnt = Math.max(form.oceanFreightUsd * form.usdMntRate, 0);
    const customsValueMnt = vehiclePriceMnt + originCostsMnt + oceanFreightMnt;
    return calculateVehicleImportTaxes({ customsValueMnt, productionYear, engineCapacityCc, fuelClass, currentYear });
  }, [form.vehiclePrice, form.vehicleCurrency, form.purchaseFeeMnt, form.inlandTransportMnt, form.oceanFreightUsd, form.krwMntRate, form.usdMntRate, productionYear, engineCapacityCc, fuelClass]);

  const calculatedForm = useMemo<LandedCostInput>(() => ({
    ...form,
    customsMnt: automaticTaxes.customsMnt,
    exciseMnt: automaticTaxes.exciseMnt,
    vatMnt: automaticTaxes.vatMnt,
  }), [form, automaticTaxes]);

  const totals = useMemo(() => calculateLandedCost(calculatedForm), [calculatedForm]);

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
    ["Онцгой албан татвар", totals.exciseMnt],
    ["НӨАТ", totals.vatMnt],
    ["Бусад зардал", totals.otherCostsMnt],
  ] as const;

  const quoteHref = (() => {
    const params = new URLSearchParams({
      calculatorSubmitted: "true", market: form.market, vehiclePrice: String(form.vehiclePrice), vehicleCurrency: form.vehicleCurrency,
      productionYear: String(productionYear), engineCapacityCc: String(fuelClass === "ELECTRIC" ? 0 : engineCapacityCc), fuelType: fuelClass,
      purchaseFeeMnt: String(form.purchaseFeeMnt), inlandTransportMnt: String(form.inlandTransportMnt), oceanFreightUsd: String(form.oceanFreightUsd),
      krwMntRate: String(form.krwMntRate), usdMntRate: String(form.usdMntRate), customsMnt: String(totals.customsMnt), exciseMnt: String(totals.exciseMnt),
      vatMnt: String(totals.vatMnt), otherCostsMnt: String(form.otherCostsMnt), depositMnt: String(totals.depositMnt),
    });
    if (listingUrl) params.set("listingUrl", listingUrl);
    return `/request-quote?${params.toString()}`;
  })();

  return <div className={`public-calculator ${compact ? "is-compact" : ""}`}>
    <section className="public-calculator-form">
      <div className="calculator-form-heading"><div><span>PRELIMINARY ESTIMATE</span><h2>Буух өртгөө тооцоолох</h2></div><Calculator size={25} /></div>
      <label className="calculator-field calculator-url-field encar-first-field"><span>Encar зарын линк · автоматаар мэдээлэл татна</span><div className="calculator-input"><Link2 size={14} /><input type="url" value={listingUrl} onChange={(event) => setListingUrl(event.target.value)} placeholder="https://fem.encar.com/cars/detail/..." />{encarStatus === "loading" && <LoaderCircle className="encar-spinner" size={16} />}</div></label>
      {encarStatus === "success" && encarVehicle && <div className="encar-autofill-status success"><CheckCircle2 size={17}/><div><strong>Encar мэдээлэл автоматаар орлоо</strong><span>{[encarVehicle.make, encarVehicle.model, encarVehicle.productionYear, encarVehicle.fuelName, encarVehicle.engineCapacityCc ? `${encarVehicle.engineCapacityCc.toLocaleString("mn-MN")} cc` : null, encarVehicle.mileageKm ? `${encarVehicle.mileageKm.toLocaleString("mn-MN")} км` : null].filter(Boolean).join(" · ")}</span></div></div>}
      {encarStatus === "error" && <div className="encar-autofill-status error"><Info size={16}/><span>Encar-аас мэдээлэл автоматаар авч чадсангүй. Доорх талбаруудыг гараар засаж үргэлжлүүлж болно.</span></div>}
      <div className="calculator-fields">
        <label className="calculator-field"><span>Зах зээл</span><select value={form.market} onChange={(event) => updateMarket(event.target.value as LandedCostMarket)}><option value="KOREA">Солонгос</option><option value="USA">Америк</option></select></label>
        <label className="calculator-field"><span>Үнийн валют</span><select value={form.vehicleCurrency} onChange={(event) => setForm((current) => ({ ...current, vehicleCurrency: event.target.value as LandedCostCurrency }))}><option value="KRW">KRW — Вон</option><option value="USD">USD — Доллар</option></select></label>
        <label className="calculator-field"><span>Үйлдвэрлэсэн он</span><div className="calculator-input"><input type="number" min="1980" max={currentYear} step="1" value={productionYear} onChange={(event) => setProductionYear(Math.min(Math.max(Number(event.target.value) || currentYear, 1980), currentYear))} /><b>он</b></div></label>
        <label className="calculator-field"><span>Түлшний төрөл</span><select value={fuelClass} onChange={(event) => setFuelClass(event.target.value as VehicleFuelClass)}><option value="GASOLINE_DIESEL">Бензин / Дизель</option><option value="HYBRID_LPG">Hybrid / LPG</option><option value="ELECTRIC">Цахилгаан</option></select></label>
        <label className="calculator-field"><span>Хөдөлгүүрийн багтаамж</span><div className="calculator-input"><input type="number" min="0" step="100" value={fuelClass === "ELECTRIC" ? 0 : engineCapacityCc} disabled={fuelClass === "ELECTRIC"} onChange={(event) => setEngineCapacityCc(Math.max(Number(event.target.value) || 0, 0))} /><b>cc</b></div></label>
        {editableFieldLabels.slice(0, 4).map(([field, label, unit]) => <label className="calculator-field" key={field}><span>{label}</span><div className="calculator-input"><input type="number" min="0" step={field === "oceanFreightUsd" ? "1" : "100"} value={form[field] as number} onChange={(event) => updateNumber(field, event.target.value)} /><b>{field === "vehiclePrice" ? form.vehicleCurrency : unit}</b></div></label>)}
        <label className="calculator-field"><span>Гаалийн татвар · автоматаар 5%</span><div className="calculator-input calculated-tax"><input type="number" value={automaticTaxes.customsMnt} readOnly aria-readonly="true" /><b>₮</b></div></label>
        <label className="calculator-field"><span>Онцгой албан татвар · автоматаар</span><div className="calculator-input calculated-tax"><input type="number" value={automaticTaxes.exciseMnt} readOnly aria-readonly="true" /><b>₮</b></div></label>
        <label className="calculator-field"><span>НӨАТ · автоматаар 10%</span><div className="calculator-input calculated-tax"><input type="number" value={automaticTaxes.vatMnt} readOnly aria-readonly="true" /><b>₮</b></div></label>
        {editableFieldLabels.slice(4).map(([field, label, unit]) => <label className="calculator-field" key={field}><span>{label}</span><div className="calculator-input"><input type="number" min="0" step="100" value={form[field] as number} onChange={(event) => updateNumber(field, event.target.value)} /><b>{unit}</b></div></label>)}
      </div>
      <div className="calculator-rate-box"><div><span>KRW → MNT ханш</span><div className="calculator-input"><input type="number" min="0" step="0.01" value={form.krwMntRate} onChange={(event) => updateNumber("krwMntRate", event.target.value)} /><b>₮</b></div></div><div><span>USD → MNT ханш</span><div className="calculator-input"><input type="number" min="0" step="1" value={form.usdMntRate} onChange={(event) => updateNumber("usdMntRate", event.target.value)} /><b>₮</b></div></div></div>
      <div className="calculator-note"><Info size={15} /><span>Encar линк танигдвал үйлдвэрлэсэн он, үнэ, хөдөлгүүрийн багтаамж, түлшний төрөл болон гүйлтийг боломжтой хэмжээнд автоматаар татна. Та татагдсан утгыг гараар засах боломжтой. Гаалийн татвар 5%, онцгой албан татвар нь үйлдвэрлэсэн он, хөдөлгүүрийн багтаамж, түлшний төрлөөс автоматаар сонгогдоно. НӨАТ нь гаалийн үнэ + гаалийн татвар + онцгой албан татварын нийлбэрийн 10%-иар тооцогдоно.{automaticTaxes.luxuryExciseMnt > 0 ? ` 360 сая ₮-өөс давсан гаалийн үнийн хэсэгт ${money.format(automaticTaxes.luxuryExciseMnt)} ₮ нэмэлт ОАТ тооцсон.` : ""} Эцсийн дүн нь гаалийн албан ёсны үнэлгээнээс шалтгаалан өөрчлөгдөж болно.</span></div>
    </section>
    <aside className="calculator-summary">
      <div className="calculator-summary-heading"><span>ЗАДАРГАА</span><h2>Монголд буух ойролцоох үнэ</h2></div>
      <div className="calculator-lines">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{money.format(value)} ₮</strong></div>)}</div>
      <div className="calculator-total"><span>НИЙТ ӨРТӨГ</span><strong>{money.format(totals.totalMnt)} ₮</strong><small>{form.market === "USA" ? "Америкийн зах зээл" : "Солонгосын зах зээл"} · {productionYear} · {automaticTaxes.ageYears} жил · урьдчилсан тооцоо</small></div>
      <div className="calculator-balance"><span>Урьдчилгаа · суурь дүнгийн 30%</span><strong>{money.format(totals.depositMnt)} ₮</strong></div><div className="calculator-balance"><span>Машины үлдэгдэл · 70%</span><strong>{money.format(totals.balanceMnt)} ₮</strong></div>
      <Link className="calculator-cta" href={quoteHref}>Энэ тооцоогоор үнийн санал авах <ArrowRight size={15} /></Link>
      <p className="calculator-disclaimer"><ShieldCheck size={14} /> Таны оруулсан мэдээлэл зөвхөн урьдчилсан тооцоонд ашиглагдана.</p>
    </aside>
  </div>;
}
