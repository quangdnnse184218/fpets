"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Parallax from "@/components/motion/Parallax";

// Ảnh hộp ở hero trang chủ: hộp cho chó và hộp cho mèo, tự đổi qua lại; bấm chấm để chọn ảnh
const SLIDES = [
  { src: "/images/hero/fpets-box-dog.webp", alt: "Hộp FPETS Pet Mystery Box in hình cún corgi", label: "Hộp cho chó" },
  { src: "/images/hero/fpets-box-cat.webp", alt: "Hộp FPETS Pet Mystery Box in hình mèo", label: "Hộp cho mèo" },
];
const INTERVAL_MS = 4500;

export default function HeroBoxSlides() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setActive((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [active]);

  return (
    <div className="absolute inset-0">
      <Parallax className="absolute inset-0">
        {SLIDES.map((s, i) => (
          <Image
            key={s.src}
            src={s.src}
            alt={s.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 480px"
            className={`object-cover transition-opacity duration-1000 ease-in-out ${i === active ? "opacity-100" : "opacity-0"}`}
            priority={i === 0}
            aria-hidden={i !== active}
          />
        ))}
      </Parallax>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1.5 rounded-full bg-black/25 backdrop-blur-xs">
        {SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            onClick={() => setActive(i)}
            aria-label={s.label}
            aria-pressed={i === active}
            className={`h-2 rounded-full transition-all ${i === active ? "w-5 bg-white" : "w-2 bg-white/60 hover:bg-white/80"}`}
          />
        ))}
      </div>
    </div>
  );
}
