"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileDown, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateQuote, type QuoteCalculationInput } from "@/lib/quote-calculation";

type Estimate = QuoteCalculationInput & { vehicleName: string; vehicleMake: string; vehicleModel: string; productionYear: number; mileageKm: number; fuelType: string; engineCapacityCc: number; notes: string };
type InitialEstimate = Partial<Omit<Estimate, "vehicleName" | "vehicleMake" | "vehicleModel" | "fuelType" | "notes">> & { vehicleName?: string | null; vehicleMake?: string | null; vehicleModel?: string | null; fuelType?: string | null; notes?: string | null };
const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 });

export function QuoteEstimateForm({ quoteId, initial, requesterEmail }: { quoteId: string; initial: InitialEstimate | null; requesterEmail: string | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(Boolean(initial));
  const [customerEmail, setCustomerEmail] = useState(requesterEmail ?? "");
  const [form, setForm] = useState<Estimate>({
    vehicleName: initial?.vehicleName ?? "", vehicleMake: initial?.vehicleMake ?? "", vehicleModel: initial?.vehicleModel ?? "",
    productionYear: initial?.productionYear ?? 0, mileageKm: initial?.mileageKm ?? 0, fuelType: initial?.fuelType ?? "", engineCapacityCc: initial?.engineCapacityCc ?? 0,
    vehiclePriceKrw: initial?.vehiclePriceKrw ?? 0,
    purchaseFeeKrw: initial?.purchaseFeeKrw ?? 0, inlandTransportKrw: initial?.inlandTransportKrw ?? 0,
    oceanFreightUsd: initial?.oceanFreightUsd ?? 0, krwMntRate: initial?.krwMntRate ?? 2.6,
    usdMntRate: initial?.usdMntRate ?? 3500, customsMnt: initial?.customsMnt ?? 0,
    exciseMnt: initial?.exciseMnt ?? 0, vatMnt: initial?.vatMnt ?? 0, otherCostsMnt: initial?.otherCostsMnt ?? 0,
    depositMnt: initial?.depositMnt ?? 0, notes: initial?.notes ?? "",
  });
  const totals = useMemo(() => calculateQuote(form), [form]);
  const updateNumber = (field: keyof QuoteCalculationInput, value: string) => setForm(current => ({ ...current, [field]: Math.max(Number(value) || 0, 0) }));

  async function save(markReady = false) {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/quotes/${encodeURIComponent(quoteId)}/estimate`, {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, requesterEmail: customerEmail, markReady }),
      });
      if (!response.ok) throw new Error("save failed");
      setHasSaved(true);
      toast.success(markReady ? "Үнийн санал бэлэн боллоо" : "Үнийн санал хадгалагдлаа");
      if (markReady) {
        router.push(`/admin/quotes/${encodeURIComponent(quoteId)}/invoice`);
        return;
      }
      router.refresh();
    } catch { toast.error("Үнийн саналыг хадгалж чадсангүй"); }
    finally { setSaving(false); }
  }

  const fields: Array<[keyof QuoteCalculationInput, string, string]> = [
    ["vehiclePriceKrw", "Машины үнэ", "KRW"], ["purchaseFeeKrw", "Худалдан авалтын шимтгэл", "KRW"],
    ["inlandTransportKrw", "Солонгос доторх тээвэр", "KRW"], ["oceanFreightUsd", "Олон улсын тээвэр", "USD"],
    ["krwMntRate", "KRW → MNT ханш", "₮"], ["usdMntRate", "USD → MNT ханш", "₮"],
    ["customsMnt", "Гаалийн татвар", "MNT"], ["exciseMnt", "Онцгой албан татвар", "MNT"], ["vatMnt", "НӨАТ", "MNT"],
    ["otherCostsMnt", "Бусад зардал", "MNT"],
  ];

  return <div className="estimate-layout">
    <section className="dashboard-panel estimate-form-panel">
      <div className="estimate-section-title"><span>МАШИН БА ЗАРДАЛ</span><h2>Үнийн мэдээлэл</h2></div>
      <div className="estimate-field full"><Label htmlFor="vehicleName">Машины нэр, загвар</Label><Input id="vehicleName" value={form.vehicleName} onChange={event=>setForm({...form, vehicleName:event.target.value})} placeholder="Жишээ: Hyundai Palisade 2022" /></div>
      <div className="estimate-vehicle-fields">
        <div className="estimate-field"><Label htmlFor="vehicleMake">Үйлдвэрлэгч</Label><Input id="vehicleMake" value={form.vehicleMake} onChange={event=>setForm({...form,vehicleMake:event.target.value})} placeholder="Hyundai" /></div>
        <div className="estimate-field"><Label htmlFor="vehicleModel">Загвар</Label><Input id="vehicleModel" value={form.vehicleModel} onChange={event=>setForm({...form,vehicleModel:event.target.value})} placeholder="Palisade" /></div>
        <div className="estimate-field"><Label htmlFor="productionYear">Үйлдвэрлэсэн он</Label><Input id="productionYear" type="number" min="1980" max="2100" value={form.productionYear || ""} onChange={event=>setForm({...form,productionYear:Number(event.target.value)||0})} placeholder="2022" /></div>
        <div className="estimate-field"><Label htmlFor="mileageKm">Гүйлт</Label><div className="money-input"><Input id="mileageKm" type="number" min="0" value={form.mileageKm || ""} onChange={event=>setForm({...form,mileageKm:Number(event.target.value)||0})}/><span>KM</span></div></div>
        <div className="estimate-field"><Label htmlFor="fuelType">Түлш</Label><Input id="fuelType" value={form.fuelType} onChange={event=>setForm({...form,fuelType:event.target.value})} placeholder="GASOLINE_DIESEL / HYBRID_LPG / ELECTRIC" /></div>
        <div className="estimate-field"><Label htmlFor="engineCapacityCc">Хөдөлгүүрийн багтаамж</Label><div className="money-input"><Input id="engineCapacityCc" type="number" min="0" value={form.engineCapacityCc || ""} onChange={event=>setForm({...form,engineCapacityCc:Number(event.target.value)||0})}/><span>CC</span></div></div>
        <div className="estimate-field"><Label htmlFor="customerEmail">Харилцагчийн и-мэйл</Label><Input id="customerEmail" type="email" value={customerEmail} onChange={event=>setCustomerEmail(event.target.value)} placeholder="name@example.com" /></div>
      </div>
      <div className="estimate-fields">{fields.map(([field,label,unit])=><div className="estimate-field" key={field}><Label htmlFor={field}>{label}</Label><div className="money-input"><Input id={field} type="number" min="0" step={field.includes("Rate") ? "0.01" : "1"} value={form[field] ?? 0} onChange={event=>updateNumber(field,event.target.value)}/><span>{unit}</span></div></div>)}</div>
      <div className="estimate-field full"><Label htmlFor="notes">Тайлбар, нэмэлт нөхцөл</Label><Textarea id="notes" value={form.notes} onChange={event=>setForm({...form,notes:event.target.value})} placeholder="Үнийн саналтай холбоотой тайлбар..." /></div>
      <div className="estimate-actions">
        <Button variant="outline" className="estimate-save secondary" onClick={()=>save(false)} disabled={saving}><Save/>{saving ? "Хадгалж байна..." : "Ноорог хадгалах"}</Button>
        <Button className="estimate-save" onClick={()=>save(true)} disabled={saving}><CheckCircle2/>Бэлэн болгож батлах</Button>
        {hasSaved && <Link className="invoice-link" href={`/admin/quotes/${encodeURIComponent(quoteId)}/invoice`}><FileDown/>PDF нэхэмжлэх</Link>}
      </div>
    </section>
    <aside className="dashboard-panel estimate-summary">
      <span>АВТОМАТ ТООЦООЛОЛ</span><h2>Үнийн санал</h2>
      <div><small>Солонгос дахь нийт дүн</small><strong>{money.format(totals.koreaSubtotalKrw)} ₩</strong></div>
      <div><small>Төгрөгөөр</small><strong>{money.format(totals.koreaSubtotalMnt)} ₮</strong></div>
      <div><small>Олон улсын тээвэр</small><strong>{money.format(totals.oceanFreightMnt)} ₮</strong></div>
      <div><small>Онцгой албан татвар</small><strong>{money.format(totals.exciseMnt)} ₮</strong></div>
      <div className="estimate-total"><small>Монголд буух нийт үнэ</small><strong>{money.format(totals.totalMnt)} ₮</strong></div>
      <div><small>Урьдчилгаа · Солонгос дахь нийлбэрийн 30%</small><strong>{money.format(totals.depositMnt)} ₮</strong></div>
      <div className="estimate-balance"><small>Машины суурь дүнгийн үлдэгдэл 70%</small><strong>{money.format(totals.balanceMnt)} ₮</strong></div>
      <p>Энэ тооцоо нь админы оруулсан ханш, татвар, зардлын мэдээлэлд үндэслэнэ.</p>
    </aside>
  </div>;
}
