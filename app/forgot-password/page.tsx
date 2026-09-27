import { BrandLogo } from "@/app/components/brand-logo";

export default function ForgotPasswordPage() {
  return <main className="login-page">
    <section className="login-card" aria-labelledby="forgot-title">
      <div className="login-brand"><a href="/" aria-label="AUTO BRIDGE нүүр хуудас"><BrandLogo className="login-brand-logo" /></a></div>
      <p className="login-kicker">НУУЦ ҮГ СЭРГЭЭХ</p>
      <h1 id="forgot-title">Нууц үгээ мартсан уу?</h1>
      <p className="login-intro">Cloudflare нэвтрэлтийн и-мэйл сэргээх үйлчилгээг хараахан холбоогүй байна. Admin-тай холбогдож нууц үгээ шинэчлүүлнэ үү.</p>
      <a className="login-home-link" href="/login">Нэвтрэх хэсэг рүү буцах</a>
    </section>
  </main>;
}
