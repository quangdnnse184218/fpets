"use client";

import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark" | "auto";
  href?: string;
  showText?: boolean;
}

export default function BrandLogo({
  className = "",
  size = "md",
  variant = "auto",
  href = "/",
  showText = true,
}: BrandLogoProps) {
  // Kích thước icon
  const iconSizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }[size];

  // Kích thước chữ
  const textSizeClasses = {
    sm: "text-base tracking-tight",
    md: "text-xl tracking-tight",
    lg: "text-2xl tracking-tight",
  }[size];

  // Màu sắc theo ngữ cảnh:
  // light: nền sáng (header, trang chủ) -> text pine-950, icon pine-900 + honey-500
  // dark: nền tối (sidebar admin, footer) -> text white, icon pine-200/white + honey-400
  // auto: dùng currentColor hoặc class cha
  const isDark = variant === "dark";
  const boxFill = isDark ? "#2D6A5B" : "#17342C"; // pine-500 hoặc pine-900
  const ribbonColor = isDark ? "#FAD893" : "#E67E22"; // honey-300 hoặc honey-500
  const textColor = isDark ? "text-white" : "text-pine-950";

  const logoSvg = (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSizeClasses} shrink-0`}
      aria-hidden="true"
    >
      {/* Thân Hộp quà (Bo góc nhẹ nhàng) */}
      <rect x="5" y="13" width="22" height="15" rx="3.5" fill={boxFill} />

      {/* Nắp hộp quà cách điệu tạo hình 2 tai thú cưng nhô lên ở hai góc */}
      {/* Tai trái */}
      <path
        d="M6 13C6 9.5 8.5 7 11 10L12 13H6Z"
        fill={boxFill}
      />
      {/* Tai phải */}
      <path
        d="M26 13C26 9.5 23.5 7 21 10L20 13H26Z"
        fill={boxFill}
      />
      {/* Vành nắp hộp */}
      <rect x="4" y="11" width="24" height="4" rx="2" fill={boxFill} />

      {/* Dải ruy băng dọc màu cam mật ong */}
      <rect x="14.5" y="11" width="3" height="17" fill={ribbonColor} />

      {/* Dải ruy băng ngang nắp */}
      <rect x="4" y="12.2" width="24" height="1.6" fill={ribbonColor} />

      {/* Nút thắt nơ hình dấu chân nhỏ xinh xắn ở giữa nắp */}
      {/* Đệm bàn chân chính (tròn) */}
      <circle cx="16" cy="9.5" r="2" fill={ribbonColor} />
      {/* 3 ngón chân nhỏ */}
      <circle cx="13.8" cy="7.2" r="0.8" fill={ribbonColor} />
      <circle cx="16" cy="6.2" r="0.9" fill={ribbonColor} />
      <circle cx="18.2" cy="7.2" r="0.8" fill={ribbonColor} />
    </svg>
  );

  const content = (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {logoSvg}
      {showText && (
        <span
          className={`font-extrabold ${textSizeClasses} ${textColor} font-display leading-none select-none`}
        >
          FPETS
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group inline-flex items-center focus:outline-hidden">
        {content}
      </Link>
    );
  }

  return content;
}
