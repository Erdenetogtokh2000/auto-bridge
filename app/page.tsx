import {
  ArrowRight,
  Calculator,
  CalendarDays,
  CarFront,
  ChevronRight,
  CircleDollarSign,
  FileCheck2,
  Globe2,
  Link2,
  MapPin,
  Menu,
  Search,
  Ship,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { and, asc, desc, eq, gte, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { expos, vehicles } from "@/db/schema";
import { PublicCostCalculator } from "@/app/components/public-cost-calculator";
import { HomeHeroCarousel, type HeroExpo } from "@/app/components/home-hero-carousel";
import { BrandLogo } from "@/app/components/brand-logo";
import { getAuthenticatedRole, roleHomePath } from "@/app/chatgpt-auth";

const marketCards = [
  {
    eyebrow: "KOREA STOCK",
    title: "Солонгосоос захиалах",
    text: "Encar болон бусад баталгаатай эх сурвалжаас сонгосон автомашинаа захиална.",
    accent: "cobalt",
    meta: "Шинэ сонголтууд өдөр бүр",
    market: "KOREA",
  },
  {
    eyebrow: "READY IN MONGOLIA",
    title: "Монголд бэлэн",
    text: "Тээвэр, гаалийн процесс дууссан, шууд үзэж сонгох боломжтой автомашинууд.",
    accent: "navy",
    meta: "Шууд худалдан авах",
    market: "MONGOLIA",
  },
  {
    eyebrow: "USA ORDER",
    title: "Америкаас захиалах",
    text: "АНУ-ын зах зээлээс сонгосон автомашины үнэ, тээврийн нэгдсэн тооцоо авна.",
    accent: "silver",
    meta: "Тооцоолсон буух үнэ",
    market: "USA",
  },
];

const steps = [
  { number: "01", title: "Машинаа сонгох", text: "Зарын линкээ оруулах эсвэл каталогоос сонгоно.", icon: Link2 },
  { number: "02", title: "Тооцоо батлах", text: "Үнэ, тээвэр, татварын задаргаатай санал авна.", icon: Calculator },
  { number: "03", title: "Тээврээ хянах", text: "Боомтоос Монгол хүртэл явцыг нэг дор харна.", icon: Ship },
  { number: "04", title: "Хүлээн авах", text: "Бичиг баримтаа татаж, машинаа хүлээн авна.", icon: FileCheck2 },
];

export const dynamic="force-dynamic";
async function loadFeaturedVehicles(){try{return await getDb().select().from(vehicles).where(and(eq(vehicles.isPublished,true),ne(vehicles.status,"ARCHIVED"))).orderBy(desc(vehicles.isFeatured),desc(vehicles.createdAt)).limit(3);}catch{return [];}}
async function loadHeroExpos(): Promise<HeroExpo[]> { try { const today = new Date().toISOString().slice(0, 10); return await getDb().select({ id: expos.id, title: expos.title, country: expos.country, city: expos.city, venue: expos.venue, startDate: expos.startDate, endDate: expos.endDate, description: expos.description, imageUrl: expos.imageUrl, imageObjectKey: expos.imageObjectKey }).from(expos).where(and(eq(expos.isPublished, true), gte(expos.endDate, today))).orderBy(desc(expos.isFeatured), asc(expos.startDate)).limit(4); } catch { return []; } }
const marketLabel:Record<string,string>={KOREA:"Солонгос",USA:"Америк",MONGOLIA:"Монголд"};

export default async function Home() {
  const[vehicleCards,heroExpos]=await Promise.all([loadFeaturedVehicles(),loadHeroExpos()]);
  const role = await getAuthenticatedRole();
  const accountPath = role ? roleHomePath(role) : "/login";
  const accountLabel = role ? "Кабинет" : "Нэвтрэх";
  const nextExpo = heroExpos[0] ?? null;
  const nextExpoImage = nextExpo?.imageObjectKey ? `/api/expo-images/${encodeURIComponent(nextExpo.id)}` : nextExpo?.imageUrl ?? null;
  const expoBackgroundStyle = nextExpoImage ? { backgroundImage: `url("${nextExpoImage}")` } : undefined;
  return (
    <main className="site-shell selected-design">
      <div className="topline">
        <div className="container topline-inner">
          <span>БНСУ · МОНГОЛ · АНУ</span>
          <div className="topline-links">
            <span><MapPin size={13} /> Seoul, Korea</span>
            <a href="#contact">Тусламж</a>
            <span className="language-links"><a href="/">MN</a><a href="/ko">한국어</a><ChevronRight size={12} /></span>
          </div>
        </div>
      </div>

      <header className="main-header">
        <div className="container nav-wrap">
          <a className="brand" href="#top" aria-label="AUTO BRIDGE нүүр">
            <BrandLogo />
          </a>
          <nav className="desktop-nav" aria-label="Үндсэн цэс">
            <a className="active" href="#top">Нүүр</a>
            <a href="#vehicles">Машин хайх</a>
            <a href="#calculator">Үнийн тооцоо</a>
            <a href="#tracking">Тээвэр шалгах</a>
            <a href="#expo">Экспо</a>
            <a href="#news">Мэдээ</a>
            <a href="#about">Бидний тухай</a>
            <a href="#contact">Холбоо барих</a>
          </nav>
          <div className="nav-actions">
            <a className="nav-phone" href="tel:+97670113322"><strong>☎ 7011-3322</strong><small>Даваа–Баасан 09:00–18:00</small></a>
            <a className="language-pill" href="/">MN <ChevronRight size={13} /></a>
            <a className="login-link" href={accountPath}>{accountLabel}</a>
            <a className="primary-button small" href="#quote">Үнийн санал авах <ArrowRight size={15} /></a>
            <details className="mobile-menu"><summary aria-label="Цэс нээх"><Menu size={22} /></summary><div><a href="#vehicles">Машин хайх</a><a href="#calculator">Үнийн тооцоо</a><a href="#tracking">Тээврийн явц</a><a href="#expo">Экспо</a><a href="#news">Мэдээ</a><a href={accountPath}>{accountLabel}</a></div></details>
          </div>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" />
        <div className="container hero-layout">
          <HomeHeroCarousel expos={[]} />
        </div>
      </section>

      <section className="quote-band" aria-label="Үнийн санал авах">
        <div className="container">
          <form className="quote-panel" id="quote" action="/api/quotes" method="post">
            <div className="quote-heading">
              <div><span>QUICK QUOTE</span><h2>Машины линкээр үнэ авах</h2></div>
              <CircleDollarSign size={28} />
            </div>
            <label htmlFor="vehicle-url">Encar эсвэл бусад зарын линк</label>
            <div className="url-field">
              <Link2 size={18} />
              <input id="vehicle-url" name="vehicleUrl" type="url" required placeholder="https://www.encar.com/vehicle/..." />
              <button type="submit">Тооцоолох <ArrowRight size={17} /></button>
            </div>
            <div className="quote-contact-fields">
              <label><span>Нэр</span><input name="requesterName" required placeholder="Таны нэр" /></label>
              <label><span>Утасны дугаар</span><input name="requesterPhone" required inputMode="tel" placeholder="Жишээ: 9911 2233" /></label>
              <label><span>И-мэйл</span><input name="requesterEmail" type="email" required placeholder="name@example.com" /></label>
            </div>
            <div className="quote-footer">
              <span><ShieldCheck size={16} /> Таны мэдээлэл хамгаалагдана</span>
              <a href="#calculator">Гааль, татвар тооцоолох <ChevronRight size={14} /></a>
            </div>
          </form>
        </div>
      </section>

      <section className="market-section" id="markets">
        <div className="container">
          <div className="section-heading split">
            <div><p className="section-kicker">АВТОМАШИН СОНГОХ</p><h2>Танд тохирох зах зээл</h2></div>
            <p>Бэлэн автомашин сонгох эсвэл гадаад эх сурвалжаас захиалж, Монголд буух нийт үнийг урьдчилан хараарай.</p>
          </div>
          <div className="market-grid">
            {marketCards.map((market, index) => (
              <a className={`market-card ${market.accent}`} href={`/vehicles?market=${market.market}`} key={market.title}>
                <div className="market-index">0{index + 1}</div>
                <p>{market.eyebrow}</p>
                <h3>{market.title}</h3>
                <span className="market-text">{market.text}</span>
                <div className="market-bottom"><span>{market.meta}</span><ArrowRight size={19} /></div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="expo-section" id="expo" style={expoBackgroundStyle}>
        <div className="container expo-layout">
          <div className="expo-date"><span>NEXT EVENT</span><strong>{nextExpo?.startDate.slice(8,10)??"—"}</strong><small>{nextExpo?.startDate.slice(0,4)??"SOON"}</small></div>
          <div className="expo-copy">
            <p className="section-kicker">GLOBAL AUTO EXPO</p>
            <h2>{nextExpo?.title??"Олон улсын автомашины үзэсгэлэнг нэг дороос"}</h2>
            <p>{nextExpo?.description??"Солонгос, Япон, Герман, АНУ болон бусад орны авто экспог огноо, байршил, чиглэлээр нь хараарай."}</p>
            <div className="expo-meta"><span><CalendarDays size={16}/>{nextExpo?`${nextExpo.startDate} – ${nextExpo.endDate}`:"Экспо календарь"}</span></div>
            <div className="expo-location-bottom"><MapPin size={16}/><span>{nextExpo?`${nextExpo.city}, ${nextExpo.country}`:"Олон улсын байршил"}</span></div>
          </div>
          <div className="expo-actions">
            <a className="outline-button" href="/expo">Бүх үзэсгэлэн харах <ArrowRight size={17} /></a>
            {nextExpo && <details className="expo-register"><summary>Экспод бүртгүүлэх <ArrowRight size={15} /></summary><form action="/api/quotes" method="post"><input type="hidden" name="vehicleUrl" value={`https://korea-auto-import.erdenetogtokh2000.chatgpt.site/expo/${nextExpo.id}`} /><input type="hidden" name="market" value="EXPO" /><input type="hidden" name="expoId" value={nextExpo.id} /><input type="hidden" name="expoTitle" value={nextExpo.title} /><label><span>Нэр</span><input name="requesterName" required placeholder="Таны нэр" /></label><label><span>Утас</span><input name="requesterPhone" required placeholder="9911 2233" /></label><label><span>И-мэйл</span><input name="requesterEmail" type="email" required placeholder="name@example.com" /></label><button type="submit">Хүсэлт илгээх <ArrowRight size={14} /></button></form></details>}
          </div>
        </div>
      </section>

      <section className="vehicles-section" id="vehicles">
        <div className="container">
          <div className="section-heading split aligned">
            <div><p className="section-kicker">ОНЦЛОХ АВТОМАШИН</p><h2>Шинээр нэмэгдсэн сонголтууд</h2></div>
            <a className="text-link" href="/vehicles">Бүх автомашин харах <ArrowRight size={16} /></a>
          </div>
          {vehicleCards.length?<div className="vehicle-grid">
            {vehicleCards.map((vehicle) => {const image=vehicle.imageObjectKey?`/api/vehicle-images/${encodeURIComponent(vehicle.id)}`:vehicle.imageUrl;return (
              <article className="vehicle-card" key={vehicle.id}>
                <div className={`vehicle-image ${image?"catalog-image":"pearl"}`}>
                  <span className="vehicle-tag">{marketLabel[vehicle.sourceMarket]??vehicle.sourceMarket}</span>
                  {image?<img src={image} alt={`${vehicle.make} ${vehicle.model}`}/>:<CarFront size={116} strokeWidth={0.8}/>}
                  <small>{vehicle.stockNo}</small>
                </div>
                <div className="vehicle-info">
                  <div><div><p>{vehicle.productionYear} · {vehicle.fuelType??"Түлш тодорхойгүй"}</p><h3>{vehicle.make} {vehicle.model}</h3></div></div>
                  <span className="vehicle-km">{(vehicle.mileageKm??0).toLocaleString("mn-MN")} км</span>
                  <div className="price-row"><span>Автомашины үнэ</span><strong>{Number(vehicle.priceAmount??vehicle.priceKrw??0).toLocaleString("mn-MN")} {vehicle.priceCurrency??"KRW"}</strong></div>
                  <a href="/vehicles">Дэлгэрэнгүй <ArrowRight size={15} /></a>
                </div>
              </article>
            );})}
          </div>:<div className="home-catalog-empty"><CarFront/><div><h3>Каталог шинэчлэгдэж байна</h3><p>Та хүссэн автомашиныхаа зарын линкийг илгээж үнийн санал авах боломжтой.</p></div><a href="#quote">Үнийн санал авах <ArrowRight/></a></div>}
        </div>
      </section>

      <section className="calculator-section" id="calculator">
        <div className="container">
          <div className="section-heading split">
            <div><p className="section-kicker">ГААЛЬ · ТАТВАР · ТЭЭВЭР</p><h2>Монголд буух нийт өртгөө урьдчилан хараарай</h2></div>
            <p>Солонгос эсвэл Америкийн автомашины үнийг өөрийн сонгосон ханш, тээвэр болон зардлаар тооцоолж, задаргаатай дүнгээ шууд хараарай.</p>
          </div>
          <PublicCostCalculator compact />
        </div>
      </section>

      <section className="process-section" id="tracking">
        <div className="container">
          <div className="section-heading centered">
            <p className="section-kicker light">ЗАХИАЛГЫН ЯВЦ</p>
            <h2>Бүх процесс ил тод</h2>
            <p>Захиалга бүр нэг бүртгэлтэй. Та төлбөр, бичиг баримт болон тээврийн шинэчлэл бүрийг хувийн кабинетаасаа хянана.</p>
          </div>
          <div className="steps-grid">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <article key={step.number}>
                  <div className="step-icon"><Icon size={24} /></div>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="service-strip" id="about">
        <div className="container service-grid">
          <div><Truck size={25} /><span><strong>Нэгдсэн тээвэр</strong><small>Боомтоос хүлээлгэн өгөх хүртэл</small></span></div>
          <div><FileCheck2 size={25} /><span><strong>Цахим баримт</strong><small>Гэрээ, invoice, BL нэг дор</small></span></div>
          <div><Calculator size={25} /><span><strong>Ил тод тооцоо</strong><small>Үнэ, татвар, төлбөрийн задаргаа</small></span></div>
          <div><Search size={25} /><span><strong>Явцын хяналт</strong><small>Захиалга бүрийн бодит төлөв</small></span></div>
        </div>
      </section>

      <footer id="contact">
        <div className="container footer-inner">
          <div className="brand footer-brand">
            <span className="brand-mark"><span className="brand-k">A</span></span>
            <span className="brand-copy"><strong>AUTO <em>BRIDGE</em></strong><small>СОЛОНГОС · МОНГОЛ · АНУ</small></span>
          </div>
          <p>Сонголтоос хүргэлт хүртэл нэг системд.</p>
          <span className="footer-links"><a href="/privacy">Нууцлал</a><a href="/terms">Үйлчилгээний нөхцөл</a><span>© 2026 AUTO BRIDGE</span></span>
        </div>
      </footer>
    </main>
  );
}
