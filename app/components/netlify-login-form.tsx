"use client";

import { ArrowRight } from "lucide-react";
import { FormEvent, useState } from "react";

export function NetlifyLoginForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Нэвтрэх үед алдаа гарлаа.");
      void fetch("/api/auth/login-log", { method: "POST", keepalive: true }).catch(() => {});
      window.location.replace("/auth/continue");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Нэвтрэх үед алдаа гарлаа.");
      setBusy(false);
    }
  }

  return <>
    <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 22 }}>
      <input id="identity-email" name="email" type="email" aria-label="И-мэйл" placeholder="И-мэйл" autoComplete="username" required style={{ minHeight: 46, padding: "0 14px", border: "1px solid #ccd5e2", borderRadius: 4 }} />
      <input name="password" type="password" aria-label="Нууц үг" placeholder="Нууц үг" autoComplete="current-password" required style={{ minHeight: 46, padding: "0 14px", border: "1px solid #ccd5e2", borderRadius: 4 }} />
      <button className="login-primary" type="submit" disabled={busy} style={{ border: 0, cursor: "pointer", marginTop: 4 }}>{busy ? "Түр хүлээнэ үү…" : "Нэвтрэх"}<ArrowRight size={16} /></button>
    </form>
    {message && <p role="status" style={{ fontSize: 13, color: "#475569" }}>{message}</p>}
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 14, fontSize: 12 }}>
      <a href="/setup-admin" style={{ color: "#1464f4", textDecoration: "none" }}>Admin нэвтрэлтийг анх тохируулах</a>
      <span title="Шинэ хэрэглэгчийн урилгыг админ удирдана.">Шинэ бүртгэл — админаас хүсэх</span>
    </div>
  </>;
}
