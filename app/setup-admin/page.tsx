"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BrandLogo } from "@/app/components/brand-logo";

export default function SetupAdminPage() {
  const [setupState, setSetupState] = useState<"loading" | "ready" | "missing_secret" | "complete" | "unavailable">("loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/bootstrap", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { state?: string };
        if (body.state === "ready" || body.state === "missing_secret" || body.state === "complete") setSetupState(body.state);
        else setSetupState("unavailable");
      })
      .catch(() => setSetupState("unavailable"));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: data.get("token"), password: data.get("password"), confirmPassword: data.get("confirmPassword") }),
      });
      const body = await response.json() as { error?: string; diagnostic?: string };
      if (!response.ok) throw new Error(body.diagnostic ? `${body.error ?? "Тохиргоо хадгалагдсангүй."} (${body.diagnostic})` : body.error ?? "Тохиргоо хадгалагдсангүй.");
      setSetupState("complete");
      setMessage("Admin нууц үг үүслээ. Одоо нэвтрэх хэсэгт орж нэвтэрнэ үү.");
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Тохиргоо хадгалах үед алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-page">
    <section className="login-card" aria-labelledby="setup-admin-title">
      <div className="login-brand"><a href="/" aria-label="AUTO BRIDGE нүүр хуудас"><BrandLogo className="login-brand-logo" /></a></div>
      <p className="login-kicker">CLOUDFLARE НЭВТРЭЛТ</p>
      <h1 id="setup-admin-title">Admin нэвтрэлтийг тохируулах</h1>
      <p className="login-intro">Анхны admin нууц үгийг D1-д хамгаалалттай хэлбэрээр хадгална. Нууц үгээ өөр хүнд бүү дамжуулаарай.</p>
      {setupState === "loading" ? <p role="status">Тохиргоог шалгаж байна…</p> : setupState === "ready" ? <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 22 }}>
        <input name="token" type="password" aria-label="Анхны тохиргооны код" placeholder="Cloudflare тохиргооны код" autoComplete="off" required minLength={32} style={{ minHeight: 46, padding: "0 14px", border: "1px solid #ccd5e2", borderRadius: 4 }} />
        <input name="password" type="password" aria-label="Шинэ admin нууц үг" placeholder="Шинэ нууц үг (12+ тэмдэгт)" autoComplete="new-password" minLength={12} required style={{ minHeight: 46, padding: "0 14px", border: "1px solid #ccd5e2", borderRadius: 4 }} />
        <input name="confirmPassword" type="password" aria-label="Admin нууц үг давтах" placeholder="Шинэ нууц үгээ давтах" autoComplete="new-password" minLength={12} required style={{ minHeight: 46, padding: "0 14px", border: "1px solid #ccd5e2", borderRadius: 4 }} />
        <button className="login-primary" type="submit" disabled={busy} style={{ border: 0, cursor: "pointer", marginTop: 4 }}>{busy ? "Хадгалж байна…" : "Admin нууц үг тохируулах"}</button>
      </form> : <p role="status">{setupState === "missing_secret" ? "Cloudflare Worker Settings → Variables and secrets хэсэгт AUTH_BOOTSTRAP_TOKEN гэсэн Secret нэмнэ үү. Нууц утгыг чат руу бүү илгээгээрэй." : setupState === "complete" ? "Анхны admin тохиргоо аль хэдийн хийгдсэн байна. Нэвтрэх хэсэгт орно уу." : "D1 өгөгдлийн сантай холбогдож чадсангүй. Cloudflare D1 migration амжилттай болсон эсэхийг шалгана уу."}</p>}
      {message && <p role="status" style={{ fontSize: 13, color: "#475569" }}>{message}</p>}
      <a className="login-home-link" href="/login">Нэвтрэх хэсэг рүү буцах</a>
    </section>
  </main>;
}
