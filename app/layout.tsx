import type { Metadata } from "next";
import "./globals.css";
import "./phase12.css";
import "./dashboard-typography.css";
import "./luxury-theme.css";
import "./public-pages-luxury.css";
import "./quote-flow-luxury.css";
import "./auth-luxury.css";
import "./global-sourcing-redesign.css";
import "./global-sourcing-detail.css";
import "./global-sourcing-map.css";
import "./cinematic-hero.css";
import { NetlifyAuthCallback } from "@/app/components/netlify-auth-callback";

export const metadata: Metadata = {
  title: "AUTO BRIDGE — Global Automotive Sourcing & Export",
  description: "AUTO BRIDGE — автомашины олон улсын sourcing, захиалга, тээвэр, төлбөр, баримт бичиг, гааль татварын тооцоог нэг дор удирдах платформ.",
  keywords: ["AUTO BRIDGE", "Global Automotive Sourcing", "Солонгосоос машин захиалах", "Encar Монгол", "автомашин импорт"],
  metadataBase: new URL("https://autobridge.mn"),
  openGraph: { title: "AUTO BRIDGE — Global Automotive Sourcing & Export", description: "Таны сонголт. Бидний дэлхийн сүлжээ.", type: "website" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="mn"><body><NetlifyAuthCallback>{children}</NetlifyAuthCallback></body></html>;
}
