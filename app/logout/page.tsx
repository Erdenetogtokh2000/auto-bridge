"use client";

import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" })
      .finally(() => { window.location.replace("/login"); });
  }, []);
  return <main className="login-page">Системээс гарч байна…</main>;
}
