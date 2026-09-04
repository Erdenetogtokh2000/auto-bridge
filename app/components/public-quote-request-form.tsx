"use client";

import { ArrowRight, Calculator, Link2 } from "lucide-react";
import { useMemo } from "react";
import type { LandedCostInput } from "@/lib/landed-cost";
import { calculateLandedCost } from "@/lib/landed-cost";
import type { VehicleFuelClass } from "@/lib/vehicle-import-taxes";

const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 });

type QuoteInitial = LandedCostInput & {
  listingUrl: string;
  productionYear: number;
  engineCapacityCc: number;
  fuelType: VehicleFuelClass;
};

export function PublicQuoteRequestForm({ initial }: { initial: QuoteInitial }) {
  const totals = useMemo(() => calculateLandedCost(initial), [initial]);
  return <div className="quote-request-layout">
    <section className="quote-request-form">
      <div className="calculator-form-heading"><div><span>QUOTE REQUEST</span><h2>Тооцоогоо үнийн санал болгох</h2></div><Link2 size={24} /></div>
      <p className="quote-request-intro">Таны тооцооллын дүнг админ шалгаж, машины мэдээллийг баталгаажуулаад албан ёсны үнийн санал бэлтгэнэ.</p>
      <form action="/api/quotes" method="post">
        <input type="hidden" name="calculatorSubmitted" value="true" />
        <input type="hidden" name="market" value={initial.market} />
        <input type="hidden" name="vehiclePrice" value={initial.vehiclePrice} />
        <input type="hidden" name="vehicleCurrency" value={initial.vehicleCurrency} />
        <input type="hidden" name="productionYear" value={initial.productionYear} />
        <input type="hidden" name="engineCapacityCc" value={initial.engineCapacityCc} />
        <input type="hidden" name="fuelType" value={initial.fuelType} />
        <input type="hidden" name="purchaseFeeMnt" value={initial.purchaseFeeMnt} />
        <input type="hidden" name="inlandTransportMnt" value={initial.inlandTransportMnt} />
        <input type="hidden" name="oceanFreightUsd" value={initial.oceanFreightUsd} />
        <input type="hidden" name="krwMntRate" value={initial.krwMntRate} />
        <input type="hidden" name="usdMntRate" value={initial.usdMntRate} />
        <input type="hidden" name="customsMnt" value={initial.customsMnt} />
        <input type="hidden" name="exciseMnt" value={initial.exciseMnt ?? 0} />
        <input type="hidden" name="vatMnt" value={initial.vatMnt} />
        <input type="hidden" name="otherCostsMnt" value={initial.otherCostsMnt} />
        <input type="hidden" name="depositMnt" value={totals.depositMnt} />
        <label><span>Автомашины зарын линк</span><input name="listingUrl" type="url" value={initial.listingUrl} readOnly={Boolean(initial.listingUrl)} placeholder="https://www.encar.com/..." /></label>
        <div className="quote-request-fields"><label><span>Нэр</span><input name="requesterName" required placeholder="Таны нэр" /></label><label><span>Утасны дугаар</span><input name="requesterPhone" required inputMode="tel" placeholder="9911 2233" /></label><label><span>И-мэйл</span><input name="requesterEmail" required type="email" placeholder="name@example.com" /></label></div>
        <button className="calculator-cta" type="submit">Үнийн санал хүсэх <ArrowRight size={15} /></button>
      </form>
    </section>
    <aside className="quote-request-summary"><div className="calculator-summary-heading"><span>ТАНЫ ТООЦОО</span><h2>Урьдчилсан нийт үнэ</h2></div><strong>{money.format(totals.totalMnt)} ₮</strong><div><span>Онцгой албан татвар</span><b>{money.format(totals.exciseMnt)} ₮</b></div><div><span>Урьдчилгаа · суурь дүнгийн 30%</span><b>{money.format(totals.depositMnt)} ₮</b></div><div><span>Машины үлдэгдэл · 70%</span><b>{money.format(totals.balanceMnt)} ₮</b></div><a href="/calculator"><Calculator size={14} /> Тооцоог засах</a></aside>
  </div>;
}
