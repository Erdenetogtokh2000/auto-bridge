import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/portal", "/finance", "/transport", "/api/"] }, sitemap: "https://korea-auto-import.erdenetogtokh2000.chatgpt.site/sitemap.xml" }; }
