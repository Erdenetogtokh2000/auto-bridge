import { BrandLogo } from "@/app/components/brand-logo";

export default function ResetPasswordPage() {
  return <main className="login-page">
    <section className="login-card" aria-labelledby="reset-title">
      <div className="login-brand"><a href="/" aria-label="AUTO BRIDGE нүүр хуудас"><BrandLogo className="login-brand-logo" /></a></div>
      <p className="login-kicker">НУУЦ ҮГ СЭРГЭЭХ</p>
      <h1 id="reset-title">Нууц үг сэргээх</h1>
      <p className="login-intro">Сэргээх холбоосоор өөрөө шинэ нууц үг тохируулах боломж одоогоор идэвхгүй. Admin-тай холбогдоно уу.</p>
      <a className="login-home-link" href="/login">Нэвтрэх хэсэг рүү буцах</a>
    </section>
  </main>;
}
