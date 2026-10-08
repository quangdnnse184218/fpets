"use client";

import React, { useRef } from "react";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";

// Hiện dần khi cuộn tới. Các phần tử con có data-reveal hiện lần lượt (so le); không có thì cả khối hiện một lần.
// Phần tử có data-pop bên trong mỗi mục "bật" nhẹ sau khi mục đó hiện (ví dụ ô số thứ tự bước).
// Chỉ chạy một lần, không lặp lại khi cuộn ngược.
export default function Reveal({
  children,
  className,
  stagger = 0.09,
  y = 24,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const root = ref.current;
        if (!root) return;
        const items = gsap.utils.toArray<HTMLElement>("[data-reveal]", root);
        const targets = items.length ? items : [root];
        gsap.set(targets, { autoAlpha: 0, y });
        ScrollTrigger.batch(targets, {
          start: "top 88%",
          once: true,
          onEnter: (batch) => {
            // Xóa style GSAP để lại sau khi hiện xong, để hiệu ứng rê chuột bằng CSS (nhấc thẻ) vẫn chạy
            gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out", stagger, overwrite: true, clearProps: "transform,opacity,visibility" });
            const pops = batch.flatMap((el) => gsap.utils.toArray<HTMLElement>("[data-pop]", el as HTMLElement));
            if (pops.length) {
              gsap.fromTo(pops, { scale: 0.6 }, { scale: 1, duration: 0.55, ease: "back.out(2.2)", stagger, delay: 0.15, clearProps: "transform" });
            }
          },
        });
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
