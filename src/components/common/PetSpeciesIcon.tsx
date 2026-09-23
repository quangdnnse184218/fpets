"use client";

import React from "react";
import { Dog, Cat, PawPrint } from "lucide-react";

interface PetSpeciesIconProps {
  species: 'dog' | 'cat' | 'both' | string;
  variant?: 'avatar' | 'badge' | 'inline' | 'icon-only';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export default function PetSpeciesIcon({
  species,
  variant = 'badge',
  size = 'sm',
  label,
  className = "",
}: PetSpeciesIconProps) {
  const isDog = species === 'dog' || species === 'Chó';
  const isCat = species === 'cat' || species === 'Mèo';

  // Icon sizing
  const iconSizeClass = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  }[size];

  const renderIcon = () => {
    if (isDog) return <Dog className={iconSizeClass} strokeWidth={2.2} />;
    if (isCat) return <Cat className={iconSizeClass} strokeWidth={2.2} />;
    return <PawPrint className={iconSizeClass} strokeWidth={2.2} />;
  };

  const defaultText = isDog ? "Chó" : isCat ? "Mèo" : "Chó & Mèo";
  const displayText = label !== undefined ? label : defaultText;

  // AVATAR: Vòng tròn chuyên nghiệp cho avatar thú cưng
  if (variant === 'avatar') {
    const avatarSizeClass = {
      xs: "w-7 h-7",
      sm: "w-8 h-8",
      md: "w-9 h-9",
      lg: "w-12 h-12",
    }[size];

    const colorStyle = isDog
      ? "bg-amber-50 text-amber-800 border-amber-200/90"
      : isCat
      ? "bg-pine-50 text-pine-800 border-pine-200/90"
      : "bg-surface-muted text-bark-700 border-surface-border";

    return (
      <div
        className={`${avatarSizeClass} rounded-full flex items-center justify-center shrink-0 border shadow-2xs ${colorStyle} ${className}`}
        title={displayText}
      >
        {renderIcon()}
      </div>
    );
  }

  // BADGE: Thẻ tag nhỏ chuyên nghiệp
  if (variant === 'badge') {
    const badgeColor = isDog
      ? "bg-amber-50/80 text-amber-900 border-amber-200"
      : isCat
      ? "bg-pine-50/80 text-pine-900 border-pine-200"
      : "bg-surface-muted text-bark-800 border-surface-border";

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeColor} ${className}`}
      >
        {renderIcon()}
        {displayText && <span>{displayText}</span>}
      </span>
    );
  }

  // INLINE: Biểu tượng cùng dòng với chữ
  if (variant === 'inline') {
    const textColor = isDog ? "text-amber-800" : isCat ? "text-pine-800" : "text-bark-700";
    return (
      <span className={`inline-flex items-center gap-1 font-medium ${textColor} ${className}`}>
        {renderIcon()}
        {displayText && <span>{displayText}</span>}
      </span>
    );
  }

  // ICON ONLY
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      {renderIcon()}
    </span>
  );
}
