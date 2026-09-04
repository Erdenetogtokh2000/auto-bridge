"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CarFront, ChevronLeft, ChevronRight, MapPin, Pause, Play, Send } from "lucide-react";

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
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 9000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  function move(direction: number) {
    setActive((value) => (value + direction + slides.length) % slides.length);
  }

  const expo = current?.expo;
  const image = expo?.imageObjectKey ? `/api/expo-images/${encodeURIComponent(expo.id)}` : expo?.imageUrl;
  const imageStyle = image ? { backgroundImage: `linear-gradient(90deg, rgba(10,10,10,.12), rgba(10,10,10,.28)), url("${image}")` } : undefined;

  return <div className="hero-slide" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <div className={`hero-copy ${expo ? "hero-copy-expo" : ""}`} aria-live="polite">
      {expo ? <>
        <div className="eyebrow expo-hero-eyebrow"><span /> УДАХГҮЙ БОЛОХ АВТО ЭКСПО</div>
        <h1>{expo.title}</h1>
        <p>{expo.description ?? "Солонгос болон олон улсын автомашины шинэ загвар, технологийг нэг дороос үзээрэй."}</p>
        <div className="expo-hero-meta"><span><CalendarDays size={15} /> {formatDate(expo.startDate)} – {formatDate(expo.endDate)}</span><span><MapPin size={15} /> {expo.city}, {expo.country}</span></div>
        <a className="hero-expo-cta" href={`/expo/${encodeURIComponent(expo.id)}`}>Дэлгэрэнгүй үзэх <ArrowRight size={16} /></a>
      </> : <>
        <div className="eyebrow"><span /> GLOBAL AUTOMOTIVE SOURCING &amp; EXPORT</div>
        <h1>GLOBAL AUTOMOTIVE<br /><em>SOURCING &amp; EXPORT</em></h1>
        <p className="hero-brand-message">Таны сонголт. Дэлхийн зах зээл.</p>
        <p className="hero-supporting-copy">Exceptional vehicles. Sourced without borders. Сонголтоос худалдан авалт, экспорт, тээвэр хүртэлх үйл явцыг AUTO BRIDGE нэг системд холбоно.</p>
        <div className="hero-actions">
          <a className="hero-action-primary" href="/vehicles"><CarFront size={18} /> МАШИН ХАЙХ <ArrowRight size={16} /></a>
          <a className="hero-action-secondary" href="#quote"><Send size={17} /> МАШИН ЗАХИАЛАХ <ArrowRight size={16} /></a>
        </div>
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
