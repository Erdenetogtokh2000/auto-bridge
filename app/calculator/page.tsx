import { ArrowRight, Calculator, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/app/components/public-header";
import { PublicCostCalculator } from "@/app/components/public-cost-calculator";

export default function CalculatorPage() {
  return <main className="calculator-page"><PublicHeader section="Импортын өртгийн тооцоолуур" /><section className="calculator-hero"><div className="container"><p><Calculator /> LANDED COST CALCULATOR</p><h1>Монголд буух нийт өртгийг урьдчилан тооцоолоорой</h1><span>Солонгос эсвэл Америкийн автомашины үнэ, тээвэр, татвар болон бусад зардлыг нэг дор тооцоолно.</span><div className="calculator-hero-points"><span><CheckCircle2 /> KRW болон USD валют</span><span><CheckCircle2 /> Зардлын дэлгэрэнгүй задаргаа</span><span><CheckCircle2 /> Тооцоогоороо үнийн санал хүсэх</span></div></div></section><section className="calculator-content"><div className="container"><PublicCostCalculator /></div></section><div className="calculator-back"><Link href="/"><ArrowRight size={14} /> Нүүр хуудас руу буцах</Link></div></main>;
}
