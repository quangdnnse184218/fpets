"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

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
  const iconDimensions = {
    sm: { width: 32, height: 32, class: "w-7 h-7 sm:w-8 sm:h-8" },
    md: { width: 44, height: 44, class: "w-9 h-9 sm:w-10 sm:h-10" },
    lg: { width: 56, height: 56, class: "w-12 h-12" },
  }[size];

  const textSizeClasses = {
    sm: "text-base tracking-tight",
    md: "text-xl tracking-tight",
    lg: "text-2xl tracking-tight",
  }[size];

  const isDark = variant === "dark";
  const textColor = isDark ? "text-white" : "text-pine-950";

  const content = (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className={`relative ${iconDimensions.class} shrink-0`}>
        <Image
          src="/images/logo-icon.png"
          alt="FPETS"
          width={iconDimensions.width}
          height={iconDimensions.height}
          className="w-full h-full object-contain drop-shadow-2xs transition-transform duration-200 group-hover:scale-105"
          priority
        />
      </div>

      {showText && (
        <span
          className={`font-black ${textSizeClasses} ${textColor} font-display leading-none select-none`}
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
