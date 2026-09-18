"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";

const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 620;
const destination = { x: 820, y: 225 };

type Market = {
  code: "KOREA" | "JAPAN" | "CHINA" | "EUROPE" | "UAE" | "USA";
  name: string;
  eyebrow: string;
  x: number;
  y: number;
  details: string[];
  href: string;
};

const markets: Market[] = [
  {
    code: "KOREA",
    name: "Солонгос",
    eyebrow: "ҮНДСЭН ЗАХ ЗЭЭЛ",
    x: 900,
    y: 244,
    details: ["Encar болон дилерийн зар", "Чанартай хуучин автомашин", "Цахилгаан болон хосолмол хөдөлгүүртэй сонголт", "Экспортод бэлэн автомашин"],
    href: "/vehicles?market=KOREA",
  },
  {
    code: "JAPAN",
    name: "Япон",
    eyebrow: "ДУУДЛАГА ХУДАЛДАА БА ЧАНАРТАЙ СОНГОЛТ",
    x: 974,
    y: 252,
    details: ["Дуудлага худалдааны сувгууд", "Чанартай хуучин автомашин", "Спорт загварын автомашин", "Дээд зэрэглэлийн SUV"],
    href: "/#quote",
  },
  {
    code: "CHINA",
    name: "Хятад",
    eyebrow: "ЦАХИЛГААН БА ШИНЭ АВТОМАШИН",
    x: 848,
    y: 298,
    details: ["EV болон NEV сонголт", "Шинэ автомашины захиалга", "Дээд зэрэглэлийн брэндүүд", "Экспортын боломжийн шалгалт"],
    href: "/#quote",
  },
  {
    code: "EUROPE",
    name: "Европ",
    eyebrow: "ДЭЭД ЗЭРЭГЛЭЛ БА ӨНДӨР ҮЗҮҮЛЭЛТ",
    x: 590,
    y: 192,
    details: ["Тансаг зэрэглэлийн автомашин", "Өндөр үзүүлэлттэй загвар", "Баталгаажсан хуучин автомашин", "Мэргэшсэн дилерийн санал"],
    href: "/#quote",
  },
  {
    code: "UAE",
    name: "UAE",
    eyebrow: "GCC-ИЙН ДЭЭД ЗЭРЭГЛЭЛИЙН ЗАХ ЗЭЭЛ",
    x: 674,
    y: 320,
    details: ["Тансаг зэрэглэлийн SUV", "Өндөр үзүүлэлттэй автомашин", "Дилерийн зарууд", "Экспортын боломжийн шалгалт"],
    href: "/#quote",
  },
  {
    code: "USA",
    name: "USA",
    eyebrow: "ДУУДЛАГА ХУДАЛДАА БА ДИЛЕРИЙН ЗАХ ЗЭЭЛ",
    x: 205,
    y: 248,
    details: ["Дуудлага худалдааны зар", "Дилерийн сүлжээний зар", "SUV болон ачааны автомашин", "Чанартай хуучин автомашин"],
    href: "/vehicles?market=USA",
  },
];

function routePath(x: number, y: number) {
  const middleX = (x + destination.x) / 2;
  const lift = Math.min(105, Math.abs(x - destination.x) * 0.11 + 34);
  const middleY = Math.min(y, destination.y) - lift;
  return `M ${x} ${y} Q ${middleX} ${middleY} ${destination.x} ${destination.y}`;
}

function markerStyle(market: Market) {
  return {
    left: `${(market.x / VIEWBOX_WIDTH) * 100}%`,
    top: `${(market.y / VIEWBOX_HEIGHT) * 100}%`,
  };
}

export function GlobalSourcingMap() {
  const [activeCode, setActiveCode] = useState<Market["code"]>("KOREA");
  const active = useMemo(() => markets.find((market) => market.code === activeCode) ?? markets[0], [activeCode]);

  return (
    <div className="global-map-shell">
      <div className="global-map-canvas" aria-label="AUTO BRIDGE-ийн олон улсын автомашины зах зээлийн интерактив зураглал">
        <svg className="global-map-svg" viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} role="img" aria-label="Олон улсын автомашины зах зээлийн зураглал">
          <defs>
            <linearGradient id="ab-map-fill" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#2a2a28" />
              <stop offset="1" stopColor="#171716" />
            </linearGradient>
            <radialGradient id="ab-map-glow">
              <stop offset="0" stopColor="#b9a47a" stopOpacity=".26" />
              <stop offset="1" stopColor="#b9a47a" stopOpacity="0" />
            </radialGradient>
            <filter id="ab-map-soft-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
          </defs>

          <g className="global-map-graticule">
            {[120, 240, 360, 480].map((y) => <line key={`h-${y}`} x1="0" y1={y} x2="1200" y2={y} />)}
            {[150, 300, 450, 600, 750, 900, 1050].map((x) => <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="620" />)}
          </g>

          <g className="global-map-continents">
            <path d="M92 170 137 116 211 91 284 105 333 142 305 178 332 205 297 228 272 214 244 241 214 232 191 268 160 252 139 216 111 205Z" />
            <path d="M292 278 337 301 361 350 352 399 327 452 294 512 268 481 270 420 247 371 257 319Z" />
            <path d="M488 164 531 133 583 136 606 155 635 153 670 181 646 204 604 206 574 223 536 215 513 190Z" />
            <path d="M557 237 602 226 655 248 689 294 675 347 640 415 608 445 571 412 550 355 528 296Z" />
            <path d="M645 156 704 121 785 110 858 125 916 145 1001 153 1087 197 1103 235 1064 259 1015 247 980 275 929 266 889 285 842 258 803 271 773 246 730 249 705 217 671 209Z" />
            <path d="M969 382 1018 364 1060 385 1077 425 1043 456 993 449 960 417Z" />
            <path d="M438 131 455 112 477 117 469 137 450 143Z" />
            <path d="M1125 281 1138 269 1150 280 1141 297Z" />
          </g>

          <circle cx={destination.x} cy={destination.y} r="112" fill="url(#ab-map-glow)" filter="url(#ab-map-soft-glow)" opacity=".45" />

          <g className="global-map-routes">
            {markets.map((market) => (
              <path
                key={market.code}
                d={routePath(market.x, market.y)}
                className={market.code === active.code ? "is-active" : ""}
              />
            ))}
          </g>

          <g className="global-map-destination">
            <circle cx={destination.x} cy={destination.y} r="21" />
            <circle cx={destination.x} cy={destination.y} r="8" />
            <text x={destination.x + 31} y={destination.y - 5}>MONGOLIA</text>
            <text x={destination.x + 31} y={destination.y + 17}>AUTO BRIDGE HUB</text>
          </g>
        </svg>

        <div className="global-map-markers" aria-label="Автомашин нийлүүлэх зах зээлүүд">
          {markets.map((market) => {
            const isActive = market.code === active.code;
            return (
              <button
                type="button"
                key={market.code}
                className={`global-map-marker ${isActive ? "is-active" : ""}`}
                style={markerStyle(market)}
                onMouseEnter={() => setActiveCode(market.code)}
                onFocus={() => setActiveCode(market.code)}
                onClick={() => setActiveCode(market.code)}
                aria-pressed={isActive}
                aria-label={`${market.name} зах зээлийн мэдээлэл`}
              >
                <span className="global-map-marker-dot"><i /></span>
                <b>{market.code}</b>
              </button>
            );
          })}
        </div>

        <aside className="global-map-popover" aria-live="polite">
          <div className="global-map-popover-heading">
            <span><MapPin size={14} /> {active.eyebrow}</span>
            <strong>{active.name}</strong>
          </div>
          <div className="global-map-popover-list">
            {active.details.map((detail) => <span key={detail}>{detail}</span>)}
          </div>
          <a href={active.href}>Сонголтыг үзэх <ArrowUpRight size={15} /></a>
        </aside>

        <div className="global-map-hint">Зах зээлийн тэмдэглэгээг сонгож дэлгэрэнгүй мэдээллийг хараарай</div>
      </div>

      <div className="global-map-mobile-tabs" aria-label="Зах зээл сонгох">
        {markets.map((market) => (
          <button key={market.code} type="button" className={market.code === active.code ? "is-active" : ""} onClick={() => setActiveCode(market.code)}>{market.code}</button>
        ))}
      </div>

      <p className="global-map-disclaimer">Энэхүү зураглал нь AUTO BRIDGE-ийн автомашин нийлүүлэх боломжит зах зээлүүдийг танилцуулна. Тухайн автомашины олдоц, үнэ болон экспортын нөхцөлийг хүсэлт бүрээр менежер баталгаажуулна.</p>
    </div>
  );
}
