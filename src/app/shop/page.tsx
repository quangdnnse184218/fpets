"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PRODUCTS, Product } from "@/mock/products";
import { formatVND } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";
import { Star, ShoppingCart, Check, Filter, UtensilsCrossed, PawPrint, Sparkles, Dog, Cat } from "lucide-react";

export default function ShopPage() {
  const { addToCart } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSpecies, setSelectedSpecies] = useState<string>("all");
  const [addedId, setAddedId] = useState<string | null>(null);

  const categories = [
    { id: "all", label: "Tất cả sản phẩm" },
    { id: "food", label: "Thức ăn & Bánh thưởng" },
    { id: "toy", label: "Đồ chơi tương tác" },
    { id: "accessory", label: "Chăm sóc & Phụ kiện" },
  ];

  const speciesOptions = [
    { id: "all", label: "Tất cả loài" },
    { id: "dog", label: "Cho Chó" },
    { id: "cat", label: "Cho Mèo" },
  ];

  const filteredProducts = PRODUCTS.filter((p) => {
    const matchCat = selectedCategory === "all" || p.category === selectedCategory;
    const matchSpecies =
      selectedSpecies === "all" || p.species === selectedSpecies || p.species === "both";
    return matchCat && matchSpecies;
  });

  const handleQuickAdd = (product: Product) => {
    addToCart({
      type: "retail",
      productId: product.id,
      product: product,
      quantity: 1,
      unitPrice: product.price,
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1200);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Tiêu đề trang */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-pine-950 font-display">
          Cửa hàng đồ ăn & phụ kiện lẻ
        </h1>
        <p className="text-sm text-bark-600">
          Các sản phẩm được chọn lọc an toàn cho sức khỏe thú cưng, có thể mua lẻ riêng hoặc dùng làm món tuyển chọn trong Mystery Box.
        </p>
      </div>

      {/* Bộ lọc 2 hàng linh hoạt */}
      <div className="p-4 rounded-box bg-surface-card border border-surface-border space-y-3">
        {/* Lọc theo loài */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-bark-500 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Dành cho:
          </span>
          {speciesOptions.map((sp) => (
            <button
              key={sp.id}
              onClick={() => setSelectedSpecies(sp.id)}
              className={`px-3 py-1.5 rounded-box text-xs font-bold transition-colors inline-flex items-center gap-1.5 ${
                selectedSpecies === sp.id
                  ? "bg-pine-900 text-white"
                  : "bg-surface-muted hover:bg-surface-border text-bark-700"
              }`}
            >
              {sp.id === 'dog' && <Dog className="w-3.5 h-3.5 shrink-0" />}
              {sp.id === 'cat' && <Cat className="w-3.5 h-3.5 shrink-0" />}
              <span>{sp.label}</span>
            </button>
          ))}
        </div>

        {/* Lọc theo danh mục */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-border">
          <span className="text-xs font-bold text-bark-500 mr-2">Danh mục:</span>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-box text-xs font-bold transition-colors ${
                selectedCategory === cat.id
                  ? "bg-pine-900 text-white"
                  : "bg-surface-muted hover:bg-surface-border text-bark-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lưới sản phẩm */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {filteredProducts.map((product) => {
          const isJustAdded = addedId === product.id;
          return (
            <div
              key={product.id}
              className="rounded-container bg-surface-card border border-surface-border overflow-hidden flex flex-col justify-between hover:border-pine-800 transition-colors shadow-xs group"
            >
              <div className="p-3.5 sm:p-4 space-y-2.5">
                {/* Ảnh placeholder có màu nền dịu và tag */}
                <Link href={`/shop/${product.slug}`} className="block">
                  <div
                    className="w-full aspect-square rounded-box flex flex-col items-center justify-center p-3 text-center relative border border-black/5"
                    style={{ backgroundColor: product.placeholderColor }}
                  >
                    <div className="mb-1 text-bark-700">
                      {product.category === 'food' ? (
                        <UtensilsCrossed className="w-8 h-8 text-pine-900" />
                      ) : product.category === 'toy' ? (
                        <PawPrint className="w-8 h-8 text-pine-900" />
                      ) : (
                        <Sparkles className="w-8 h-8 text-pine-900" />
                      )}
                    </div>
                    <span className="text-[10px] text-bark-500 font-medium line-clamp-1">
                      [Ảnh sản phẩm]
                    </span>
                    {product.badge && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-badge bg-honey-600 text-white text-[9px] font-bold">
                        {product.badge}
                      </span>
                    )}
                  </div>
                </Link>

                <div>
                  <span className="text-[10px] font-semibold text-bark-500">
                    {product.categoryLabel}
                  </span>
                  <Link href={`/shop/${product.slug}`}>
                    <h3 className="text-xs sm:text-sm font-bold text-pine-950 mt-0.5 line-clamp-2 hover:text-pine-800 transition-colors leading-snug">
                      {product.name}
                    </h3>
                  </Link>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-bark-500">
                  <Star className="w-3 h-3 text-honey-500 fill-honey-500" />
                  <span className="font-bold text-bark-800">{product.rating}</span>
                  <span>({product.reviewCount})</span>
                </div>
              </div>

              {/* Giá & Nút thêm giỏ */}
              <div className="p-3.5 sm:p-4 pt-2 border-t border-surface-border flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-pine-950 font-display">
                    {formatVND(product.price)}
                  </div>
                  {product.originalPrice && (
                    <div className="text-[10px] text-bark-500 line-through">
                      {formatVND(product.originalPrice)}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleQuickAdd(product)}
                  className={`p-2 sm:px-3 sm:py-2 rounded-box text-xs font-bold transition-colors flex items-center gap-1 shrink-0 ${
                    isJustAdded
                      ? "bg-grass-600 text-white"
                      : "bg-pine-900 hover:bg-pine-800 text-white"
                  }`}
                  title="Thêm vào giỏ"
                >
                  {isJustAdded ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Đã thêm</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Chọn mua</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-sm text-bark-500 bg-surface-card rounded-container border border-surface-border">
          Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.
        </div>
      )}
    </div>
  );
}
