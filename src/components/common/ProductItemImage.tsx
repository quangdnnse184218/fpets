"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Utensils,
  Cookie,
  Gamepad2,
  Brush,
  Droplets,
  HeartHandshake,
  Package,
  Layers,
  CircleDot,
  ShoppingBag,
} from "lucide-react";

interface ProductItemImageProps {
  src?: string;
  alt: string;
  category?: 'food' | 'toy' | 'accessory' | string;
  placeholderColor?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  showNote?: boolean;
}

export default function ProductItemImage({
  src,
  alt,
  category = "food",
  placeholderColor = "#E1EDE8",
  className = "w-full h-full",
  sizes = "(max-width: 768px) 100vw, 300px",
  priority = false,
  showNote = true,
}: ProductItemImageProps) {
  const [hasError, setHasError] = useState(false);

  // Chọn icon phù hợp theo tên hoặc danh mục sản phẩm
  const getProductIcon = () => {
    const lower = alt.toLowerCase();
    if (lower.includes("pate") || lower.includes("súp thưởng") || lower.includes("hạt dinh dưỡng") || lower.includes("thịt cừu")) {
      return <Utensils className="w-8 h-8 text-pine-800/80" />;
    }
    if (lower.includes("bánh quy") || lower.includes("snack") || lower.includes("ức gà")) {
      return <Cookie className="w-8 h-8 text-honey-700/80" />;
    }
    if (lower.includes("dây thừng") || lower.includes("kéo co") || lower.includes("bóng") || lower.includes("cá nhồi") || lower.includes("cần câu")) {
      return <Gamepad2 className="w-8 h-8 text-grass-700/80" />;
    }
    if (lower.includes("lược") || lower.includes("chải lông")) {
      return <Brush className="w-8 h-8 text-pine-700/80" />;
    }
    if (lower.includes("khăn ướt") || lower.includes("vệ sinh")) {
      return <Droplets className="w-8 h-8 text-grass-700/80" />;
    }
    if (lower.includes("vòng cổ")) {
      return <CircleDot className="w-8 h-8 text-honey-700/80" />;
    }

    if (category === "food") return <Utensils className="w-8 h-8 text-pine-800/80" />;
    if (category === "toy") return <Gamepad2 className="w-8 h-8 text-grass-700/80" />;
    return <Package className="w-8 h-8 text-bark-600/80" />;
  };

  const isPlaceholder = !src || src.trim() === "" || hasError;

  if (isPlaceholder) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-3 text-center select-none relative overflow-hidden ${className}`}
        style={{ backgroundColor: placeholderColor || "#E1EDE8" }}
      >
        <div className="p-3 rounded-full bg-white/70 shadow-xs backdrop-blur-xs mb-2 transform transition-transform hover:scale-105">
          {getProductIcon()}
        </div>
        {showNote && (
          <div className="space-y-0.5 z-10">
            <span className="inline-block text-[10px] font-bold text-pine-900 bg-white/85 px-2 py-0.5 rounded-full border border-pine-200/50 shadow-2xs">
              FPETS Tuyển Chọn
            </span>
            <p className="text-[9px] text-bark-600 font-medium">Chờ ảnh chụp thực tế</p>
          </div>
        )}
        {/* Họa tiết nền trang trí nhẹ nhàng */}
        <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/20 pointer-events-none" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* TODO: thay bằng ảnh thật của FPETS khi có */}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onError={() => setHasError(true)}
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  );
}
