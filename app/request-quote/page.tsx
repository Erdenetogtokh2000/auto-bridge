import { FileCheck2 } from "lucide-react";
import { PublicHeader } from "@/app/components/public-header";
import { PublicQuoteRequestForm } from "@/app/components/public-quote-request-form";
import type { LandedCostCurrency, LandedCostMarket } from "@/lib/landed-cost";
import { normalizeVehicleFuelClass } from "@/lib/vehicle-import-taxes";

const numberParam = (params: Record<string, string | string[] | undefined>, key: string, fallback: number) => {
  const raw = params[key];
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const stringParam = (params: Record<string, string | string[] | undefined>, key: string) => {
  const raw = params[key];
  return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
};

export default async function RequestQuotePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const market = (params.market === "USA" ? "USA" : "KOREA") as LandedCostMarket;
  const vehicleCurrency = (params.vehicleCurrency === "USD" ? "USD" : "KRW") as LandedCostCurrency;
  const listingUrl = stringParam(params, "listingUrl");
  const productionYear = numberParam(params, "productionYear", new Date().getFullYear() - 3);
  const engineCapacityCc = numberParam(params, "engineCapacityCc", 2000);
  const fuelType = normalizeVehicleFuelClass(stringParam(params, "fuelType"));
  const initial = {
    market,
    vehiclePrice: numberParam(params, "vehiclePrice", 0),
    vehicleCurrency,
    purchaseFeeMnt: numberParam(params, "purchaseFeeMnt", 0),
    inlandTransportMnt: numberParam(params, "inlandTransportMnt", 0),
    oceanFreightUsd: numberParam(params, "oceanFreightUsd", 0),
    krwMntRate: numberParam(params, "krwMntRate", 2.6),
    usdMntRate: numberParam(params, "usdMntRate", 3500),
    customsMnt: numberParam(params, "customsMnt", 0),
    exciseMnt: numberParam(params, "exciseMnt", 0),
    vatMnt: numberParam(params, "vatMnt", 0),
    otherCostsMnt: numberParam(params, "otherCostsMnt", 0),
    depositMnt: numberParam(params, "depositMnt", 0),
    productionYear,
    engineCapacityCc,
    fuelType,
    listingUrl,
  };
  return <main className="quote-request-page"><PublicHeader section="Үнийн санал хүсэх" /><section className="quote-request-hero"><div className="container"><p><FileCheck2 /> QUOTE REQUEST</p><h1>Урьдчилсан тооцоогоор үнийн санал хүсэх</h1><span>Хүсэлт илгээсний дараа манай ажилтан автомашины мэдээлэл, ханш, татвар болон тээврийн нөхцөлийг нягталж, эцсийн саналыг бэлтгэнэ.</span></div></section><section className="quote-request-content"><div className="container"><PublicQuoteRequestForm initial={initial} /></div></section></main>;
}
