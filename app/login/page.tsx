import { CheckCircle2, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/app/components/brand-logo";
import { NetlifyLoginForm } from "@/app/components/netlify-login-form";
import { redirect } from "next/navigation";
import {
  getAuthenticatedRole,
  roleHomePath,
} from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const role = await getAuthenticatedRole();
  if (role) redirect(roleHomePath(role));

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <BrandLogo className="login-brand-logo" />
        </div>
        <p className="login-kicker">НЭГДСЭН НЭВТРЭХ ХЭСЭГ</p>
        <h1 id="login-title">Бүртгэлээрээ нэвтэрнэ үү</h1>
        <p className="login-intro">Нэг удаа нэвтэрсний дараа таны эрхийг таньж, харилцагч, тээвэр, ББСБ эсвэл админы зөв хэсэгт автоматаар оруулна.</p>
        <NetlifyLoginForm />
        <div className="login-points">
          <span><CheckCircle2 size={15} /> Нэг холбоосоор бүх эрх</span>
          <span><ShieldCheck size={15} /> Аюулгүй эрхийн шалгалт</span>
        </div>
        <a className="login-home-link" href="/">Нүүр хуудас руу буцах</a>
      </section>
    </main>
  );
}
