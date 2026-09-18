import {
  ArrowRight,
  Calculator,
  CalendarDays,
  CarFront,
  ChevronRight,
  FileCheck2,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Ship,
  Truck,
} from "lucide-react";
import { and, asc, desc, eq, gte, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { expos, vehicles } from "@/db/schema";
import { PublicCostCalculator } from "@/app/components/public-cost-calculator";
import { HomeHeroCarousel, type HeroExpo } from "@/app/components/home-hero-carousel";
import { EncarQuickQuote } from "@/app/components/encar-quick-quote";
import { BrandLogo } from "@/app/components/brand-logo";
import { GlobalSourcingMap } from "@/app/components/global-sourcing-map";
import { getAuthenticatedRole, roleHomePath } from "@/app/chatgpt-auth";

const marketCards = [
  {
    eyebrow: "KOREA STOCK",
    title: "Солонгосоос захиалах",
    text: "Encar болон бусад баталгаатай эх сурвалжаас сонгосон автомашинаа захиалаарай.",
    meta: "Сонголт тогтмол шинэчлэгдэнэ",
    market: "KOREA",
  },
  {
    eyebrow: "READY IN MONGOLIA",
    title: "Монголд бэлэн",
    text: "Тээвэр, гаалийн бүрдүүлэлт дууссан автомашинуудыг шууд үзэж, сонгох боломжтой.",
    meta: "Шууд худалдан авах",
    market: "MONGOLIA",
  },
  {
    eyebrow: "USA ORDER",
    title: "Америкаас захиалах",
    text: "АНУ-ын зах зээлээс сонгосон автомашиныхаа үнэ, тээвэр, татварын нэгдсэн тооцоог аваарай.",
    meta: "Монголд буух урьдчилсан өртөг",
    market: "USA",
  },
];

const trustItems = ["GLOBAL SOURCING", "VERIFIED VEHICLES", "TRANSPARENT PROCESS", "SECURE DELIVERY"];
const howSteps = [
  ["01", "Хүсэлтээ илгээх", "Зарын холбоос, каталогоос сонгосон машин эсвэл хүссэн загварынхаа мэдээллийг илгээнэ."],
  ["02", "Зах зээлээс хайх", "Боломжит эх сурвалж, үнэ, нөхцөлийг харьцуулж хамгийн тохиромжтой сонголтыг санал болгоно."],
  ["03", "Мэдээллийг нягтлах", "Боломжтой хүрээнд автомашины түүх, үзлэг болон баримт бичгийн мэдээллийг шалгана."],
  ["04", "Худалдан авалтыг баталгаажуулах", "Таны зөвшөөрсөн үнийн санал, нөхцөлийн дагуу худалдан авалтыг үргэлжлүүлнэ."],
  ["05", "Экспорт, тээврийг зохион байгуулах", "Баримт бичиг, боомт болон тээврийн үе шат бүрийг нэг дороос хянана."],
  ["06", "Монголд хүлээлгэн өгөх", "Захиалга, төлбөр, баримт бичиг, тээврийн мэдээллээ хувийн кабинетаас хянана."],
] as const;
const verificationPoints = ["Exterior", "Interior", "Engine", "Chassis", "Documents", "Vehicle history"];
const logisticsSteps = ["VEHICLE", "INSPECTION", "PREPARATION", "PORT", "SHIPPING", "DESTINATION"];
const whyItems = [
  ["GLOBAL ACCESS", "Олон улсын автомашины зах зээлээс өргөн сонголт санал болгоно."],
  ["VERIFIED QUALITY", "Автомашин болон баримт бичгийн мэдээллийг боломжтой хүрээнд нягтална."],
  ["TRANSPARENT PROCESS", "Захиалгын үе шат бүрийг ойлгомжтой, нээлттэй харуулна."],
  ["END-TO-END DELIVERY", "Сонголтоос эхлээд Монголд хүлээлгэн өгөх хүртэл зохион байгуулна."],
] as const;

export const dynamic = "force-dynamic";

async function loadFeaturedVehicles() {
  try {
    return await getDb().select().from(vehicles)
      .where(and(eq(vehicles.isPublished, true), ne(vehicles.status, "ARCHIVED")))
      .orderBy(desc(vehicles.isFeatured), desc(vehicles.createdAt)).limit(4);
  } catch {
    return [];
  }
}

async function loadHeroExpos(): Promise<HeroExpo[]> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    return await getDb().select({
      id: expos.id, title: expos.title, country: expos.country, city: expos.city, venue: expos.venue,
      startDate: expos.startDate, endDate: expos.endDate, description: expos.description,
      imageUrl: expos.imageUrl, imageObjectKey: expos.imageObjectKey,
    }).from(expos).where(and(eq(expos.isPublished, true), gte(expos.endDate, today)))
      .orderBy(desc(expos.isFeatured), asc(expos.startDate)).limit(4);
  } catch {
    return [];
  }
}

const marketLabel: Record<string, string> = { KOREA: "Солонгос", USA: "Америк", MONGOLIA: "Монголд" };
function inferredDrive(trim: string | null) {
  const value = (trim ?? "").toUpperCase();
  if (/AWD|4WD|4MATIC|QUATTRO|XDRIVE/.test(value)) return "AWD / 4WD";
  if (/RWD/.test(value)) return "RWD";
  if (/FWD/.test(value)) return "FWD";
  return "—";
}

export default async function Home() {
  const [vehicleCards, heroExpos] = await Promise.all([loadFeaturedVehicles(), loadHeroExpos()]);
  const role = await getAuthenticatedRole();
  const accountPath = role ? roleHomePath(role) : "/login";
  const accountLabel = role ? "Кабинет" : "Нэвтрэх";
  const nextExpo = heroExpos[0] ?? null;
  const nextExpoImage = nextExpo?.imageObjectKey ? `/api/expo-images/${encodeURIComponent(nextExpo.id)}` : nextExpo?.imageUrl ?? null;
  const expoBackgroundStyle = nextExpoImage ? { backgroundImage: `url("${nextExpoImage}")` } : undefined;

  return (
    <main className="site-shell luxury-site global-sourcing-home">
      <header className="main-header">
        <div className="container nav-wrap">
          <a className="brand" href="/" aria-label="AUTO BRIDGE нүүр"><BrandLogo /></a>
          <nav className="desktop-nav" aria-label="Үндсэн цэс">
            <a className="active" href="/#top">Нүүр</a>
            <a href="/vehicles">Машин хайх</a>
            <a href="/calculator">Үнийн тооцоо</a>
            <a href="/#tracking">Тээвэр шалгах</a>
            <a href="/expo">Авто экспо</a>
            <a href="/news">Мэдээ</a>
            <a href="/#about">Бидний тухай</a>
            <a href="/#contact">Холбоо барих</a>
          </nav>
          <div className="nav-actions">
            <a className="nav-phone" href="tel:+97670113322"><strong>☎ 7011-3322</strong><small>Даваа–Баасан 09:00–18:00</small></a>
            <a className="language-pill" href="/">MN <ChevronRight size={13} /></a>
            <a className="login-link" href={accountPath}>{accountLabel}</a>
            <details className="mobile-menu"><summary aria-label="Цэс нээх"><Menu size={22} /></summary><div><a href="/#top">Нүүр</a><a href="/vehicles">Машин хайх</a><a href="/calculator">Үнийн тооцоо</a><a href="/#tracking">Тээврийн явц</a><a href="/expo">Авто экспо</a><a href="/news">Мэдээ</a><a href="/#about">Бидний тухай</a><a href="/#contact">Холбоо барих</a><a href={accountPath}>{accountLabel}</a></div></details>
          </div>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" />
        <div className="container hero-layout"><HomeHeroCarousel expos={[]} /></div>
      </section>

      <section className="global-trust-strip" aria-label="AUTO BRIDGE давуу тал">
        <div className="container global-trust-grid">{trustItems.map((item) => <div key={item}><span />{item}</div>)}</div>
      </section>

      <section className="curated-section" id="vehicles">
        <div className="container">
          <div className="premium-section-heading">
            <div><p className="section-kicker">CURATED VEHICLES</p><h2>Шилдэг сонголтууд</h2></div>
            <div><p>Шалгаруулсан автомашины шинэ сонголтууд</p><a href="/vehicles">Бүх автомашиныг үзэх <ArrowRight size={16} /></a></div>
          </div>
          {vehicleCards.length ? <div className="curated-grid">
            {vehicleCards.map((vehicle) => {
              const image = vehicle.imageObjectKey ? `/api/vehicle-images/${encodeURIComponent(vehicle.id)}` : vehicle.imageUrl;
              const price = Number(vehicle.priceAmount ?? vehicle.priceKrw ?? 0);
              return <article className="curated-card" key={vehicle.id}>
                <a className={`curated-image ${image ? "has-image" : ""}`} href={`/vehicles/${encodeURIComponent(vehicle.id)}`}>
                  {image ? <img loading="lazy" src={image} alt={`${vehicle.make} ${vehicle.model}`} /> : <CarFront size={116} strokeWidth={0.8} />}
                  <span className="curated-year">{vehicle.productionYear}</span>
                  <span className="curated-market">{marketLabel[vehicle.sourceMarket] ?? vehicle.sourceMarket}</span>
                </a>
                <div className="curated-copy">
                  <small>{vehicle.make}</small>
                  <h3>{vehicle.model}</h3>
                  <div className="curated-specs">
                    <span><b>{vehicle.engineCapacityCc ? `${vehicle.engineCapacityCc.toLocaleString("mn-MN")} cc` : "—"}</b><small>Хөдөлгүүр</small></span>
                    <span><b>{(vehicle.mileageKm ?? 0).toLocaleString("mn-MN")} км</b><small>Гүйлт</small></span>
                    <span><b>{inferredDrive(vehicle.trim)}</b><small>Хөтлөгч</small></span>
                  </div>
                  <div className="curated-price"><span>{price > 0 ? `${price.toLocaleString("mn-MN")} ${vehicle.priceCurrency ?? "KRW"}` : "Үнэ санал болгоно"}</span><a href={`/vehicles/${encodeURIComponent(vehicle.id)}`}>Дэлгэрэнгүй <ArrowRight size={15} /></a></div>
                </div>
              </article>;
            })}
          </div> : <div className="home-catalog-empty"><CarFront /><div><h3>Каталог шинэчлэгдэж байна</h3><p>Та хүссэн автомашиныхаа зарын холбоосыг илгээж үнийн санал авах боломжтой.</p></div><a href="/#quote">Үнийн санал авах <ArrowRight /></a></div>}
        </div>
      </section>

      <section className="global-sourcing-section" id="global-network">
        <div className="container">
          <div className="global-sourcing-map-intro">
            <div>
              <p className="section-kicker">GLOBAL SOURCING</p>
              <h2>SOURCED WITHOUT BORDERS</h2>
            </div>
            <div>
              <p>Япон, Солонгос, Хятад, Европ, АНЭУ, АНУ-ын зах зээлээс автомашины олдоц, үнэ, экспортын нөхцөлийг харьцуулна.</p>
              <small>Газрын зураг дээрх зах зээлийг сонгож, боломжит эх үүсвэр болон үйлчилгээний чиглэлийг хараарай.</small>
            </div>
          </div>
          <GlobalSourcingMap />
        </div>
        <div className="container market-grid premium-market-grid">
          {marketCards.map((market, index) => <a className="market-card" href={`/vehicles?market=${market.market}`} key={market.title}><div className="market-index">0{index + 1}</div><p>{market.eyebrow}</p><h3>{market.title}</h3><span className="market-text">{market.text}</span><div className="market-bottom"><span>{market.meta}</span><ArrowRight size={19} /></div></a>)}
        </div>
      </section>

      <section className="expo-section" id="expo" style={expoBackgroundStyle}>
        <div className="container expo-layout">
          <div className="expo-date"><span>NEXT EVENT</span><strong>{nextExpo?.startDate.slice(8, 10) ?? "—"}</strong><small>{nextExpo?.startDate.slice(0, 4) ?? "SOON"}</small></div>
          <div className="expo-copy">
            <p className="section-kicker">GLOBAL AUTO EXPO</p>
            <h2>{nextExpo?.title ?? "Олон улсын автомашины үзэсгэлэнг нэг дороос"}</h2>
            <p>{nextExpo?.description ?? "Солонгос, Япон, Герман, АНУ болон бусад орны авто экспог огноо, байршил, чиглэлээр нь хараарай."}</p>
            <div className="expo-meta"><span><CalendarDays size={16} />{nextExpo ? `${nextExpo.startDate} – ${nextExpo.endDate}` : "Экспо календарь"}</span></div>
            <div className="expo-location-bottom"><MapPin size={16} /><span>{nextExpo ? `${nextExpo.city}, ${nextExpo.country}` : "Олон улсын байршил"}</span></div>
          </div>
          <div className="expo-actions">
            <a className="outline-button" href="/expo">Бүх үзэсгэлэн харах <ArrowRight size={17} /></a>
            {nextExpo && <details className="expo-register"><summary>Экспод бүртгүүлэх <ArrowRight size={15} /></summary><form action="/api/quotes" method="post"><input type="hidden" name="vehicleUrl" value={`https://autobridge.mn/expo/${nextExpo.id}`} /><input type="hidden" name="market" value="EXPO" /><input type="hidden" name="expoId" value={nextExpo.id} /><input type="hidden" name="expoTitle" value={nextExpo.title} /><label><span>Нэр</span><input name="requesterName" required placeholder="Таны нэр" /></label><label><span>Утас</span><input name="requesterPhone" required placeholder="9911 2233" /></label><label><span>И-мэйл</span><input name="requesterEmail" type="email" required placeholder="name@example.com" /></label><button type="submit">Хүсэлт илгээх <ArrowRight size={14} /></button></form></details>}
          </div>
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="container">
          <div className="premium-section-heading"><div><p className="section-kicker">HOW IT WORKS</p><h2>Сонголтоос хүргэлт хүртэл</h2></div><p>Автомашин сонгохоос эхлээд Монголд хүлээлгэн өгөх хүртэлх үйл явцыг зургаан тодорхой үе шаттайгаар зохион байгуулна.</p></div>
          <div className="how-scroll">{howSteps.map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div>
      </section>

      <section className="verification-section">
        <div className="container verification-layout">
          <div className="verification-visual"><div className="verification-car"><CarFront size={150} strokeWidth={0.65} /></div><div className="verification-scan-line" /></div>
          <div className="verification-copy"><p className="section-kicker">INSPECTION &amp; VERIFICATION</p><h2>WE DON’T JUST<br />SOURCE CARS.<br /><em>WE VERIFY THEM.</em></h2><p>Эх зар, нийлүүлэгч болон тухайн автомашинд бүртгэгдсэн мэдээлэлд тулгуурлан машин, баримт бичгийг боломжтой хүрээнд нягтална. Баталгаажуулах боломжгүй мэдээллийг урьдчилан тодорхой тайлбарлана.</p><div className="verification-points">{verificationPoints.map((point) => <span key={point}><ShieldCheck size={15} />{point}</span>)}</div></div>
        </div>
      </section>

      <section className="logistics-section" id="tracking">
        <div className="container">
          <div className="premium-section-heading"><div><p className="section-kicker">LOGISTICS</p><h2>Тээврийн явцаа нэг дороос хянаарай</h2></div><p>Захиалгын төлөв, төлбөр, баримт бичиг болон тээврийн шинэчлэлийг хувийн кабинетаас цаг тухайд нь харах боломжтой.</p></div>
          <div className="logistics-route">{logisticsSteps.map((step, index) => <div key={step}><span>{String(index + 1).padStart(2, "0")}</span><b>{step}</b></div>)}</div>
          <div className="logistics-actions"><a href={accountPath}>Кабинет руу орох <ArrowRight size={15} /></a></div>
        </div>
      </section>

      <section className="why-section" id="about">
        <div className="container"><div className="premium-section-heading"><div><p className="section-kicker">WHY AUTO BRIDGE</p><h2>Ил тод, хариуцлагатай үйлчилгээ</h2></div><p>Таны сонголтыг дэлхийн автомашины зах зээлтэй холбоно.</p></div><div className="why-grid">{whyItems.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div>
      </section>

      <section className="quote-calculator-section" id="quote">
        <div className="container">
          <div className="premium-section-heading"><div><p className="section-kicker">REQUEST &amp; CALCULATE</p><h2>Зарын холбоосоос нийт өртөг хүртэл</h2></div><p>Encar эсвэл Cars.com зарын холбоосыг оруулаад автомашины мэдээлэл, татвар, тээвэр болон Монголд буух урьдчилсан өртгийг нэг дор тооцоолоорой.</p></div>
          <div className="quote-band"><EncarQuickQuote /></div>
          <div className="calculator-section embedded-calculator"><PublicCostCalculator compact /></div>
        </div>
      </section>

      <section className="service-strip">
        <div className="container service-grid">
          <div><Truck size={25} /><span><strong>Нэгдсэн тээвэр</strong><small>Боомтоос хүлээлгэн өгөх хүртэл</small></span></div>
          <div><FileCheck2 size={25} /><span><strong>Цахим баримт</strong><small>Гэрээ, нэхэмжлэх, тээврийн баримт нэг дор</small></span></div>
          <div><Calculator size={25} /><span><strong>Ил тод тооцоо</strong><small>Үнэ, татвар, төлбөрийн задаргаа</small></span></div>
          <div><Search size={25} /><span><strong>Явцын хяналт</strong><small>Захиалга бүрийн бодит төлөв</small></span></div>
        </div>
      </section>

      <section className="final-cta">
        <div className="container final-cta-inner"><div><p>CAN’T FIND YOUR CAR?</p><h2>Таны хайж буй машин олдохгүй байна уу?<br /><em>Бид дэлхийн зах зээлээс олж өгнө.</em></h2></div><a href="#quote">МАШИН ЗАХИАЛАХ <ArrowRight size={17} /></a></div>
      </section>

      <footer id="contact">
        <div className="container footer-inner">
          <a className="brand footer-brand" href="/" aria-label="AUTO BRIDGE нүүр"><BrandLogo /></a>
          <p>Сонголтоос хүргэлт хүртэл нэг системд.</p>
          <span className="footer-links"><a href="/privacy">Нууцлал</a><a href="/terms">Үйлчилгээний нөхцөл</a><span>© 2026 AUTO BRIDGE</span></span>
        </div>
      </footer>
    </main>
  );
}
