"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchProductBySlug, fetchProducts } from "@/lib/catalog";
import { formatVND } from "@/lib/formatters";
import ProductItemImage from "@/components/common/ProductItemImage";
import { useApp } from "@/context/AppContext";
import { ShoppingCart, ArrowLeft, Truck, RotateCcw, AlertTriangle } from "lucide-react";
import { findAllergyConflicts } from "@/lib/petOptions";
import { Product } from "@/types/models";
import { DELIVERY_TIME, SHIPPING_POLICY } from "@/lib/shipping";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

// Bố cục 2 cột: cột ảnh hẹp và cố định, cột thông tin rộng hơn. Khung chờ tải dùng chung để trang không giật khi dữ liệu về.
const LAYOUT_GRID =
  "grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-cols-[360px_minmax(0,1fr)] gap-6 md:gap-8 lg:gap-12 items-start";
// Trên điện thoại ảnh thu nhỏ và canh giữa để tên, giá, nút mua nằm ngay trong màn hình đầu
const IMAGE_FRAME = "w-full max-w-[15rem] sm:max-w-[18rem] md:max-w-none mx-auto";

const SPECIES_LABEL: Record<Product["species"], string> = { dog: "Chó", cat: "Mèo", both: "Chó và mèo" };
const SIZE_LABEL: Record<Product["targetSize"], string> = { small: "Dưới 10 kg", large: "Từ 10 kg", all: "Mọi cân nặng" };
const AGE_LABEL: Record<Product["targetAge"], string> = {
  puppy_kitten: "Dưới 1 tuổi",
  adult: "Trưởng thành",
  senior: "Trên 7 tuổi",
  all: "Mọi độ tuổi",
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { addToCart, pets, isLoggedIn } = useApp();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  // Nút đang xử lý: "add" = thêm vào giỏ, "buy" = mua ngay
  const [busy, setBusy] = useState<"add" | "buy" | null>(null);
  const { show } = useToast();
  const [related, setRelated] = useState<Product[]>([]);

  useEffect(() => {
    setLoading(true);
    setQuantity(1);
    setBusy(null);
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

  // Đưa sản phẩm vào giỏ theo số lượng đang chọn. Chưa đăng nhập thì chuyển sang trang đăng nhập.
  const putInCart = async (mode: "add" | "buy"): Promise<boolean> => {
    if (!product) return false;
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(`/shop/${slug}`)}`);
      return false;
    }
    setBusy(mode);
    await addToCart({ type: "retail", productId: product.id, product, quantity, unitPrice: product.price });
    return true;
  };

  // Thêm vào giỏ rồi ở lại trang
  const handleAdd = async () => {
    if (!product || !(await putInCart("add"))) return;
    setBusy(null);
    show(`Đã thêm ${quantity > 1 ? `${quantity} × ` : ""}${product.name} vào giỏ`, { actions: [{ label: "Xem giỏ", onClick: () => router.push("/cart") }], duration: 6000 });
  };

  // Mua ngay: thêm vào giỏ rồi sang thẳng trang thanh toán (giỏ có món khác thì thanh toán cùng lúc)
  const handleBuyNow = async () => {
    if (await putInCart("buy")) router.push("/checkout");
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" aria-busy="true">
        <div className="h-3 w-40 rounded bg-surface-muted animate-pulse" />
        <div className={LAYOUT_GRID}>
          <div className={IMAGE_FRAME}>
            <div className="aspect-square rounded-container bg-surface-muted animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-3 w-24 rounded bg-surface-muted animate-pulse" />
            <div className="h-7 w-3/4 rounded bg-surface-muted animate-pulse" />
            <div className="h-9 w-32 rounded bg-surface-muted animate-pulse" />
            <div className="h-20 rounded bg-surface-muted animate-pulse" />
            <div className="h-12 rounded-box bg-surface-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-pine-950">Không tìm thấy sản phẩm</h1>
        <Link href="/shop" className="text-pine-800 font-semibold text-sm hover:underline">
          Quay lại Cửa hàng
        </Link>
      </div>
    );
  }

  const allergyConflicts = findAllergyConflicts(product, pets);
  const specs: [string, string][] = [
    ["Dành cho", SPECIES_LABEL[product.species]],
    ["Cân nặng phù hợp", SIZE_LABEL[product.targetSize]],
    ["Độ tuổi", AGE_LABEL[product.targetAge]],
    ["Danh mục", product.categoryLabel],
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-bark-500 flex items-center gap-1.5 min-w-0">
        <Link href="/shop" className="hover:text-bark-800 flex items-center gap-1 shrink-0 whitespace-nowrap">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại Cửa hàng</span>
        </Link>
        <span>/</span>
        <span className="text-pine-950 font-semibold truncate min-w-0">{product.name}</span>
      </nav>

      <div className={LAYOUT_GRID}>
        {/* Ảnh sản phẩm thật */}
        <div className={`${IMAGE_FRAME} md:sticky md:top-24`}>
          <div className="aspect-square rounded-container overflow-hidden border border-surface-border relative bg-surface-muted">
            <ProductItemImage
              src={product.image}
              alt={`Ảnh chụp sản phẩm ${product.name}`}
              category={product.category}
              placeholderColor={product.placeholderColor}
              sizes="(max-width: 639px) 240px, (max-width: 767px) 288px, (max-width: 1023px) 40vw, 360px"
              priority
            />
          </div>
        </div>

        {/* Tên, giá và mua hàng */}
        <div className="min-w-0 space-y-5">
          <div>
            <span className="text-xs font-semibold text-pine-700">{product.categoryLabel}</span>
            <h1 className="text-[22px] sm:text-2xl lg:text-[28px] font-extrabold text-pine-950 font-display mt-1 leading-snug">
              {product.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <span className="text-[28px] lg:text-[32px] leading-none font-extrabold text-pine-950 font-display">
              {formatVND(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-bark-500 line-through">{formatVND(product.originalPrice)}</span>
            )}
            <span className={`text-xs font-semibold ${product.stock > 0 ? "text-grass-700" : "text-red-600"}`}>
              {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
            </span>
          </div>

          <p className="text-sm text-bark-700 leading-relaxed">{product.description}</p>

          {/* Cảnh báo dị ứng theo hồ sơ thú cưng (vẫn cho mua). Chỉ áp dụng cho món bé ăn vào. */}
          {allergyConflicts.map((c) => (
            <div key={`${c.petName}-${c.allergy}`} className="flex items-start gap-2 p-3 rounded-box bg-red-50 border border-red-200 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Sản phẩm có thể chứa <strong>{c.allergy.toLowerCase()}</strong>, bé {c.petName} đang khai báo dị ứng thành phần này.</span>
            </div>
          ))}

          {/* Chọn số lượng và mua */}
          <div className="space-y-3 border-t border-surface-border pt-5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-pine-950 whitespace-nowrap">Số lượng</span>
              <div className="flex items-center border border-surface-border rounded-box bg-surface-card">
                <button
                  type="button"
                  aria-label="Giảm số lượng"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 text-bark-700 hover:bg-surface-muted text-sm font-bold rounded-l-box"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-bold text-pine-950 tabular-nums" aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  aria-label="Tăng số lượng"
                  onClick={() => setQuantity(Math.min(10, product.stock, quantity + 1))}
                  className="w-10 h-10 text-bark-700 hover:bg-surface-muted text-sm font-bold rounded-r-box"
                >
                  +
                </button>
              </div>
              {product.stock > 0 && <span className="text-xs text-bark-600 whitespace-nowrap">Tối đa {Math.min(10, product.stock)}</span>}
              {quantity > 1 && (
                <span className="ml-auto text-sm text-bark-700 whitespace-nowrap">
                  Tạm tính <strong className="text-pine-950">{formatVND(product.price * quantity)}</strong>
                </span>
              )}
            </div>

            {product.stock === 0 ? (
              <Button size="lg" className="w-full" disabled>Hết hàng</Button>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="secondary" size="lg" className="!px-3" onClick={handleAdd} loading={busy === "add"} loadingText="Đang thêm…" disabled={busy !== null}>
                  <ShoppingCart className="w-4 h-4" aria-hidden="true" /> Thêm vào giỏ
                </Button>
                <Button size="lg" className="!px-3" onClick={handleBuyNow} loading={busy === "buy"} loadingText="Đang chuyển…" disabled={busy !== null}>
                  Mua ngay
                </Button>
              </div>
            )}
          </div>

          <ul className="space-y-2 text-xs text-bark-600">
            <li className="flex items-start gap-2">
              <Truck className="w-4 h-4 text-pine-800 shrink-0" aria-hidden="true" />
              <span>{DELIVERY_TIME} {SHIPPING_POLICY}</span>
            </li>
            <li className="flex items-start gap-2">
              <RotateCcw className="w-4 h-4 text-pine-800 shrink-0" aria-hidden="true" />
              <span>Đổi trả trong 7 ngày nếu còn nguyên seal (khách chịu phí ship).</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Thông số lấy từ thuộc tính sản phẩm trong DB (SPEC §9: loài, size, độ tuổi, thành phần) */}
      <section className="rounded-container bg-surface-card border border-surface-border p-5 sm:p-6">
        <h2 className="text-base font-bold text-pine-950 font-display">Thông tin sản phẩm</h2>
        <div className={`mt-4 grid grid-cols-1 gap-6 ${product.ingredients.length > 0 ? "md:grid-cols-2 md:gap-10" : ""}`}>
          <dl className="text-sm divide-y divide-surface-border">
            {specs.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <dt className="text-bark-600">{label}</dt>
                <dd className="font-semibold text-pine-950 text-right">{value}</dd>
              </div>
            ))}
          </dl>

          {product.ingredients.length > 0 && (
            <div>
              {/* Đồ chơi, phụ kiện không có "thành phần" để ăn: ghi là chất liệu */}
              <h3 className="text-sm font-bold text-pine-950">{product.isEdible ? "Thành phần chính" : "Chất liệu, thành phần"}</h3>
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {product.ingredients.map((ing, i) => (
                  <li key={i} className="px-2.5 py-1 rounded-tag bg-surface-muted border border-surface-border text-bark-700 text-xs">
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

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
