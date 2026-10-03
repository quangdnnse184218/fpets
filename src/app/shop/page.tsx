"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchProducts } from "@/lib/catalog";
import { formatVND } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";
import ProductItemImage from "@/components/common/ProductItemImage";
import {
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
  Search,
} from "lucide-react";
import { CATEGORY_LABEL } from "@/lib/adapters";
import { Product } from "@/types/models";

// Ngưỡng hiện nhãn "Chỉ còn X" (SPEC §4)
const LOW_STOCK = 5;

// So khớp không dấu để khách gõ "pate ca hoi" vẫn ra "Pate cá hồi"
const normalize = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

// Mỗi từ khách gõ phải khớp đầu một từ trong sản phẩm; từ ngắn (≤ 2 ký tự như "ga", "bo") phải khớp nguyên từ
// để "ga" ra "ức gà" chứ không ra "gạo", "gặm"
function matchesSearch(text: string, query: string): boolean {
  const words = normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
  const tokens = normalize(query).split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.every((t) => words.some((w) => (t.length <= 2 ? w === t : w.startsWith(t))));
}

export default function ShopPage() {
  return (
    <Suspense>
      <ShopContent />
    </Suspense>
  );
}

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart, isLoggedIn } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSpecies, setSelectedSpecies] = useState<string>("all");
  const [addedId, setAddedId] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [query, setQuery] = useState("");

  // Lọc theo link từ menu: /shop?category=food&species=cat&q=pate (cập nhật cả khi đang ở sẵn trang Shop)
  useEffect(() => {
    const category = searchParams.get("category");
    const species = searchParams.get("species");
    setSelectedCategory(category && ["food", "toy", "accessory"].includes(category) ? category : "all");
    setSelectedSpecies(species === "dog" || species === "cat" ? species : "all");
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    fetchProducts().then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  const categories = [
    { id: "all", label: "Tất cả sản phẩm" },
    { id: "food", label: CATEGORY_LABEL.food, icon: UtensilsCrossed },
    { id: "toy", label: CATEGORY_LABEL.toy, icon: PawPrint },
    { id: "accessory", label: CATEGORY_LABEL.accessory, icon: HeartHandshake },
  ];

  const speciesOptions = [
    { id: "all", label: "Tất cả loài" },
    { id: "dog", label: "Cho chó", icon: Dog },
    { id: "cat", label: "Cho mèo", icon: Cat },
  ];

  const filteredProducts = products
    .filter((p) => {
      const matchCat = selectedCategory === "all" || p.category === selectedCategory;
      const matchSpecies =
        selectedSpecies === "all" || p.species === selectedSpecies || p.species === "both";
      const matchQuery = matchesSearch(`${p.name} ${p.description} ${p.ingredients.join(" ")}`, query);
      return matchCat && matchSpecies && matchQuery;
    })
    .sort((a, b) => (sortBy === "price_asc" ? a.price - b.price : sortBy === "price_desc" ? b.price - a.price : 0));

  const handleQuickAdd = (product: Product) => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent("/shop")}`);
      return;
    }
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

  const isFiltering = selectedCategory !== "all" || selectedSpecies !== "all" || query.trim() !== "";

  const handleResetFilters = () => {
    setSelectedCategory("all");
    setSelectedSpecies("all");
    setQuery("");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Tiêu đề trang & Tóm tắt */}
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
          Cửa hàng FPETS
        </h1>
        <p className="text-xs sm:text-sm text-bark-600 max-w-2xl leading-relaxed">
          Đồ ăn, đồ chơi và phụ kiện cho chó mèo, mua lẻ từng món.
        </p>
      </div>

      {/* Ô tìm kiếm */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm sản phẩm, ví dụ: pate, bóng, lược..."
          aria-label="Tìm sản phẩm"
          className="w-full pl-10 pr-3.5 py-2.5 rounded-box border border-surface-border bg-surface-card text-sm text-bark-900 focus:outline-none focus:border-pine-800"
        />
      </div>

      {/* Thanh điều khiển Mobile: Hiện nút Mở Bộ Lọc & Số lượng kết quả */}
      <div className="lg:hidden flex items-center justify-between gap-3 p-3 rounded-box bg-surface-card border border-surface-border">
        <div className="text-xs font-semibold text-bark-700">
          Hiển thị <strong className="text-pine-950">{filteredProducts.length}</strong> sản phẩm
          {isFiltering && (
            <span className="text-xs text-bark-500 block">
              Đang lọc theo {selectedSpecies !== "all" && (selectedSpecies === "dog" ? "Chó" : "Mèo")}
              {selectedSpecies !== "all" && selectedCategory !== "all" && " · "}
              {selectedCategory !== "all" && categories.find((c) => c.id === selectedCategory)?.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Sắp xếp sản phẩm"
            className="px-2 py-2 rounded-box border border-surface-border bg-surface-card text-xs text-bark-800"
          >
            <option value="newest">Mới nhất</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
          </select>
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="px-3.5 py-2 rounded-box bg-pine-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Lọc{isFiltering && " •"}</span>
          </button>
        </div>
      </div>

      {/* BỐ CỤC CHÍNH 2 CỘT: Cột trái Sidebar cố định (sticky) + Cột phải lưới sản phẩm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ==================== CỘT TRÁI: SIDEBAR BỘ LỌC CỐ ĐỊNH ==================== */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-20 space-y-6 self-start">
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
                  className="text-xs text-bark-600 hover:text-pine-900 flex items-center gap-1 font-semibold transition-colors"
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
                  const count = products.filter((p) =>
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
                        className={`text-[11px] px-1.5 py-0.5 rounded-tag ${
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
                  const count = products.filter((p) =>
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
                        className={`text-[11px] px-1.5 py-0.5 rounded-tag ${
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
        </aside>

        {/* ==================== CỘT PHẢI: LƯỚI SẢN PHẨM ==================== */}
        <div className="lg:col-span-9 space-y-4">
          {/* Thanh tóm tắt kết quả trên Desktop */}
          <div className="hidden lg:flex items-center justify-between text-xs text-bark-500 pb-2">
            <span>
              Tìm thấy <strong className="text-pine-950">{filteredProducts.length}</strong> sản phẩm phù hợp
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sắp xếp sản phẩm"
              className="ml-auto mr-3 px-2.5 py-1.5 rounded-box border border-surface-border bg-surface-card text-xs text-bark-800 focus:outline-none focus:border-pine-800"
            >
              <option value="newest">Mới nhất</option>
              <option value="price_asc">Giá thấp đến cao</option>
              <option value="price_desc">Giá cao đến thấp</option>
            </select>
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
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-container bg-surface-muted animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center rounded-container bg-surface-card border border-surface-border space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mx-auto text-bark-400">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-pine-950">Không có sản phẩm nào phù hợp</h3>
              <p className="text-xs text-bark-600">Thử từ khóa khác hoặc đổi bộ lọc loài, danh mục.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 rounded-box bg-pine-900 text-white text-xs font-bold"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((product) => {
                const isJustAdded = addedId === product.id;
                const outOfStock = product.stock <= 0;
                return (
                  <div
                    key={product.id}
                    className="rounded-container bg-surface-card border border-surface-border overflow-hidden flex flex-col justify-between hover:border-pine-800 transition-colors shadow-xs group"
                  >
                    <div className="p-3 space-y-2">
                      {/* Ảnh thật sản phẩm với ProductItemImage */}
                      <Link href={`/shop/${product.slug}`} className="block">
                        <div className="w-full aspect-square rounded-box overflow-hidden relative border border-surface-border/60 bg-surface-muted group-hover:opacity-95 transition-opacity">
                          <ProductItemImage
                            src={product.image}
                            alt={`Ảnh sản phẩm ${product.name}`}
                            category={product.category}
                            placeholderColor={product.placeholderColor}
                            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 220px"
                          />
                          {outOfStock ? (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-badge bg-bark-700 text-white text-[11px] font-bold shadow-xs z-10">
                              Hết hàng
                            </span>
                          ) : product.stock <= LOW_STOCK ? (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-badge bg-honey-700 text-white text-[11px] font-bold shadow-xs z-10">
                              Chỉ còn {product.stock}
                            </span>
                          ) : null}
                        </div>
                      </Link>

                      <div>
                        <span className="text-[11px] font-semibold text-bark-500">
                          {product.categoryLabel}
                        </span>
                        <Link href={`/shop/${product.slug}`}>
                          <h3 className="text-xs sm:text-sm font-bold text-pine-950 mt-0.5 line-clamp-2 hover:text-pine-800 transition-colors leading-snug">
                            {product.name}
                          </h3>
                        </Link>
                      </div>
                    </div>

                    {/* Giá & Nút thêm giỏ */}
                    <div className="p-3 pt-2 border-t border-surface-border flex items-center justify-between gap-2">
                      <div className="min-h-[2.5rem] flex flex-col justify-center">
                        <div className="text-sm sm:text-base font-extrabold text-pine-950 font-display">
                          {formatVND(product.price)}
                        </div>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-bark-500 line-through">{formatVND(product.originalPrice)}</span>
                            <span className="font-bold text-red-600">
                              -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleQuickAdd(product)}
                        disabled={outOfStock}
                        className={`p-2 sm:px-3 sm:py-2 rounded-box text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          isJustAdded
                            ? "bg-grass-600 text-white"
                            : "bg-pine-900 hover:bg-pine-800 text-white"
                        }`}
                        title={outOfStock ? "Hết hàng" : "Thêm vào giỏ hàng"}
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
