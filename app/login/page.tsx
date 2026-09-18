import { CheckCircle2, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/app/components/brand-logo";
import { NetlifyLoginForm } from "@/app/components/netlify-login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <a href="/" aria-label="AUTO BRIDGE нүүр хуудас">
            <BrandLogo className="login-brand-logo" />
          </a>
        </div>
        <p className="login-kicker">НЭГДСЭН НЭВТРЭХ ХЭСЭГ</p>
        <h1 id="login-title">Бүртгэлдээ нэвтэрнэ үү</h1>
        <p className="login-intro">Нэвтэрсний дараа систем таны эрхийг таньж, харилцагч, тээвэр, санхүү эсвэл админы тохирох хэсэгт автоматаар шилжүүлнэ.</p>
        <NetlifyLoginForm />
        <div className="login-points">
          <span><CheckCircle2 size={15} /> Нэг бүртгэлээр бүх үйлчилгээнд</span>
          <span><ShieldCheck size={15} /> Аюулгүй нэвтрэлт, эрхийн хамгаалалт</span>
        </div>
        <a className="login-home-link" href="/">Нүүр хуудас руу буцах</a>
      </section>
    </main>
  );
}
