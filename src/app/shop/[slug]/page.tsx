"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Product } from "@/mock/products";
import { fetchProductBySlug, fetchProducts } from "@/lib/catalog";
import { formatVND } from "@/lib/formatters";
import ProductItemImage from "@/components/common/ProductItemImage";
import { useApp } from "@/context/AppContext";
import { Star, ShoppingCart, ArrowLeft } from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { addToCart } = useApp();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [related, setRelated] = useState<Product[]>([]);

  useEffect(() => {
    setLoading(true);
    setQuantity(1);
    setAdded(false);
    Promise.all([fetchProductBySlug(slug), fetchProducts()]).then(([data, all]) => {
      setProduct(data);
      if (data) {
        // Ưu tiên cùng danh mục và hợp loài, sau đó bù bằng sản phẩm khác
        const others = all.filter((p) => p.id !== data.id);
        const sameCat = others.filter(
          (p) => p.category === data.category && (p.species === data.species || p.species === "both" || data.species === "both")
        );
        setRelated([...sameCat, ...others.filter((p) => !sameCat.includes(p))].slice(0, 4));
      }
      setLoading(false);
    });
  }, [slug]);

  const handleAdd = () => {
    if (!product) return;
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

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center text-xs text-bark-500">Đang tải sản phẩm...</div>;
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-pine-950">Không tìm thấy sản phẩm</h1>
        <Link href="/shop" className="text-pine-800 font-semibold text-sm hover:underline">
          Quay lại Shop
        </Link>
      </div>
    );
  }

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
        {/* Ảnh sản phẩm thật */}
        <div className="w-full aspect-square rounded-container overflow-hidden border border-surface-border relative bg-surface-muted shadow-sm">
          <ProductItemImage
            src={product.image}
            alt={`Ảnh chụp sản phẩm ${product.name}`}
            category={product.category}
            placeholderColor={product.placeholderColor}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          {product.badge && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-badge bg-honey-600 text-white text-xs font-bold shadow-xs z-10">
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
              {product.reviewCount > 0 ? (
                <>
                  <div className="flex items-center text-honey-500">
                    <Star className="w-3.5 h-3.5 fill-honey-500" />
                    <span className="font-bold text-bark-800 ml-1">{product.rating}</span>
                  </div>
                  <span>{product.reviewCount} đánh giá từ ba mẹ</span>
                  <span>·</span>
                </>
              ) : null}
              <span className={product.stock > 0 ? "text-grass-700 font-medium" : "text-red-600 font-medium"}>
                {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
              </span>
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
                  onClick={() => setQuantity(Math.min(10, product.stock, quantity + 1))}
                  className="px-3 py-1.5 text-bark-700 hover:bg-surface-muted text-sm font-bold"
                >
                  +
                </button>
              </div>
              <span className="text-[11px] text-bark-500">(Tối đa {Math.min(10, product.stock)} sản phẩm)</span>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={added || product.stock === 0}
              className="w-full py-3.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>
                {product.stock === 0
                  ? "Hết hàng"
                  : added
                  ? "Đang chuyển đến giỏ hàng..."
                  : `Thêm vào giỏ hàng • ${formatVND(product.price * quantity)}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-surface-border">
          <h2 className="text-lg font-bold text-pine-950 font-display">Có thể bé cũng thích</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((p) => (
              <Link
                key={p.id}
                href={`/shop/${p.slug}`}
                className="rounded-container bg-surface-card border border-surface-border overflow-hidden hover:border-pine-800 transition-colors"
              >
                <div className="relative w-full aspect-square bg-surface-muted">
                  <ProductItemImage
                    src={p.image}
                    alt={p.name}
                    category={p.category}
                    placeholderColor={p.placeholderColor}
                    sizes="(max-width: 768px) 50vw, 25vw"
                    showNote={false}
                  />
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="text-xs font-bold text-pine-950 line-clamp-2 leading-snug">{p.name}</h3>
                  <div className="text-sm font-extrabold text-pine-950">{formatVND(p.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
