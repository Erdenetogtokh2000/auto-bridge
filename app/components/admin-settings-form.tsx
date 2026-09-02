"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Building2, Calculator, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export type AdminSettings = {
  companyName: string;
  supportEmail: string;
  contactPhone: string;
  officeHours: string;
  krwMntRate: number;
  usdMntRate: number;
  depositPercent: number;
  paymentReminderDays: number;
  emailNotifications: boolean;
  transportNotifications: boolean;
  documentNotifications: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
};

export function AdminSettingsForm({ initialSettings }: { initialSettings: AdminSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initialSettings);
  const [busy, setBusy] = useState(false);

  function setField<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error();
      const payload = await response.json() as { settings: AdminSettings };
      setForm(payload.settings);
      toast.success("Системийн тохиргоог хадгаллаа.");
      router.refresh();
    } catch {
      toast.error("Тохиргоог хадгалж чадсангүй. Оруулсан утгуудаа шалгана уу.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="settings-grid" onSubmit={submit}>
    <section className="dashboard-panel settings-card">
      <div className="settings-card-title"><Building2/><div><span>КОМПАНИ</span><h2>Үндсэн мэдээлэл</h2></div></div>
      <div className="settings-fields">
        <label><span>Компанийн нэр</span><Input required maxLength={160} value={form.companyName} onChange={event => setField("companyName", event.target.value)} /></label>
        <label><span>Холбоо барих утас</span><Input required maxLength={50} value={form.contactPhone} onChange={event => setField("contactPhone", event.target.value)} /></label>
        <label><span>Үйлчилгээний и-мэйл</span><Input type="email" required maxLength={200} value={form.supportEmail} onChange={event => setField("supportEmail", event.target.value)} /></label>
        <label><span>Ажлын цаг</span><Input required maxLength={160} value={form.officeHours} onChange={event => setField("officeHours", event.target.value)} /></label>
      </div>
    </section>

    <section className="dashboard-panel settings-card">
      <div className="settings-card-title"><Calculator/><div><span>ТООЦООЛОЛ</span><h2>Ханш ба төлбөр</h2></div></div>
      <div className="settings-fields two-column">
        <label><span>1 KRW = MNT</span><Input type="number" required min="0.01" step="0.01" value={form.krwMntRate} onChange={event => setField("krwMntRate", Number(event.target.value))} /></label>
        <label><span>1 USD = MNT</span><Input type="number" required min="1" step="1" value={form.usdMntRate} onChange={event => setField("usdMntRate", Number(event.target.value))} /></label>
        <label><span>Заавал төлөх урьдчилгаа (%)</span><Input type="number" required min="1" max="100" step="1" value={form.depositPercent} onChange={event => setField("depositPercent", Number(event.target.value))} /></label>
        <label><span>Сануулга илгээх хугацаа (өдөр)</span><Input type="number" required min="0" max="90" step="1" value={form.paymentReminderDays} onChange={event => setField("paymentReminderDays", Number(event.target.value))} /></label>
      </div>
      <p className="settings-note">Урьдчилгааны үндсэн дүрэм 30%, үлдэгдэл төлбөр 70% байна.</p>
    </section>

    <section className="dashboard-panel settings-card settings-notification-card">
      <div className="settings-card-title"><BellRing/><div><span>МЭДЭГДЭЛ</span><h2>Автомат мэдэгдлийн сувгууд</h2></div></div>
      <div className="settings-switches">
        <label><span><strong>И-мэйл мэдэгдэл</strong><small>Үнийн санал, төлбөрийн сануулгыг и-мэйлээр илгээх</small></span><Switch checked={form.emailNotifications} onCheckedChange={value => setField("emailNotifications", value)} /></label>
        <label><span><strong>Тээврийн шинэчлэл</strong><small>Тээврийн төлөв өөрчлөгдөхөд мэдэгдэх</small></span><Switch checked={form.transportNotifications} onCheckedChange={value => setField("transportNotifications", value)} /></label>
        <label><span><strong>Бичиг баримтын мэдэгдэл</strong><small>Шинэ файл нэмэгдэхэд харилцагчид мэдэгдэх</small></span><Switch checked={form.documentNotifications} onCheckedChange={value => setField("documentNotifications", value)} /></label>
      </div>
    </section>

    <section className="dashboard-panel settings-card settings-security-card">
      <div className="settings-card-title"><ShieldCheck/><div><span>АЮУЛГҮЙ БАЙДАЛ</span><h2>Эрхийн хамгаалалт</h2></div></div>
      <div className="settings-security-list">
        <p><ShieldCheck/><span><strong>Нэг нэвтрэх хэсэг</strong><small>Хэрэглэгч бүр эрхийнхээ самбар руу автоматаар орно.</small></span></p>
        <p><ShieldCheck/><span><strong>Серверийн эрх шалгалт</strong><small>Админы тохиргоог зөвхөн админ өөрчилнө.</small></span></p>
      </div>
      {form.updatedAt && <p className="settings-updated">Сүүлд шинэчилсэн: {form.updatedAt.slice(0, 16).replace("T", " ")}{form.updatedBy ? ` · ${form.updatedBy}` : ""}</p>}
    </section>

    <div className="settings-actions"><Button type="submit" disabled={busy}><Save/>{busy ? "Хадгалж байна..." : "Тохиргоо хадгалах"}</Button></div>
  </form>;
}
