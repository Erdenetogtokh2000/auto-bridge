import { ArrowRight, Calculator, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/app/components/public-header";
import { PublicCostCalculator } from "@/app/components/public-cost-calculator";

export default function CalculatorPage() {
  return <main className="calculator-page"><PublicHeader section="Гааль, татварын тооцоолуур" /><section className="calculator-hero"><div className="container"><p><Calculator /> LANDED COST CALCULATOR</p><h1>Монголд буух нийт өртгөө урьдчилан хараарай</h1><span>Солонгос эсвэл Америкийн автомашины үнэ, тээвэр, татвар болон бусад зардлыг нэг дор тооцоолно.</span><div className="calculator-hero-points"><span><CheckCircle2 /> KRW / USD дэмжинэ</span><span><CheckCircle2 /> Задаргаатай дүн</span><span><CheckCircle2 /> Шууд үнийн санал хүсэх</span></div></div></section><section className="calculator-content"><div className="container"><PublicCostCalculator /></div></section><div className="calculator-back"><Link href="/"><ArrowRight size={14} /> Нүүр хуудас руу буцах</Link></div></main>;
}
