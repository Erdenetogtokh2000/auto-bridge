"use client";

import { handleAuthCallback } from "@netlify/identity";
import { useEffect, useState } from "react";

const AUTH_HASH = /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/;

export function NetlifyAuthCallback({ children }: { children: React.ReactNode }) {
  const [processing, setProcessing] = useState(() => typeof window !== "undefined" && AUTH_HASH.test(window.location.hash));

  useEffect(() => {
    if (!AUTH_HASH.test(window.location.hash)) return;
    handleAuthCallback()
      .then(() => { window.location.href = "/login"; })
      .catch(() => setProcessing(false));
  }, []);

  return processing ? <main className="login-page">Бүртгэлийг баталгаажуулж байна…</main> : children;
}
