"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CarFront, ChevronLeft, ChevronRight, X } from "lucide-react";
import styles from "./vehicle-photo-gallery.module.css";

export function VehiclePhotoGallery({ photos, name, children }: { photos: string[]; name: string; children: ReactNode }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function show(index: number) { setActive(index); setOpen(true); }
  function move(step: number) { setActive(index => (index + step + photos.length) % photos.length); }

  return <>
    <div className="vehicle-public-detail-card">
      {photos.length > 0 ? <button type="button" className={`vehicle-public-image has-image ${styles.hero}`} onClick={() => show(0)} aria-label={`${name} зургийг томруулах`}>
        <img src={photos[0]} alt={name} />
      </button> : <div className="vehicle-public-image"><CarFront size={125} /></div>}
      {children}
    </div>
    {photos.length > 1 && <section className={styles.gallery} aria-label="Автомашины зургийн цомог">
      {photos.map((photo, index) => <button type="button" key={photo} onClick={() => show(index)} aria-label={`${name} зураг ${index + 1} томруулах`}>
        <img src={photo} alt={`${name} зураг ${index + 1}`} loading={index < 4 ? "eager" : "lazy"} />
      </button>)}
    </section>}
    <dialog ref={dialog} className={styles.viewer} aria-label={`${name} зургийн цомог`} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }} onKeyDown={event => {
      if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    }}>
      <div className={styles.toolbar}>
        <span>{name}</span>
        <button type="button" autoFocus onClick={() => setOpen(false)} aria-label="Зургийн цомгийг хаах"><X size={24} /></button>
      </div>
      {open && <img className={styles.fullImage} src={photos[active]} alt={`${name} зураг ${active + 1}`} />}
      <div className={styles.controls}>
        <button type="button" onClick={() => move(-1)} disabled={photos.length < 2} aria-label="Өмнөх зураг"><ChevronLeft size={24} /></button>
        <span aria-live="polite">{active + 1} / {photos.length}</span>
        <button type="button" onClick={() => move(1)} disabled={photos.length < 2} aria-label="Дараах зураг"><ChevronRight size={24} /></button>
      </div>
    </dialog>
  </>;
}
