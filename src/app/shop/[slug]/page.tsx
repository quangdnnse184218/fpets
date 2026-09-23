"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PRODUCTS } from "@/mock/products";
import { formatVND } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";
import { Star, CheckCircle2, ShoppingCart, ArrowLeft, ShieldCheck, UtensilsCrossed, PawPrint, Sparkles } from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { addToCart } = useApp();

  const product = PRODUCTS.find((p) => p.slug === slug) || PRODUCTS[0];
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart({
      type: "retail",
      productId: product.id,
      product: product,
      quantity: quantity,
      unitPrice: product.price,
    });
    setAdded(true);
    setTimeout(() => {
      router.push("/cart");
    }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-bark-500 flex items-center gap-1.5">
        <Link href="/shop" className="hover:text-bark-800 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại Shop</span>
        </Link>
        <span>/</span>
        <span className="text-pine-950 font-semibold truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Ảnh sản phẩm */}
        <div
          className="w-full aspect-square rounded-container flex flex-col items-center justify-center p-8 text-center border border-surface-border relative"
          style={{ backgroundColor: product.placeholderColor }}
        >
          <div className="mb-3 text-pine-900">
            {product.category === 'food' ? (
              <UtensilsCrossed className="w-14 h-14" />
            ) : product.category === 'toy' ? (
              <PawPrint className="w-14 h-14" />
            ) : (
              <Sparkles className="w-14 h-14" />
            )}
          </div>
          <span className="text-xs text-bark-500 font-medium">
            [Vị trí ảnh chụp thực tế sản phẩm]
          </span>
          {product.badge && (
            <span className="absolute top-3 left-3 px-2 py-0.5 rounded-badge bg-honey-600 text-white text-xs font-bold">
              {product.badge}
            </span>
          )}
        </div>

        {/* Thông tin sản phẩm */}
        <div className="space-y-5">
          <div>
            <span className="text-xs font-semibold text-pine-700">
              {product.categoryLabel}
            </span>
            <h1 className="text-2xl font-extrabold text-pine-950 font-display mt-1 leading-snug">
              {product.name}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-xs text-bark-500">
              <div className="flex items-center text-honey-500">
                <Star className="w-3.5 h-3.5 fill-honey-500" />
                <span className="font-bold text-bark-800 ml-1">{product.rating}</span>
              </div>
              <span>·</span>
              <span>{product.reviewCount} đánh giá từ ba mẹ</span>
              <span>·</span>
              <span className="text-grass-700 font-medium">Còn {product.stock} sản phẩm</span>
            </div>
          </div>

          <div className="flex items-baseline gap-3 pt-2">
            <span className="text-3xl font-extrabold text-pine-950 font-display">
              {formatVND(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-bark-500 line-through">
                {formatVND(product.originalPrice)}
              </span>
            )}
          </div>

          <div className="text-xs text-bark-700 leading-relaxed border-t border-b border-surface-border py-3">
            {product.description}
          </div>

          {/* Thành phần dinh dưỡng */}
          {product.ingredients.length > 0 && (
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-pine-950">Thành phần chính:</span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {product.ingredients.map((ing, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-tag bg-surface-muted border border-surface-border text-bark-700 text-[11px]"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Chọn số lượng & Nút thêm giỏ */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-pine-950">Số lượng:</span>
              <div className="flex items-center border border-surface-border rounded-box bg-surface-card">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1.5 text-bark-700 hover:bg-surface-muted text-sm font-bold"
                >
                  −
                </button>
                <span className="px-3 text-xs font-bold text-pine-950">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  className="px-3 py-1.5 text-bark-700 hover:bg-surface-muted text-sm font-bold"
                >
                  +
                </button>
              </div>
              <span className="text-[11px] text-bark-500">(Tối đa 10 sản phẩm)</span>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={added}
              className="w-full py-3.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{added ? "Đang chuyển đến giỏ hàng..." : `Thêm vào giỏ hàng • ${formatVND(product.price * quantity)}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
