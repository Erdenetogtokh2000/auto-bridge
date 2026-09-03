"use client";

import { createBrowserClient } from "@supabase/ssr";
import { ArrowRight } from "lucide-react";
import { FormEvent, useState } from "react";

export function NetlifyLoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const getSupabase = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Нэвтрэх үйлчилгээ тохируулагдаагүй байна.");
    return createBrowserClient(url, key);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    try {
      if (mode === "signup") {
        const { error } = await getSupabase().auth.signUp({
          email,
          password,
          options: {
            data: { full_name: String(data.get("name") ?? "").trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/login`,
          },
        });
        if (error) throw error;
        setMessage("Бүртгэл үүслээ. И-мэйлээр ирсэн баталгаажуулах холбоосыг нээнэ үү.");
      } else {
        const { error } = await getSupabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/login";
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Нэвтрэх үед алдаа гарлаа.");
    } finally { setBusy(false); }
  }

  async function forgotPassword() {
    const email = (document.querySelector<HTMLInputElement>('#identity-email')?.value ?? "").trim();
    if (!email) return setMessage("Эхлээд и-мэйл хаягаа оруулна уу.");
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/login`,
      });
      if (error) throw error;
      setMessage("Нууц үг сэргээх холбоосыг и-мэйлээр илгээлээ.");
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "Хүсэлт илгээж чадсангүй."); }
    finally { setBusy(false); }
  }

  return <>
    <form onSubmit={submit} style={{display:"grid",gap:12,marginTop:22}}>
      {mode === "signup" && <input name="name" aria-label="Нэр" placeholder="Нэр" required style={{minHeight:46,padding:"0 14px",border:"1px solid #ccd5e2",borderRadius:4}} />}
      <input id="identity-email" name="email" type="email" aria-label="И-мэйл" placeholder="И-мэйл" autoComplete="email" required style={{minHeight:46,padding:"0 14px",border:"1px solid #ccd5e2",borderRadius:4}} />
      <input name="password" type="password" aria-label="Нууц үг" placeholder="Нууц үг" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required style={{minHeight:46,padding:"0 14px",border:"1px solid #ccd5e2",borderRadius:4}} />
      <button className="login-primary" type="submit" disabled={busy} style={{border:0,cursor:"pointer",marginTop:4}}>{busy ? "Түр хүлээнэ үү…" : mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}<ArrowRight size={16}/></button>
    </form>
    {message && <p role="status" style={{fontSize:13,color:"#475569"}}>{message}</p>}
    <div style={{display:"flex",justifyContent:"space-between",gap:12,marginTop:14,fontSize:12}}>
      <button type="button" onClick={() => {setMode(mode === "login" ? "signup" : "login");setMessage("");}} style={{border:0,background:"none",color:"#1464f4",cursor:"pointer"}}>{mode === "login" ? "Шинээр бүртгүүлэх" : "Нэвтрэх хэсэг"}</button>
      {mode === "login" && <button type="button" onClick={forgotPassword} style={{border:0,background:"none",color:"#1464f4",cursor:"pointer"}}>Нууц үг мартсан</button>}
    </div>
  </>;
}
