"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, CircleDollarSign, Info, Link2, LoaderCircle, ShieldCheck, ChevronRight } from "lucide-react";
import type { VehicleFuelClass } from "@/lib/vehicle-import-taxes";

type EncarVehicle = {
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

export function EncarQuickQuote() {
  const [vehicleUrl, setVehicleUrl] = useState("");
  const [vehicle, setVehicle] = useState<EncarVehicle | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    const trimmed = vehicleUrl.trim();
    if (!trimmed || !/encar\.com/i.test(trimmed)) {
      setVehicle(null);
      setStatus("idle");
      return;
    }
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(`/api/encar/resolve?url=${encodeURIComponent(trimmed)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("lookup failed");
        const payload = await response.json() as { vehicle?: EncarVehicle };
        if (!payload.vehicle) throw new Error("vehicle missing");
        setVehicle(payload.vehicle);
        setStatus("success");
      } catch {
        setVehicle(null);
        setStatus("error");
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [vehicleUrl]);

  return <form className="quote-panel luxury-quote-panel" id="quote" action="/api/quotes" method="post">
    <div className="quote-heading">
      <div><span>PREMIUM QUICK QUOTE</span><h2>Үнийн тооцоо авах</h2></div>
      <CircleDollarSign size={29} />
    </div>
    <label htmlFor="vehicle-url">Encar эсвэл бусад зарын линк</label>
    <div className="url-field">
      <Link2 size={18} />
      <input id="vehicle-url" name="vehicleUrl" type="url" required value={vehicleUrl} onChange={(event) => setVehicleUrl(event.target.value)} placeholder="https://fem.encar.com/cars/detail/..." />
      {status === "loading" && <LoaderCircle className="encar-spinner quote-spinner" size={17} />}
      <button type="submit">Үнийн санал авах <ArrowRight size={17} /></button>
    </div>

    {status === "success" && vehicle && <div className="quick-encar-preview">
      <CheckCircle2 size={18}/>
      <div><strong>Encar мэдээлэл танигдлаа</strong><span>{[vehicle.make, vehicle.model, vehicle.productionYear, vehicle.fuelName, vehicle.engineCapacityCc ? `${vehicle.engineCapacityCc.toLocaleString("mn-MN")} cc` : null, vehicle.priceKrw ? `${vehicle.priceKrw.toLocaleString("mn-MN")} KRW` : null].filter(Boolean).join(" · ")}</span></div>
    </div>}
    {status === "error" && <div className="quick-encar-preview warning"><Info size={16}/><span>Encar мэдээллийг автоматаар татаж чадсангүй. Хүсэлтээ илгээж болно — менежер мэдээллийг шалгана.</span></div>}

    <input type="hidden" name="calculatorSubmitted" value={vehicle ? "true" : "false"} />
    <input type="hidden" name="market" value="KOREA" />
    <input type="hidden" name="vehicleCurrency" value="KRW" />
    <input type="hidden" name="vehiclePrice" value={vehicle?.priceKrw ?? 0} />
    <input type="hidden" name="productionYear" value={vehicle?.productionYear ?? ""} />
    <input type="hidden" name="engineCapacityCc" value={vehicle?.fuelClass === "ELECTRIC" ? 0 : vehicle?.engineCapacityCc ?? 0} />
    <input type="hidden" name="fuelType" value={vehicle?.fuelClass ?? "GASOLINE_DIESEL"} />
    <input type="hidden" name="oceanFreightUsd" value="1800" />
    <input type="hidden" name="krwMntRate" value="2.6" />
    <input type="hidden" name="usdMntRate" value="3500" />

    <div className="quote-contact-fields">
      <label><span>Нэр</span><input name="requesterName" required placeholder="Таны нэр" /></label>
      <label><span>Утасны дугаар</span><input name="requesterPhone" required inputMode="tel" placeholder="Жишээ: 9911 2233" /></label>
      <label><span>И-мэйл</span><input name="requesterEmail" type="email" required placeholder="name@example.com" /></label>
    </div>
    <div className="quote-footer">
      <span><ShieldCheck size={16} /> Таны мэдээлэл хамгаалагдана</span>
      <a href="/calculator">Дэлгэрэнгүй гааль, татвар тооцоолох <ChevronRight size={14} /></a>
    </div>
  </form>;
}
