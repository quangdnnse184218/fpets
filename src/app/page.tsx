"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Gift, CheckCircle2, Star, PackageOpen, PawPrint, Check, Truck, RefreshCw, CreditCard, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchBoxTypes, fetchProducts, fetchSubscriptionPlans } from "@/lib/catalog";
import { formatVND } from "@/lib/formatters";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/mock/products";
import ProductItemImage from "@/components/common/ProductItemImage";
import { EXCHANGE_POLICY, EXCHANGE_POLICY_SHORT, PREMIUM_ITEMS, QUIZ_LENGTH, QUIZ_NAME, STANDARD_ITEMS } from "@/lib/copy";

const HOME_FAQ = [
  {
    q: "Trong hộp có những gì?",
    a: `Box Tiêu chuẩn có ${STANDARD_ITEMS}, Box Premium có ${PREMIUM_ITEMS}. Hộp nào cũng có ít nhất 1 món ăn, 1 đồ chơi và 1 món chăm sóc/phụ kiện, chọn theo hồ sơ của bé.`,
  },
  {
    q: "Bé không thích món trong hộp thì sao?",
    a: `${EXCHANGE_POLICY} Bạn chấm "Không thích" cho món đó để hộp sau tránh.`,
  },
  {
    q: "Gói định kỳ có tự trừ tiền không?",
    a: "Không. Bạn trả trước cho 1, 3 hoặc 6 hộp. Khi còn hộp cuối, FPETS nhắc bạn gia hạn; không gia hạn thì gói tự kết thúc.",
  },
  {
    q: "Có cần tài khoản để mua không?",
    a: "Mua sản phẩm lẻ không cần tài khoản. Mystery Box cần đăng nhập để gắn với hồ sơ của bé, giúp FPETS chọn đúng món.",
  },
];

// Chỉ khoe số liệu khi đủ lớn để tạo niềm tin; "1 đánh giá" phản tác dụng
const MIN_REVIEWS_TO_SHOW = 5;
const MIN_DELIVERED_TO_SHOW = 20;

export default function HomePage() {
  const [standardBoxPrice, setStandardBoxPrice] = useState(299000);
  const [standardMinValue, setStandardMinValue] = useState(380000);
  const [premiumBoxPrice, setPremiumBoxPrice] = useState(499000);
  const [premiumMinValue, setPremiumMinValue] = useState(650000);
  const [plans, setPlans] = useState<{ id: string; name: string; cycle_count: number; discount_percentage: number; free_shipping: boolean; birthday_gift: boolean }[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [stats, setStats] = useState({ delivered: 0, avgRating: 0, reviewCount: 0 });
  const [topReviews, setTopReviews] = useState<{ id: string; rating: number; comment: string | null; created_at: string; profiles: { full_name: string | null } | null }[]>([]);

  useEffect(() => {
    fetchBoxTypes().then((boxes) => {
      const standard = boxes.find((b) => b.slug.includes("tieu-chuan")) || boxes[0];
      const premium = boxes.find((b) => b.slug.includes("premium")) || boxes[boxes.length - 1];
      if (standard) {
        setStandardBoxPrice(standard.basePrice);
        setStandardMinValue(standard.minRetailValue);
      }
      if (premium) {
        setPremiumBoxPrice(premium.basePrice);
        setPremiumMinValue(premium.minRetailValue);
      }
    });
    fetchSubscriptionPlans().then((data) => setPlans(data));
    fetchProducts().then((data) => setFeatured(data.filter((p) => p.stock > 0).slice(0, 4)));

    const supabase = createClient();
    Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "da_giao"),
      supabase.from("reviews").select("rating").eq("status", "published"),
      supabase
        .from("reviews")
        .select("id, rating, comment, created_at, profiles(full_name)")
        .eq("status", "published")
        .gte("rating", 4)
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(3),
    ]).then(([deliveredRes, reviewsRes, topRes]) => {
      const reviews = reviewsRes.data || [];
      setStats({
        delivered: deliveredRes.count || 0,
        avgRating: reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0,
        reviewCount: reviews.length,
      });
      setTopReviews((topRes.data as unknown as typeof topReviews) || []);
    });
  }, []);

  return (
    <div className="space-y-16 sm:space-y-24 pb-16 sm:pb-24">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F6F4EE] via-[#FAF9F6] to-[#F1EFE8] border-b border-surface-border/80 pt-6 pb-12 sm:pt-10 sm:pb-16">
        <div className="absolute top-1/4 right-1/4 w-[420px] h-[420px] rounded-full bg-honey-200/35 blur-[100px] pointer-events-none animate-pulse-slow" />
        <div className="absolute -bottom-16 -left-16 w-[380px] h-[380px] rounded-full bg-pine-100/40 blur-[90px] pointer-events-none" />

        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <PawPrint className="absolute top-10 left-12 w-7 h-7 text-pine-900/5 animate-float-slow hidden md:block" />
          <Gift className="absolute top-1/3 left-6 w-8 h-8 text-honey-600/10 animate-float-reverse hidden lg:block -rotate-12" />
          <PawPrint className="absolute bottom-12 left-1/3 w-6 h-6 text-pine-900/5 animate-float-slow hidden md:block rotate-45" />
          <Gift className="absolute top-12 right-12 w-8 h-8 text-honey-600/10 animate-float-slow hidden md:block rotate-12" />
          <PawPrint className="absolute bottom-14 right-1/4 w-7 h-7 text-pine-900/5 animate-float-reverse hidden md:block -rotate-12" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pine-50 border border-pine-100 text-pine-900 text-xs font-semibold">
              <Gift className="w-3.5 h-3.5 text-pine-800" />
              <span>Hộp quà thú cưng cá nhân hóa định kỳ</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-extrabold text-pine-950 font-display tracking-tight leading-[1.12]">
              Hộp quà bất ngờ mỗi tháng cho bé cưng của bạn.
            </h1>

            <p className="text-base sm:text-lg text-bark-700 leading-relaxed max-w-xl">
              Mystery Box gồm đồ ăn, đồ chơi và phụ kiện, được FPETS chọn riêng theo cân nặng, độ tuổi, dị ứng và sở thích của cún hoặc mèo nhà bạn. Mua thử 1 hộp hoặc đăng ký nhận hằng tháng.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
              <Link
                href="/quiz"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm hover:shadow transition-all text-center"
              >
                Làm {QUIZ_NAME} tìm box cho bé
              </Link>
              <Link
                href="/boxes"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-white hover:bg-surface-muted text-pine-950 border border-surface-border font-bold text-sm shadow-2xs hover:shadow-xs transition-all text-center"
              >
                Xem các loại box
              </Link>
            </div>

            {/* Số liệu lấy thật từ database; chỉ hiện khi đã có dữ liệu để tránh khoe số 0 */}
            {(stats.delivered >= MIN_DELIVERED_TO_SHOW || stats.reviewCount >= MIN_REVIEWS_TO_SHOW) && (
              <div className="pt-4 border-t border-surface-border/70 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-bark-600">
                {stats.delivered >= MIN_DELIVERED_TO_SHOW && (
                  <div>
                    <span className="font-extrabold text-pine-950 block leading-tight">{stats.delivered.toLocaleString("vi-VN")}</span>
                    <span className="text-[11px] text-bark-500">Đơn hàng đã giao</span>
                  </div>
                )}
                {stats.delivered >= MIN_DELIVERED_TO_SHOW && stats.reviewCount >= MIN_REVIEWS_TO_SHOW && <div className="hidden sm:block w-px h-7 bg-surface-border" />}
                {stats.reviewCount >= MIN_REVIEWS_TO_SHOW && (
                  <div>
                    <div className="flex items-center gap-1 font-extrabold text-pine-950 leading-tight">
                      <Star className="w-3.5 h-3.5 text-honey-500 fill-honey-500" />
                      <span>{stats.avgRating.toFixed(1)} / 5</span>
                    </div>
                    <span className="text-[11px] text-bark-500">Từ {stats.reviewCount} đánh giá</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border border-surface-border/90 shadow-lg bg-white p-2 sm:p-2.5">
              {/* Ảnh minh họa tạo bằng AI; thay bằng ảnh chụp hộp thật khi có */}
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-surface-muted">
                <Image
                  src="/images/hero/fpets-box-open.jpg"
                  alt="Hộp FPETS đang mở với gói snack, bóng cao su, dây thừng và thiệp gửi bé"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                  priority
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs text-pine-950 text-xs font-bold shadow-xs border border-white/80 flex items-center gap-1.5 z-10">
                  <PackageOpen className="w-3.5 h-3.5 text-pine-900" />
                  <span>Mỗi hộp chọn riêng cho một bé</span>
                </div>
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/45 text-white text-[10px] z-10">Ảnh minh họa</span>
              </div>

              <div className="p-3.5 sm:p-4 bg-[#FAF9F6] rounded-xl border border-surface-border/80 mt-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-pine-950 text-sm">{STANDARD_ITEMS} đồ ăn, đồ chơi, phụ kiện</span>
                  <span className="px-2 py-0.5 rounded-full bg-grass-100 text-grass-800 text-[11px] font-bold shrink-0">
                    Trị giá từ {formatVND(standardMinValue)}
                  </span>
                </div>
                <div className="pt-2 flex items-center justify-between gap-2 text-[11px] text-bark-500 border-t border-surface-border/70">
                  {/* SPEC §10: chỉ đổi món khi lỗi của shop, KHÔNG đổi vì bé không thích */}
                  <span className="text-grass-700 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" /> {EXCHANGE_POLICY_SHORT}
                  </span>
                  <span className="font-bold text-pine-950 shrink-0">Từ {formatVND(standardBoxPrice)}/hộp</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CÁCH HOẠT ĐỘNG: 3 bước trực quan (Hiểu ngay trong 5 giây) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
            Cách Mystery Box hoạt động
          </h2>
          <p className="text-xs sm:text-sm text-bark-600">
            Không đóng sẵn hàng loạt: mỗi hộp được chọn sát ngày giao, dựa trên hồ sơ của bé.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="p-6 rounded-container bg-surface-card border border-surface-border space-y-3 relative hover:border-pine-800 transition-colors">
            <div className="w-10 h-10 rounded-box bg-pine-900 text-white flex items-center justify-center font-bold text-base font-display">
              1
            </div>
            <h3 className="text-base font-bold text-pine-950">Tạo hồ sơ thú cưng</h3>
            <p className="text-xs sm:text-sm text-bark-600 leading-relaxed">
              Trả lời {QUIZ_NAME} ({QUIZ_LENGTH}): loài, cân nặng, độ tuổi, sở thích và thành phần bé bị dị ứng.
            </p>
          </div>

          <div className="p-6 rounded-container bg-surface-card border border-surface-border space-y-3 relative hover:border-pine-800 transition-colors">
            <div className="w-10 h-10 rounded-box bg-honey-600 text-white flex items-center justify-center font-bold text-base font-display">
              2
            </div>
            <h3 className="text-base font-bold text-pine-950">FPETS chọn món theo hồ sơ</h3>
            <p className="text-xs sm:text-sm text-bark-600 leading-relaxed">
              Sát ngày giao, FPETS chọn {STANDARD_ITEMS} (Box Premium {PREMIUM_ITEMS}), loại các món chứa thành phần bé bị dị ứng và không trùng món đã gửi.
            </p>
          </div>

          <div className="p-6 rounded-container bg-surface-card border border-surface-border space-y-3 relative hover:border-pine-800 transition-colors">
            <div className="w-10 h-10 rounded-box bg-pine-900 text-white flex items-center justify-center font-bold text-base font-display">
              3
            </div>
            <h3 className="text-base font-bold text-pine-950">Nhận hộp và chấm điểm món</h3>
            <p className="text-xs sm:text-sm text-bark-600 leading-relaxed">
              Mở hộp cùng bé, chấm từng món &ldquo;thích / bình thường / không thích&rdquo; để hộp sau hợp khẩu vị hơn.
            </p>
          </div>
        </div>
      </section>

      {/* 3. BẢNG GIÁ: 2 loại box + tóm tắt gói định kỳ (chi tiết ở /subscription) */}
      <section className="bg-pine-900 text-pine-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display text-balance">
              Hai loại Mystery Box
            </h2>
            <p className="text-sm text-pine-200 text-balance">
              Mua thử 1 hộp để xem bé có thích không, hoặc đăng ký gói định kỳ để được giảm giá.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                name: "Box Tiêu chuẩn",
                price: standardBoxPrice,
                minValue: standardMinValue,
                items: STANDARD_ITEMS,
                highlight: false,
                bullets: ["Ít nhất 1 món ăn, 1 đồ chơi, 1 món chăm sóc/phụ kiện", "Có phiên bản cho chó nhỏ, chó lớn và mèo"],
              },
              {
                name: "Box Premium",
                price: premiumBoxPrice,
                minValue: premiumMinValue,
                items: PREMIUM_ITEMS,
                highlight: true,
                bullets: ["Thêm đồ ăn nhập khẩu và đồ chơi trí tuệ", "Có phiên bản cho chó nhỏ, chó lớn và mèo"],
              },
            ].map((box) => (
              <div
                key={box.name}
                className={
                  box.highlight
                    ? // Premium: tông vàng champagne, viền phát sáng, nhô cao hơn thẻ Tiêu chuẩn
                      "relative rounded-container p-6 sm:p-8 flex flex-col justify-between text-bark-900 bg-gradient-to-br from-[#FFFBF0] via-[#FCEFD2] to-[#F3DDA8] border-2 border-amber-400 shadow-[0_0_0_4px_rgba(232,176,70,0.18),0_24px_60px_-12px_rgba(232,176,70,0.55)] md:-translate-y-3"
                    : "relative bg-surface-card text-bark-900 rounded-container p-6 sm:p-8 flex flex-col justify-between border-2 border-transparent"
                }
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-xl font-bold ${box.highlight ? "text-[#5A3E0A] font-display" : "text-pine-950"}`}>{box.name}</h3>
                    {box.highlight && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-tag bg-white/70 text-amber-800 border border-amber-300">Nhiều món hơn</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-extrabold font-display ${box.highlight ? "bg-gradient-to-r from-[#8A5A00] to-[#C98A10] bg-clip-text text-transparent" : "text-pine-950"}`}>
                      {formatVND(box.price)}
                    </span>
                    <span className="text-xs text-bark-500">/ hộp</span>
                  </div>
                  <p className={`text-xs font-semibold ${box.highlight ? "text-amber-800" : "text-grass-700"}`}>Trị giá sản phẩm tối thiểu {formatVND(box.minValue)}</p>
                  <ul className={`space-y-2.5 text-sm pt-2 border-t ${box.highlight ? "text-[#4A3A1A] border-amber-300/70" : "text-bark-700 border-surface-border"}`}>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${box.highlight ? "text-amber-600" : "text-grass-600"}`} />
                      <span><strong>{box.items}</strong> chọn theo hồ sơ thú cưng</span>
                    </li>
                    {box.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${box.highlight ? "text-amber-600" : "text-grass-600"}`} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`pt-6 mt-6 border-t ${box.highlight ? "border-amber-300/70" : "border-surface-border"}`}>
                  <Link
                    href={box.highlight ? "/boxes?tier=premium" : "/boxes?tier=standard"}
                    className={
                      box.highlight
                        ? "block w-full py-3 rounded-box text-center text-sm font-extrabold text-pine-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:brightness-105 shadow-md transition"
                        : "block w-full py-3 rounded-box text-center text-sm font-bold bg-pine-900 hover:bg-pine-800 text-white transition-colors"
                    }
                  >
                    Xem {box.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Tóm tắt gói định kỳ, áp dụng cho cả 2 loại box */}
          {plans.length > 0 && (
            <div className="max-w-4xl mx-auto mt-8 p-5 rounded-container bg-pine-950/50 border border-pine-800 flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div className="flex flex-wrap gap-2 text-xs">
                {plans.map((plan) => (
                  <span key={plan.id} className="px-3 py-1.5 rounded-tag bg-pine-800 text-pine-100">
                    <strong className="text-white">{plan.name}</strong>
                    {plan.discount_percentage > 0 ? ` · giảm ${plan.discount_percentage}%` : " · giá gốc"}
                    {plan.free_shipping ? " · freeship" : ""}
                    {plan.birthday_gift ? " · quà sinh nhật" : ""}
                  </span>
                ))}
              </div>
              <Link href="/subscription" className="shrink-0 text-center px-5 py-2.5 rounded-box bg-honey-500 hover:bg-honey-600 text-pine-950 text-xs font-bold">
                Xem gói định kỳ
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 4. DẢI CAM KẾT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Truck, title: "Giao toàn quốc", text: "25.000₫ nội thành TP.HCM, 35.000₫ tỉnh khác. Freeship đơn từ 500.000₫ và gói 3, 6 hộp." },
            { icon: RefreshCw, title: EXCHANGE_POLICY_SHORT, text: "Dị ứng đã khai, hàng hỏng hoặc giao thiếu: báo trong 3 ngày kèm ảnh mở hộp." },
            { icon: CreditCard, title: "Thanh toán quen thuộc", text: "MoMo, VNPay hoặc COD cho đơn mua 1 lần. Không tự động trừ tiền." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="p-5 rounded-container bg-surface-card border border-surface-border flex gap-3">
              <div className="w-10 h-10 rounded-box bg-pine-50 text-pine-900 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-pine-950">{title}</h3>
                <p className="text-xs text-bark-600 leading-relaxed">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. SẢN PHẨM NỔI BẬT TỪ SHOP */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Mua lẻ tại Shop</h2>
              <p className="text-xs sm:text-sm text-bark-600">Đồ ăn, đồ chơi và phụ kiện bán lẻ, không cần tài khoản.</p>
            </div>
            <Link href="/shop" className="text-sm font-bold text-pine-900 hover:underline shrink-0">Xem tất cả</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map((p) => (
              <Link key={p.id} href={`/shop/${p.slug}`} className="rounded-container bg-surface-card border border-surface-border overflow-hidden hover:border-pine-800 transition-colors group">
                <div className="relative w-full aspect-square bg-surface-muted">
                  <ProductItemImage src={p.image} alt={p.name} category={p.category} placeholderColor={p.placeholderColor} sizes="(max-width: 768px) 50vw, 25vw" showNote={false} />
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-pine-950 line-clamp-2 leading-snug min-h-[2.5em]">{p.name}</h3>
                  <div className="text-sm font-extrabold text-pine-950">{formatVND(p.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 6. FEEDBACK KHÁCH HÀNG: chỉ hiển thị review thật đã xuất bản, ẩn cả mục nếu chưa có */}
      {topReviews.length >= 3 && (
        <section className="bg-surface-muted border-y border-surface-border py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
                Niềm vui unbox của các bé
              </h2>
              <p className="text-sm text-bark-600">
                Đánh giá từ khách hàng đã nhận hàng từ FPETS.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topReviews.map((rev) => (
                <div key={rev.id} className="p-5 rounded-container bg-surface-card border border-surface-border space-y-3">
                  <div className="flex items-center gap-1 text-honey-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < rev.rating ? "fill-honey-500" : "fill-bark-200 text-bark-200"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-bark-700 leading-relaxed line-clamp-5">&ldquo;{rev.comment}&rdquo;</p>
                  <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs">
                    <span className="font-bold text-pine-950">{rev.profiles?.full_name || "Khách hàng FPETS"}</span>
                    <span className="text-[11px] text-bark-500">{new Date(rev.created_at).toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link href="/reviews" className="text-sm font-bold text-pine-900 hover:underline">
                Xem tất cả đánh giá
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 7. FAQ NGẮN */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display text-center">Câu hỏi thường gặp</h2>
        <div className="rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border">
          {HOME_FAQ.map((item) => (
            <details key={item.q} className="group p-4 sm:p-5">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-bold text-pine-950">
                <span>{item.q}</span>
                <ChevronDown className="w-4 h-4 text-bark-500 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-xs sm:text-sm text-bark-600 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="text-center">
          <Link href="/faq" className="text-sm font-bold text-pine-900 hover:underline">Xem thêm câu hỏi</Link>
        </div>
      </section>

      {/* 8. CTA CUỐI TRANG */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-container bg-pine-900 text-white overflow-hidden shadow-lg grid grid-cols-1 md:grid-cols-12 items-center">
          <div className="p-8 sm:p-12 md:col-span-7 space-y-5 text-left">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display leading-tight">
              Sẵn sàng tặng bé hộp quà đầu tiên?
            </h2>
            <p className="text-sm sm:text-base text-pine-200 leading-relaxed">
              Trả lời {QUIZ_NAME} ({QUIZ_LENGTH}) để FPETS gợi ý loại box hợp với bé, loại các món bé bị dị ứng theo khai báo và chọn đồ chơi đúng cỡ.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/quiz"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-box bg-white hover:bg-pine-50 text-pine-950 font-bold text-sm shadow-md transition-colors"
              >
                <span>Làm {QUIZ_NAME}</span>
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-box bg-pine-800 hover:bg-pine-750 text-pine-100 font-bold text-sm transition-colors border border-pine-700/60"
              >
                <span>Xem Shop bán lẻ</span>
              </Link>
            </div>
          </div>

          <div className="md:col-span-5 h-64 md:h-full relative min-h-[280px]">
            <Image
              src="https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=800&q=80"
              alt="Chú cún con đáng yêu"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
