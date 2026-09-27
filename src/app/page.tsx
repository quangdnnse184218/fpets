"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Gift, CheckCircle2, Star, PackageOpen, PawPrint, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchBoxTypes, fetchSubscriptionPlans } from "@/lib/catalog";
import { formatVND } from "@/lib/formatters";
import { createClient } from "@/lib/supabase/client";

const HERO_ITEMS = [
  { src: "/images/products/pate-ca-hoi.jpg", alt: "Pate cá hồi cho mèo" },
  { src: "/images/products/bong-cao-su.jpg", alt: "Bóng cao su cho chó" },
  { src: "/images/products/day-thung-keo-co.jpg", alt: "Dây thừng kéo co" },
  { src: "/images/products/banh-quy-canxi.jpg", alt: "Bánh quy canxi cho chó" },
];

// Chỉ khoe số liệu khi đủ lớn để tạo niềm tin; "1 đánh giá" phản tác dụng
const MIN_REVIEWS_TO_SHOW = 5;
const MIN_DELIVERED_TO_SHOW = 20;

export default function HomePage() {
  const [standardBoxPrice, setStandardBoxPrice] = useState(299000);
  const [standardMinValue, setStandardMinValue] = useState(380000);
  const [premiumBoxPrice, setPremiumBoxPrice] = useState(499000);
  const [premiumMinValue, setPremiumMinValue] = useState(650000);
  const [plans, setPlans] = useState<{ id: string; name: string; cycle_count: number; discount_percentage: number; free_shipping: boolean; birthday_gift: boolean; badge: string | null; description: string | null }[]>([]);
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
    <div className="space-y-16 sm:space-y-24">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F6F4EE] via-[#FAF9F6] to-[#F1EFE8] border-b border-surface-border/80 pt-8 pb-14 sm:pt-16 sm:pb-20">
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
              Mỗi tháng, một chiếc Mystery Box chứa thức ăn thơm ngon, đồ chơi dai bền và phụ kiện hữu ích được đóng gói riêng theo đúng hồ sơ, cân nặng và sở thích của cún và mèo nhà bạn.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
              <Link
                href="/quiz"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm hover:shadow transition-all text-center"
              >
                Làm Quiz tìm Box cho bé
              </Link>
              <Link
                href="/boxes"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-white hover:bg-surface-muted text-pine-950 border border-surface-border font-bold text-sm shadow-2xs hover:shadow-xs transition-all text-center"
              >
                Xem các loại Mystery Box
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
              {/* Ghép ảnh sản phẩm thật của shop: minh họa các món có thể nằm trong hộp */}
              <div className="relative w-full h-[280px] sm:h-[350px] md:h-[390px] rounded-xl overflow-hidden bg-surface-muted grid grid-cols-2 grid-rows-2 gap-1.5">
                {HERO_ITEMS.map((item, i) => (
                  <div key={item.src} className="relative overflow-hidden group">
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      sizes="(max-width: 768px) 50vw, 22vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      priority={i < 2}
                    />
                  </div>
                ))}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs text-pine-950 text-xs font-bold shadow-xs border border-white/80 flex items-center gap-1.5 z-10">
                  <PackageOpen className="w-3.5 h-3.5 text-pine-900" />
                  <span>Có thể có trong hộp của bé</span>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 bg-[#FAF9F6] rounded-xl border border-surface-border/80 mt-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-pine-950 text-sm">Gồm 4 – 5 món dinh dưỡng & đồ chơi</span>
                  <span className="px-2 py-0.5 rounded-full bg-grass-100 text-grass-800 text-[11px] font-bold shrink-0">
                    Trị giá từ {formatVND(standardMinValue)}
                  </span>
                </div>
                <p className="text-[11px] text-bark-600 line-clamp-1">
                  Pate tươi · Bánh thưởng dinh dưỡng · Đồ chơi dai bền · Phụ kiện chăm sóc
                </p>
                <div className="pt-2 flex items-center justify-between gap-2 text-[11px] text-bark-500 border-t border-surface-border/70">
                  {/* SPEC §10: chỉ đổi món khi dị ứng/lỗi của shop, KHÔNG đổi vì bé không thích */}
                  <span className="text-grass-700 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Đổi món miễn phí nếu dị ứng
                  </span>
                  <span className="font-bold text-pine-950 shrink-0">Chỉ từ {formatVND(standardBoxPrice)}/hộp</span>
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
            Cách Mystery Box vận hành cho từng bé
          </h2>
          <p className="text-xs sm:text-sm text-bark-600">
            Chúng tôi không đóng sẵn hàng loạt. Mỗi hộp được FPETS tuyển chọn riêng sát ngày giao dựa trên hồ sơ của bé.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="p-6 rounded-container bg-surface-card border border-surface-border space-y-3 relative hover:border-pine-800 transition-colors">
            <div className="w-10 h-10 rounded-box bg-pine-900 text-white flex items-center justify-center font-bold text-base font-display">
              1
            </div>
            <h3 className="text-base font-bold text-pine-950">Tạo hồ sơ riêng cho bé cưng</h3>
            <p className="text-xs sm:text-sm text-bark-600 leading-relaxed">
              Chia sẻ tên bé, giống loài (chó/mèo), cân nặng, sở thích và các thành phần dị ứng (như gà, bắp, hải sản...) qua Quiz 2 phút để FPETS chuẩn bị đúng món.
            </p>
          </div>

          <div className="p-6 rounded-container bg-surface-card border border-surface-border space-y-3 relative hover:border-pine-800 transition-colors">
            <div className="w-10 h-10 rounded-box bg-honey-600 text-white flex items-center justify-center font-bold text-base font-display">
              2
            </div>
            <h3 className="text-base font-bold text-pine-950">FPETS chọn đồ riêng theo hồ sơ</h3>
            <p className="text-xs sm:text-sm text-bark-600 leading-relaxed">
              Sát ngày giao, FPETS chọn 4–7 món đạt chuẩn an toàn, kiểm tra thành phần loại trừ dị ứng và cơ cấu đủ đồ ăn + đồ chơi + phụ kiện.
            </p>
          </div>

          <div className="p-6 rounded-container bg-surface-card border border-surface-border space-y-3 relative hover:border-pine-800 transition-colors">
            <div className="w-10 h-10 rounded-box bg-pine-900 text-white flex items-center justify-center font-bold text-base font-display">
              3
            </div>
            <h3 className="text-base font-bold text-pine-950">Nhận hộp tại nhà & Bé mê tít</h3>
            <p className="text-xs sm:text-sm text-bark-600 leading-relaxed">
              Nhận hộp quà mở bất ngờ mỗi tháng. Bạn chấm điểm món bé thích hay ghét để hộp các tháng tiếp theo được tối ưu ngày càng hợp khẩu vị bé.
            </p>
          </div>
        </div>
      </section>

      {/* 3. SO SÁNH 2 LOẠI BOX: Tiêu chuẩn vs Premium */}
      <section className="bg-pine-900 text-pine-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              Hai phiên bản Mystery Box cho bạn lựa chọn
            </h2>
            <p className="text-sm text-pine-200">
              Có thể mua thử 1 hộp duy nhất để xem phản ứng của bé, hoặc đăng ký nhận đều đặn mỗi tháng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Box Tiêu chuẩn */}
            <div className="bg-surface-card text-bark-900 rounded-container p-6 sm:p-8 flex flex-col justify-between border-2 border-transparent">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-pine-950">Box Tiêu Chuẩn</h3>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-tag bg-pine-100 text-pine-800">
                    Phổ biến nhất
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-pine-950 font-display">{formatVND(standardBoxPrice)}</span>
                  <span className="text-xs text-bark-500">/ hộp</span>
                </div>
                <p className="text-xs text-grass-700 font-semibold">
                  Giá trị hàng bên trong tối thiểu {formatVND(standardMinValue)}
                </p>
                <ul className="space-y-2.5 text-sm text-bark-700 pt-2 border-t border-surface-border">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-grass-600 shrink-0" />
                    <span><strong>4–5 món</strong> tuyển chọn theo Pet Profile</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-grass-600 shrink-0" />
                    <span>Ít nhất 1 món ăn, 1 đồ chơi, 1 phụ kiện/vệ sinh</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-grass-600 shrink-0" />
                    <span>Dành cho chó nhỏ, chó lớn hoặc mèo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-grass-600 shrink-0" />
                    <span>Miễn phí đổi món nếu lỗi thuộc về shop</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-surface-border">
                <Link
                  href="/boxes"
                  className="block w-full py-3 rounded-box text-center text-sm font-bold bg-pine-900 hover:bg-pine-800 text-white transition-colors"
                >
                  Xem chi tiết Box Tiêu Chuẩn
                </Link>
              </div>
            </div>

            {/* Box Premium */}
            <div className="bg-surface-card text-bark-900 rounded-container p-6 sm:p-8 flex flex-col justify-between border-2 border-pine-900 shadow-xl relative">
              <div className="absolute -top-3 right-6 bg-pine-900 text-white text-[11px] font-bold px-3 py-0.5 rounded-tag">
                Trải nghiệm đặc biệt
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-pine-950">Box Premium</h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-tag bg-pine-50 text-pine-900 border border-pine-200">
                    Gấp đôi niềm vui
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-pine-950 font-display">{formatVND(premiumBoxPrice)}</span>
                  <span className="text-xs text-bark-500">/ hộp</span>
                </div>
                <p className="text-xs text-grass-700 font-semibold">
                  Giá trị hàng bên trong tối thiểu {formatVND(premiumMinValue)}
                </p>
                <ul className="space-y-2.5 text-sm text-bark-700 pt-2 border-t border-surface-border">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-pine-700 shrink-0" />
                    <span><strong>6–7 món</strong> cao cấp nhập khẩu</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-pine-700 shrink-0" />
                    <span>Đồ chơi trí tuệ IQ + Đồ ăn sấy thăng hoa thượng hạng</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-pine-700 shrink-0" />
                    <span>Miễn phí đổi món nếu lỗi thuộc về shop</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-surface-border">
                <Link
                  href="/boxes"
                  className="block w-full py-3 rounded-box text-center text-sm font-bold bg-pine-900 hover:bg-pine-800 text-white transition-colors"
                >
                  Xem chi tiết Box Premium
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. BẢNG GÓI ĐỊNH KỲ 1 / 3 / 6 HỘP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
            Bảng giá các gói định kỳ
          </h2>
          <p className="text-sm sm:text-base text-bark-600">
            Trả trước theo gói để nhận mức chiết khấu tốt nhất. Chúng tôi chủ động gửi thông báo nhắc gia hạn trước khi hết gói.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isBest = plan.cycle_count === 3;
            const prepaid = Math.round(standardBoxPrice * (1 - plan.discount_percentage / 100)) * plan.cycle_count;
            return (
              <div
                key={plan.id}
                className={`p-6 sm:p-7 rounded-container bg-surface-card border flex flex-col justify-between ${
                  isBest ? "border-pine-900 ring-2 ring-pine-900/10 shadow-md" : "border-surface-border"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-pine-950">{plan.name}</h3>
                    {plan.badge && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-tag bg-honey-100 text-honey-700">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-bark-600 min-h-[36px]">{plan.description}</p>

                  <div className="pt-3 border-t border-surface-border space-y-1">
                    <div className="text-xs text-bark-500">Giá trả trước (Box Tiêu chuẩn):</div>
                    <div className="text-2xl font-extrabold text-pine-950 font-display">{formatVND(prepaid)}</div>
                    <div className="text-xs text-grass-700 font-medium">
                      {plan.discount_percentage > 0 ? `Tiết kiệm ${plan.discount_percentage}% mỗi hộp` : "Giá niêm yết chuẩn"}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-bark-700 pt-3 border-t border-surface-border">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-grass-600 shrink-0" />
                      <span>{plan.cycle_count === 1 ? "Nhận 1 hộp, không cam kết dài hạn" : `Nhận 1 hộp mỗi tháng (${plan.cycle_count} tháng)`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-grass-600 shrink-0" />
                      <span>{plan.free_shipping ? "Freeship toàn bộ các kỳ giao" : "Phí ship tiêu chuẩn theo tỉnh"}</span>
                    </div>
                    {plan.birthday_gift && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-honey-600 shrink-0" />
                        <span className="font-semibold text-honey-700">Tặng thêm quà sinh nhật bé cưng</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-surface-border">
                  <Link
                    href="/subscription"
                    className={`block w-full py-2.5 rounded-box text-center text-xs font-bold transition-colors ${
                      isBest
                        ? "bg-pine-900 hover:bg-pine-800 text-white"
                        : "bg-surface-muted hover:bg-surface-border text-pine-950"
                    }`}
                  >
                    Chọn đăng ký {plan.name}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. FEEDBACK KHÁCH HÀNG: chỉ hiển thị review thật đã xuất bản, ẩn cả mục nếu chưa có */}
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

      {/* 6. CTA CUỐI TRANG: Banner Pet Quiz cảm xúc có ảnh cưng */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-container bg-pine-900 text-white overflow-hidden shadow-lg grid grid-cols-1 md:grid-cols-12 items-center">
          <div className="p-8 sm:p-12 md:col-span-7 space-y-5 text-left">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display leading-tight">
              Sẵn sàng mang đến niềm vui mở hộp cho bé yêu?
            </h2>
            <p className="text-sm sm:text-base text-pine-200 leading-relaxed">
              Chỉ mất 2 phút trả lời quiz để hệ thống gợi ý chiếc hộp hoàn hảo, loại trừ 100% món dị ứng và chọn đúng kích cỡ đồ chơi cho bé cưng.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/quiz"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-box bg-white hover:bg-pine-50 text-pine-950 font-bold text-sm shadow-md transition-colors"
              >
                <span>Bắt đầu làm Pet Quiz ngay</span>
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-box bg-pine-800 hover:bg-pine-750 text-pine-100 font-bold text-sm transition-colors border border-pine-700/60"
              >
                <span>Ghé xem đồ ăn & đồ chơi bán lẻ</span>
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
