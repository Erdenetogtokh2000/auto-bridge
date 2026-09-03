"use client";

import { logout } from "@netlify/identity";
import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => { logout().finally(() => { window.location.href = "/login"; }); }, []);
  return <main className="login-page">Системээс гарч байна…</main>;
}
