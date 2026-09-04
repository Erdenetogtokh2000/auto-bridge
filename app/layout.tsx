import type { Metadata } from "next";
import "./globals.css";
import "./phase12.css";
import "./dashboard-typography.css";
import "./luxury-theme.css";
import "./public-pages-luxury.css";
import { NetlifyAuthCallback } from "@/app/components/netlify-auth-callback";

export const metadata: Metadata = {
  title: "AUTO BRIDGE",
  description: "Солонгос болон Америкаас автомашин захиалах, төлбөр, бичиг баримт, тээврийн явцыг нэг дор удирдах платформ.",
  keywords: ["AUTO BRIDGE", "Солонгосоос машин захиалах", "Encar Монгол", "автомашин импорт"],
  metadataBase: new URL("https://autobridge.mn"),
  openGraph: { title: "AUTO BRIDGE", description: "Сонголтоос хүргэлт хүртэл нэг системд.", type: "website" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="mn"><body><NetlifyAuthCallback>{children}</NetlifyAuthCallback></body></html>;
}
