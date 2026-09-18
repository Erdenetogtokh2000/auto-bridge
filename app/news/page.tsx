import { ArrowRight, Calculator, CalendarDays, CarFront, Newspaper } from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/app/components/public-header";

const items = [
  { eyebrow: "AUTO EXPO", title: "Олон улсын авто экспо", text: "Удахгүй болох автомашин, хөдөлгөөнт технологийн үзэсгэлэнгүүдийн мэдээллийг нэг дороос аваарай.", href: "/expo", icon: CalendarDays },
  { eyebrow: "CATALOG", title: "Автомашины шинэ сонголтууд", text: "Солонгос, Монгол, Америкийн зах зээлээс шинээр нэмэгдсэн автомашинуудыг үзээрэй.", href: "/vehicles", icon: CarFront },
  { eyebrow: "GUIDE", title: "Импортын өртгийн тооцоо", text: "Автомашины үнэ, тээвэр, гааль болон НӨАТ-ын урьдчилсан дүнг автоматаар тооцоолно.", href: "/calculator", icon: Calculator },
];

export default function NewsPage() {
  return <main className="calculator-page">
    <PublicHeader section="Мэдээ" />
    <section className="calculator-hero">
      <div className="container">
        <p><Newspaper /> AUTO BRIDGE NEWS</p>
        <h1>Автомашин импортын мэдээлэл, шинэчлэл</h1>
        <span>AUTO BRIDGE-ийн каталог, авто экспо болон импортын тооцоотой холбоотой шинэ мэдээллийг эндээс авна.</span>
      </div>
    </section>
    <section className="market-section">
      <div className="container">
        <div className="section-heading split">
          <div><p className="section-kicker">ШИНЭ МЭДЭЭЛЭЛ</p><h2>Танд хэрэгтэй мэдээлэл</h2></div>
          <p>Импорт, сонголт, тээврийн зөвлөмж болон зах зээлийн мэдээллийг тогтмол шинэчилнэ. Одоогоор каталог, авто экспо, өртгийн тооцоолуурыг ашиглах боломжтой.</p>
        </div>
        <div className="market-grid">
          {items.map((item, index) => { const Icon = item.icon; return <Link className={`market-card ${index === 0 ? "cobalt" : index === 1 ? "navy" : "silver"}`} href={item.href} key={item.title}>
            <div className="market-index">0{index + 1}</div>
            <p>{item.eyebrow}</p>
            <Icon size={25} />
            <h3>{item.title}</h3>
            <span className="market-text">{item.text}</span>
            <div className="market-bottom"><span>Дэлгэрэнгүй</span><ArrowRight size={19} /></div>
          </Link>; })}
        </div>
      </div>
    </section>
  </main>;
}
