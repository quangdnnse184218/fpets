"use client";

import React, { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";

// Ảnh trôi chậm hơn trang khi cuộn (chiều sâu nhẹ). Chỉ trên màn hình rộng: điện thoại giữ ảnh đứng yên cho nhẹ máy.
// Lớp trong được phóng 1,12 lần để khi trôi không lộ mép.
export default function Parallax({ children, className, amount = 8 }: { children: React.ReactNode; className?: string; amount?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`(min-width: 1024px) and ${MOTION_OK}`, () => {
        gsap.set(inner.current, { scale: 1.12 });
        gsap.fromTo(
          inner.current,
          { yPercent: -amount / 2 },
          { yPercent: amount / 2, ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true } }
        );
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    // Vị trí (relative / absolute) do chỗ dùng quyết định qua className
    <div ref={ref} className={`overflow-hidden ${className || "relative"}`}>
      <div ref={inner} className="absolute inset-0 will-change-transform">
        {children}
      </div>
    </div>
  );
}
