import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/app/components/brand-logo";

export function PublicHeader({ section }: { section: string }) {
  return <header className="subpage-header"><div className="container subpage-nav"><a href="/" className="brand"><BrandLogo /></a><span>{section}</span><div className="subpage-actions"><a href="/ko">한국어</a><a href="/"><ArrowLeft size={14}/> Нүүр хуудас</a></div></div></header>;
}
