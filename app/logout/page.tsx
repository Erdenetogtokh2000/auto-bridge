"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) { window.location.href = "/login"; return; }
    createBrowserClient(url, key).auth.signOut().finally(() => { window.location.href = "/login"; });
  }, []);
  return <main className="login-page">Системээс гарч байна…</main>;
}
