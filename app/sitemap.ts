import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap { const base = "https://korea-auto-import.erdenetogtokh2000.chatgpt.site"; return ["/", "/ko", "/vehicles", "/expo", "/calculator", "/privacy", "/terms", "/login"].map(path => ({ url: `${base}${path}`, changeFrequency: path === "/" || path === "/vehicles" ? "daily" : "weekly", priority: path === "/" ? 1 : .7 })); }
