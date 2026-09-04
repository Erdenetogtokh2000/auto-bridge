"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/app/components/brand-logo";

export default function ResetPasswordPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    if (password.length < 8) {
      setBusy(false);
      return setMessage("Нууц үг хамгийн багадаа 8 тэмдэгт байна.");
    }
    if (password !== confirmPassword) {
      setBusy(false);
      return setMessage("Нууц үг хоорондоо таарахгүй байна.");
    }

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) throw new Error("Нэвтрэх үйлчилгээ тохируулагдаагүй байна.");
      const supabase = createBrowserClient(url, key);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Сэргээх холбоос хүчингүй эсвэл хугацаа дууссан байна. Дахин хүсэлт илгээнэ үү.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Нууц үг амжилттай шинэчлэгдлээ. Нэвтрэх хэсэг рүү шилжиж байна…");
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Нууц үг шинэчлэх үед алдаа гарлаа.");
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="reset-title">
        <div className="login-brand"><BrandLogo className="login-brand-logo" /></div>
        <p className="login-kicker">НУУЦ ҮГ СЭРГЭЭХ</p>
        <h1 id="reset-title">Шинэ нууц үг оруулна уу</h1>
        <p className="login-intro">И-мэйлээр ирсэн сэргээх холбоосоор орсны дараа шинэ нууц үгээ тохируулна.</p>
        <form onSubmit={submit} style={{display:"grid",gap:12,marginTop:22}}>
          <input name="password" type="password" aria-label="Шинэ нууц үг" placeholder="Шинэ нууц үг" autoComplete="new-password" minLength={8} required style={{minHeight:46,padding:"0 14px",border:"1px solid #ccd5e2",borderRadius:4}} />
          <input name="confirmPassword" type="password" aria-label="Нууц үг давтах" placeholder="Нууц үг давтах" autoComplete="new-password" minLength={8} required style={{minHeight:46,padding:"0 14px",border:"1px solid #ccd5e2",borderRadius:4}} />
          <button className="login-primary" type="submit" disabled={busy} style={{border:0,cursor:"pointer",marginTop:4}}>
            {busy ? "Шинэчилж байна…" : "Нууц үг шинэчлэх"}
          </button>
        </form>
        {message && <p role="status" style={{fontSize:13,color:"#475569"}}>{message}</p>}
        <a className="login-home-link" href="/login">Нэвтрэх хэсэг рүү буцах</a>
      </section>
    </main>
  );
}
