"use client";

import React, { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";

// Số đếm tăng dần từ 0 khi cuộn tới. Không có JavaScript thì hiện ngay số thật.
export default function CountUp({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const format = (v: number) => v.toLocaleString("vi-VN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const counter = { v: 0 };
        el.textContent = format(0);
        gsap.to(counter, {
          v: value,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
          onUpdate: () => {
            el.textContent = format(counter.v);
          },
          onComplete: () => {
            el.textContent = format(value);
          },
        });
      });
      return () => mm.revert();
    },
    { dependencies: [value], revertOnUpdate: true }
  );

  return (
    <span ref={ref} className={`tabular-nums ${className || ""}`}>
      {format(value)}
    </span>
  );
}
