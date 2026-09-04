"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/app/components/brand-logo";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) throw new Error("Нэвтрэх үйлчилгээ тохируулагдаагүй байна.");
      const supabase = createBrowserClient(url, key);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage("Нууц үг сэргээх холбоосыг и-мэйлээр илгээлээ. И-мэйлээ шалгана уу.");
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Хүсэлт илгээж чадсангүй.";
      const lower = raw.toLowerCase();
      setMessage(lower.includes("rate limit") || lower.includes("only request this after")
        ? "Сэргээх и-мэйл илгээх түр хязгаарт хүрсэн байна. Хэсэг хүлээгээд дахин оролдоно уу."
        : raw);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="forgot-title">
        <div className="login-brand">
          <a href="/" aria-label="AUTO BRIDGE нүүр хуудас">
            <BrandLogo className="login-brand-logo" />
          </a>
        </div>
        <p className="login-kicker">НУУЦ ҮГ СЭРГЭЭХ</p>
        <h1 id="forgot-title">Нууц үгээ мартсан уу?</h1>
        <p className="login-intro">Бүртгэлтэй и-мэйл хаягаа оруулна уу. Шинэ нууц үг тохируулах аюулгүй холбоосыг илгээнэ.</p>
        <form onSubmit={submit} style={{display:"grid",gap:12,marginTop:22}}>
          <input name="email" type="email" aria-label="И-мэйл" placeholder="И-мэйл" autoComplete="email" required style={{minHeight:46,padding:"0 14px",border:"1px solid #ccd5e2",borderRadius:4}} />
          <button className="login-primary" type="submit" disabled={busy} style={{border:0,cursor:"pointer",marginTop:4}}>
            {busy ? "Илгээж байна…" : "Сэргээх холбоос илгээх"}
          </button>
        </form>
        {message && <p role="status" style={{fontSize:13,color:"#475569"}}>{message}</p>}
        <a className="login-home-link" href="/login">Нэвтрэх хэсэг рүү буцах</a>
      </section>
    </main>
  );
}
