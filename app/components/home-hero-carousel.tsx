"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Calculator, CarFront, Check, ChevronLeft, ChevronRight, MapPin, Pause, Play } from "lucide-react";

export type HeroExpo = {
  id: string;
  title: string;
  country: string;
  city: string;
  venue: string | null;
  startDate: string;
  endDate: string;
  description: string | null;
  imageUrl: string | null;
  imageObjectKey: string | null;
};

function formatDate(value: string) {
  return value.replaceAll("-", ".");
}

export function HomeHeroCarousel({ expos }: { expos: HeroExpo[] }) {
  const slides = useMemo(() => [{ type: "default" as const, expo: null }, ...expos.map((expo) => ({ type: "expo" as const, expo }))], [expos]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = slides[active] ?? slides[0];

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 7000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  function move(direction: number) {
    setActive((value) => (value + direction + slides.length) % slides.length);
  }

  const expo = current?.expo;
  const image = expo?.imageObjectKey ? `/api/expo-images/${encodeURIComponent(expo.id)}` : expo?.imageUrl;
  const imageStyle = image ? { backgroundImage: `linear-gradient(90deg, rgba(7,22,47,.04), rgba(7,22,47,.18)), url("${image}")` } : undefined;

  return <div className="hero-slide" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <div className={`hero-copy ${expo ? "hero-copy-expo" : ""}`} aria-live="polite">
      {expo ? <>
        <div className="eyebrow expo-hero-eyebrow"><span /> УДАХГҮЙ БОЛОХ ЭКСПО</div>
        <h1>{expo.title}</h1>
        <p>{expo.description ?? "Солонгос болон олон улсын автомашины шинэ загвар, технологийг нэг дороос үзээрэй."}</p>
        <div className="expo-hero-meta"><span><CalendarDays size={15} /> {formatDate(expo.startDate)} – {formatDate(expo.endDate)}</span><span><MapPin size={15} /> {expo.city}, {expo.country}</span></div>
        <a className="hero-expo-cta" href={`/expo/${encodeURIComponent(expo.id)}`}>Дэлгэрэнгүй үзэх <ArrowRight size={16} /></a>
      </> : <>
        <div className="eyebrow"><span /> СОЛОНГОС · МОНГОЛ · АНУ</div>
        <h1>Солонгосоос<br />Монгол хүртэл<br /><em>найдвартай.</em></h1>
        <p>Баталгаатай автомашин, ил тод үнэ, найдвартай тээвэр — сонголтоос хүлээн авах хүртэл нэг дор.</p>
        <div className="hero-actions"><a className="hero-action-primary" href="#vehicles"><CarFront size={18} /> Машин хайх <ArrowRight size={16} /></a><a className="hero-action-secondary" href="#calculator"><Calculator size={18} /> Үнийн тооцоо хийх <ArrowRight size={16} /></a></div>
      </>}
    </div>
    <div className={`hero-visual ${expo ? "hero-visual-expo" : ""}`} style={imageStyle} aria-hidden="true" />
    {slides.length > 1 && <div className="hero-carousel-controls" aria-label="Cover слайд удирдах">
      <button type="button" onClick={() => move(-1)} aria-label="Өмнөх slide"><ChevronLeft size={16} /></button>
      <div className="hero-carousel-dots">{slides.map((slide, index) => <button key={slide.expo?.id ?? "default"} type="button" className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`${index + 1}-р slide руу очих`} aria-current={index === active ? "true" : undefined} />)}</div>
      <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Автомат солилтыг эхлүүлэх" : "Автомат солилтыг зогсоох"}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>
      <button type="button" onClick={() => move(1)} aria-label="Дараагийн slide"><ChevronRight size={16} /></button>
    </div>}
  </div>;
}
