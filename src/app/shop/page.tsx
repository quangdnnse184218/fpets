"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PRODUCTS, Product } from "@/mock/products";
import { formatVND } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";
import ProductItemImage from "@/components/common/ProductItemImage";
import {
  Star,
  ShoppingCart,
  Check,
  Filter,
  UtensilsCrossed,
  PawPrint,
  HeartHandshake,
  Dog,
  Cat,
  X,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

export default function ShopPage() {
  const { addToCart } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSpecies, setSelectedSpecies] = useState<string>("all");
  const [addedId, setAddedId] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const categories = [
    { id: "all", label: "Tất cả sản phẩm" },
    { id: "food", label: "Thức ăn & Bánh thưởng", icon: UtensilsCrossed },
    { id: "toy", label: "Đồ chơi tương tác", icon: PawPrint },
    { id: "accessory", label: "Chăm sóc & Phụ kiện", icon: HeartHandshake },
  ];

  const speciesOptions = [
    { id: "all", label: "Tất cả loài" },
    { id: "dog", label: "Cho Chó", icon: Dog },
    { id: "cat", label: "Cho Mèo", icon: Cat },
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

  const isFiltering = selectedCategory !== "all" || selectedSpecies !== "all";

  const handleResetFilters = () => {
    setSelectedCategory("all");
    setSelectedSpecies("all");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Tiêu đề trang & Tóm tắt */}
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
          Cửa hàng đồ ăn & phụ kiện lẻ
        </h1>
        <p className="text-xs sm:text-sm text-bark-600 max-w-2xl leading-relaxed">
          Tất cả sản phẩm được chọn lọc an toàn cho sức khỏe thú cưng, có thể mua lẻ riêng hoặc dùng làm món tuyển chọn trong Mystery Box.
        </p>
      </div>

      {/* Thanh điều khiển Mobile: Hiện nút Mở Bộ Lọc & Số lượng kết quả */}
      <div className="lg:hidden flex items-center justify-between gap-3 p-3 rounded-box bg-surface-card border border-surface-border">
        <div className="text-xs font-semibold text-bark-700">
          Hiển thị <strong className="text-pine-950">{filteredProducts.length}</strong> sản phẩm
          {isFiltering && (
            <span className="text-[11px] text-bark-500 block">
              Đang lọc theo {selectedSpecies !== "all" && (selectedSpecies === "dog" ? "Chó" : "Mèo")}
              {selectedSpecies !== "all" && selectedCategory !== "all" && " · "}
              {selectedCategory !== "all" && categories.find((c) => c.id === selectedCategory)?.label}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileFilterOpen(true)}
          className="px-3.5 py-2 rounded-box bg-pine-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Bộ lọc {isFiltering && "(Đang bật)"}</span>
        </button>
      </div>

      {/* BỐ CỤC CHÍNH 2 CỘT: Cột trái Sidebar cố định (sticky) + Cột phải lưới sản phẩm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ==================== CỘT TRÁI: SIDEBAR BỘ LỌC CỐ ĐỊNH ==================== */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-24 space-y-6 self-start">
          <div className="p-5 rounded-container bg-surface-card border border-surface-border space-y-6 shadow-xs">
            {/* Header Sidebar & Nút Reset */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-pine-900" />
                <h2 className="text-sm font-bold text-pine-950">Bộ lọc sản phẩm</h2>
              </div>
              {isFiltering && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[11px] text-bark-600 hover:text-pine-900 flex items-center gap-1 font-semibold transition-colors"
                  title="Đặt lại tất cả bộ lọc"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>

            {/* Khối 1: Lọc theo Loài */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-bark-700 block">Dành cho:</span>
              <div className="space-y-1">
                {speciesOptions.map((sp) => {
                  const Icon = sp.icon;
                  const isSelected = selectedSpecies === sp.id;
                  const count = PRODUCTS.filter((p) =>
                    sp.id === "all" ? true : p.species === sp.id || p.species === "both"
                  ).length;

                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => setSelectedSpecies(sp.id)}
                      className={`w-full px-3 py-2 rounded-box text-xs font-medium flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-pine-900 text-white font-bold"
                          : "text-bark-700 hover:bg-surface-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                        <span>{sp.label}</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-tag ${
                          isSelected ? "bg-white/20 text-white" : "bg-surface-muted text-bark-500"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Khối 2: Lọc theo Danh mục */}
            <div className="space-y-2.5 pt-4 border-t border-surface-border">
              <span className="text-xs font-bold text-bark-700 block">Danh mục:</span>
              <div className="space-y-1">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  const count = PRODUCTS.filter((p) =>
                    cat.id === "all" ? true : p.category === cat.id
                  ).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full px-3 py-2 rounded-box text-xs font-medium flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-pine-900 text-white font-bold"
                          : "text-bark-700 hover:bg-surface-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                        <span>{cat.label}</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-tag ${
                          isSelected ? "bg-white/20 text-white" : "bg-surface-muted text-bark-500"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Khối cam kết an toàn ở sidebar */}
          <div className="p-4 rounded-container bg-surface-muted border border-surface-border text-xs space-y-1.5">
            <div className="font-bold text-pine-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-grass-700 shrink-0" />
              <span>Tiêu chuẩn tuyển chọn</span>
            </div>
            <p className="text-[11px] text-bark-600 leading-relaxed">
              100% thức ăn không hạt độn, hạn sử dụng tối thiểu 6 tháng, đồ chơi dai bền đạt chuẩn an toàn thú cưng.
            </p>
          </div>
        </aside>

        {/* ==================== CỘT PHẢI: LƯỚI SẢN PHẨM ==================== */}
        <div className="lg:col-span-9 space-y-4">
          {/* Thanh tóm tắt kết quả trên Desktop */}
          <div className="hidden lg:flex items-center justify-between text-xs text-bark-500 pb-2">
            <span>
              Tìm thấy <strong className="text-pine-950">{filteredProducts.length}</strong> sản phẩm phù hợp
            </span>
            {isFiltering && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-pine-900 hover:underline font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Xem tất cả sản phẩm</span>
              </button>
            )}
          </div>

          {/* Lưới sản phẩm */}
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center rounded-container bg-surface-card border border-surface-border space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mx-auto text-bark-400">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-pine-950">Không có sản phẩm nào phù hợp</h3>
              <p className="text-xs text-bark-600">Hãy thử đổi tiêu chí loài hoặc danh mục lọc bạn nhé.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 rounded-box bg-pine-900 text-white text-xs font-bold"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {filteredProducts.map((product) => {
                const isJustAdded = addedId === product.id;
                return (
                  <div
                    key={product.id}
                    className="rounded-container bg-surface-card border border-surface-border overflow-hidden flex flex-col justify-between hover:border-pine-800 transition-colors shadow-xs group"
                  >
                    <div className="p-3.5 sm:p-4 space-y-2.5">
                      {/* Ảnh thật sản phẩm với ProductItemImage */}
                      <Link href={`/shop/${product.slug}`} className="block">
                        <div className="w-full aspect-square rounded-box overflow-hidden relative border border-surface-border/60 bg-surface-muted group-hover:opacity-95 transition-opacity">
                          <ProductItemImage
                            src={product.image}
                            alt={`Ảnh sản phẩm ${product.name}`}
                            category={product.category}
                            placeholderColor={product.placeholderColor}
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                          {product.badge && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-badge bg-honey-600 text-white text-[10px] font-bold shadow-xs z-10">
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
                      </div>

                      <button
                        type="button"
                        onClick={() => handleQuickAdd(product)}
                        className={`p-2 sm:px-3 sm:py-2 rounded-box text-xs font-bold flex items-center gap-1.5 transition-colors ${
                          isJustAdded
                            ? "bg-grass-600 text-white"
                            : "bg-pine-900 hover:bg-pine-800 text-white"
                        }`}
                        title="Thêm vào giỏ hàng"
                      >
                        {isJustAdded ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span className="hidden sm:inline">Đã thêm</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            <span className="hidden sm:inline">Thêm</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================== DRAWER BỘ LỌC TRÊN MOBILE ==================== */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop tối */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileFilterOpen(false)}
          />

          {/* Drawer content trượt từ đáy */}
          <div className="fixed bottom-0 inset-x-0 bg-surface-card rounded-t-container border-t border-surface-border max-h-[85vh] overflow-y-auto p-5 space-y-6 shadow-2xl animate-[slideUp_0.25s_ease-out]">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-pine-900" />
                <h3 className="text-base font-bold text-pine-950">Bộ lọc sản phẩm</h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 rounded-box text-bark-600 hover:bg-surface-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lọc theo loài */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-bark-700 block">Dành cho:</span>
              <div className="grid grid-cols-3 gap-2">
                {speciesOptions.map((sp) => {
                  const Icon = sp.icon;
                  const isSelected = selectedSpecies === sp.id;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => setSelectedSpecies(sp.id)}
                      className={`p-2.5 rounded-box text-xs font-bold flex flex-col items-center gap-1 border transition-colors ${
                        isSelected
                          ? "bg-pine-900 text-white border-pine-900"
                          : "bg-surface-muted text-bark-700 border-surface-border"
                      }`}
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                      <span>{sp.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lọc theo danh mục */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-bark-700 block">Danh mục:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-2.5 rounded-box text-xs font-bold flex items-center justify-between border transition-colors ${
                        isSelected
                          ? "bg-pine-900 text-white border-pine-900"
                          : "bg-surface-muted text-bark-700 border-surface-border"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="w-4 h-4" />}
                        <span>{cat.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nút hành động ở đáy Drawer */}
            <div className="pt-3 border-t border-surface-border flex gap-3">
              {isFiltering && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-3 rounded-box border border-surface-border text-bark-700 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 py-3 rounded-box bg-pine-900 text-white text-xs font-bold shadow-sm"
              >
                Xem {filteredProducts.length} sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
