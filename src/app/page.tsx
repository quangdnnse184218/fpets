"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Star, Truck, RefreshCw, CreditCard, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchBoxTypes, fetchProducts, fetchSubscriptionPlans } from "@/lib/catalog";
import { formatVND, formatDate } from "@/lib/formatters";
import { createClient } from "@/lib/supabase/client";
import ProductItemImage from "@/components/common/ProductItemImage";
import { EXCHANGE_POLICY, PREMIUM_ITEMS, QUIZ_LENGTH, QUIZ_NAME, STANDARD_ITEMS } from "@/lib/copy";
import { BoxType, Product } from "@/types/models";
import { ButtonLink } from "@/components/ui/Button";
import { SHIPPING_POLICY } from "@/lib/shipping";

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
    a: "Có. Bạn đăng nhập để thêm hàng vào giỏ và theo dõi đơn. Mystery Box còn cần hồ sơ thú cưng để FPETS chọn đúng món cho bé.",
  },
];

// Lối vào nhanh theo loại bé: dẫn thẳng tới bộ lọc "Dành cho" của trang Mystery Box
const AUDIENCE_CARDS = [
  { key: "dog-small", title: "Chó dưới 10 kg", note: "Đồ chơi vừa miệng, bánh thưởng nhỏ", href: "/boxes?species=dog&size=small", match: (b: BoxType) => b.species === "dog" && b.size === "small" },
  { key: "dog-large", title: "Chó từ 10 kg", note: "Đồ chơi cỡ lớn, chịu lực gặm", href: "/boxes?species=dog&size=large", match: (b: BoxType) => b.species === "dog" && b.size === "large" },
  { key: "cat", title: "Mèo", note: "Pate, bánh thưởng và đồ chơi cho mèo", href: "/boxes?species=cat", match: (b: BoxType) => b.species === "cat" },
];

// Chỉ khoe số liệu khi đủ lớn để tạo niềm tin; "1 đánh giá" phản tác dụng
const MIN_REVIEWS_TO_SHOW = 5;
const MIN_DELIVERED_TO_SHOW = 20;

export default function HomePage() {
  const [standardBoxPrice, setStandardBoxPrice] = useState(299000);
  const [standardMinValue, setStandardMinValue] = useState(380000);
  const [premiumBoxPrice, setPremiumBoxPrice] = useState(499000);
  const [premiumMinValue, setPremiumMinValue] = useState(650000);
  const [boxes, setBoxes] = useState<BoxType[]>([]);
  const [plans, setPlans] = useState<{ id: string; name: string; cycle_count: number; discount_percentage: number; free_shipping: boolean; birthday_gift: boolean }[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [stats, setStats] = useState({ delivered: 0, avgRating: 0, reviewCount: 0 });
  const [topReviews, setTopReviews] = useState<{ id: string; rating: number; comment: string | null; created_at: string; profiles: { full_name: string | null } | null }[]>([]);

  useEffect(() => {
    fetchBoxTypes().then((boxes) => {
      setBoxes(boxes);
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
    <div className="space-y-10 sm:space-y-16 pb-12 sm:pb-20">
      {/* 1. HERO: chữ bên trái, ảnh hộp bên phải; không icon trang trí bay lơ lửng */}
      <section className="bg-gradient-to-b from-[#F6F4EE] to-[#FAF9F6] border-b border-surface-border/80 pt-5 pb-8 sm:pt-10 sm:pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            <h1 className="text-2xl sm:text-4xl lg:text-[50px] font-extrabold text-pine-950 font-display tracking-tight leading-tight sm:leading-[1.14]">
              Hộp quà bất ngờ mỗi tháng <br className="hidden sm:block" />
              cho bé cưng của bạn
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-bark-700 leading-relaxed max-w-xl">
              Mystery Box gồm đồ ăn, đồ chơi và phụ kiện, được FPETS chọn riêng theo cân nặng, độ tuổi, dị ứng và sở thích của cún hoặc mèo nhà bạn. Mua thử 1 hộp hoặc đăng ký nhận hằng tháng.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
              <ButtonLink href="/quiz" size="lg">Làm {QUIZ_NAME} tìm hộp cho bé</ButtonLink>
              <ButtonLink href="/boxes" size="lg" variant="secondary">Xem các loại hộp</ButtonLink>
            </div>

            <p className="text-xs sm:text-sm text-bark-600">
              Box Tiêu chuẩn từ <strong className="text-pine-950">{formatVND(standardBoxPrice)}</strong>, Box Premium từ{" "}
              <strong className="text-pine-950">{formatVND(premiumBoxPrice)}</strong> mỗi hộp.
            </p>

            {/* Số liệu lấy thật từ database; chỉ hiện khi đã có dữ liệu để tránh khoe số 0 */}
            {(stats.delivered >= MIN_DELIVERED_TO_SHOW || stats.reviewCount >= MIN_REVIEWS_TO_SHOW) && (
              <div className="pt-3 sm:pt-4 border-t border-surface-border/70 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-bark-600">
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
            {/* Ảnh hộp tạm; thay bằng ảnh chụp hộp thật khi có */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-surface-border bg-surface-muted shadow-sm">
              <Image
                src="/images/hero/fpets-box-open.jpg"
                alt="Hộp FPETS đang mở với gói snack, bóng cao su, dây thừng và thiệp gửi bé"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. CHỌN HỘP THEO BÉ: vào thẳng bộ lọc của trang Mystery Box */}
      <section aria-labelledby="audience-heading" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-0.5 sm:space-y-1">
            <h2 id="audience-heading" className="text-xl sm:text-3xl font-extrabold text-pine-950 font-display">Chọn hộp cho bé nhà bạn</h2>
            <p className="text-xs sm:text-sm text-bark-600">Mỗi nhóm có Box Tiêu chuẩn và Box Premium.</p>
          </div>
          <Link href="/boxes" className="text-xs sm:text-sm font-bold text-pine-900 hover:underline shrink-0">Tất cả hộp</Link>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
          {AUDIENCE_CARDS.map((card) => {
            const group = boxes.filter(card.match);
            const image = group.find((b) => !b.slug.includes("premium"))?.imageUrl || group[0]?.imageUrl;
            const from = group.length ? Math.min(...group.map((b) => b.basePrice)) : null;
            return (
              <li key={card.key}>
                <Link
                  href={card.href}
                  className="group flex sm:flex-col h-full rounded-container bg-surface-card border border-surface-border overflow-hidden hover:border-pine-800 transition-colors"
                >
                  <div className="relative w-28 shrink-0 sm:w-auto sm:aspect-[16/10] bg-surface-muted">
                    {image && <Image src={image} alt="" fill sizes="(max-width: 640px) 112px, 33vw" className="object-cover" />}
                  </div>
                  <div className="p-3 sm:p-4 flex-1 flex flex-col gap-1">
                    <h3 className="text-sm sm:text-base font-bold text-pine-950">{card.title}</h3>
                    <p className="text-xs text-bark-600">{card.note}</p>
                    <p className="mt-auto pt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-bark-600">{from !== null ? <>Từ <strong className="text-pine-950">{formatVND(from)}</strong>/hộp</> : ""}</span>
                      <span className="inline-flex items-center gap-1 font-bold text-pine-900">
                        Xem hộp <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 2. CÁCH HOẠT ĐỘNG: 3 bước trực quan (Hiểu ngay trong 5 giây) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10 space-y-1.5">
          <h2 className="text-xl sm:text-3xl font-extrabold text-pine-950 font-display">
            Cách Mystery Box hoạt động
          </h2>
          <p className="text-xs sm:text-sm text-bark-600">
            Không đóng sẵn hàng loạt: mỗi hộp được chọn sát ngày giao, dựa trên hồ sơ của bé.
          </p>
        </div>

        {/* Điện thoại: số bước bên trái, chữ bên phải cho gọn; từ md xếp 3 cột */}
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
          {[
            { title: "Tạo hồ sơ thú cưng", text: `Trả lời ${QUIZ_NAME} (${QUIZ_LENGTH}): loài, cân nặng, độ tuổi, sở thích và thành phần bé bị dị ứng.` },
            { title: "FPETS chọn món theo hồ sơ", text: `Sát ngày giao, FPETS chọn ${STANDARD_ITEMS} (Box Premium ${PREMIUM_ITEMS}), loại món chứa thành phần bé bị dị ứng và ưu tiên món bé chưa nhận.` },
            { title: "Nhận hộp và chấm điểm món", text: "Mở hộp cùng bé, chấm từng món \u201cthích / bình thường / không thích\u201d để hộp sau hợp khẩu vị hơn." },
          ].map((step, i) => (
            <li key={step.title} className="p-4 sm:p-6 rounded-container bg-surface-card border border-surface-border flex items-start md:flex-col gap-3">
              <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-box bg-pine-900 text-white flex items-center justify-center font-bold text-sm sm:text-base font-display shrink-0">
                {i + 1}
              </span>
              <div className="space-y-1 sm:space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-pine-950">{step.title}</h3>
                <p className="text-xs sm:text-sm text-bark-600 leading-relaxed">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 3. BẢNG GIÁ: 2 loại box + tóm tắt gói định kỳ (chi tiết ở /subscription) */}
      <section className="bg-pine-900 text-pine-100 py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 space-y-1.5">
            <h2 className="text-xl sm:text-3xl font-extrabold text-white font-display text-balance">
              Hai loại Mystery Box
            </h2>
            <p className="text-xs sm:text-sm text-pine-200 text-balance">
              Mua thử 1 hộp để xem bé có thích không, hoặc đăng ký gói định kỳ để được giảm giá.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 max-w-4xl mx-auto">
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
                bullets: ["Như Tiêu chuẩn, thêm đồ chơi giấu thức ăn và món chăm sóc dùng hằng ngày", "Có phiên bản cho chó nhỏ, chó lớn và mèo"],
              },
            ].map((box) => (
              <div
                key={box.name}
                className={`relative bg-surface-card text-bark-900 rounded-container p-5 sm:p-7 flex flex-col justify-between shadow-xs ${
                  box.highlight ? "border-2 border-amber-400" : "border border-surface-border"
                }`}
              >
                <div className="space-y-3.5">
                  <h3 className="text-lg sm:text-xl font-bold text-pine-950">{box.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold font-display text-pine-950">{formatVND(box.price)}</span>
                    <span className="text-xs text-bark-500">/ hộp</span>
                  </div>
                  <p className="text-xs font-semibold text-bark-600">Trị giá sản phẩm tối thiểu {formatVND(box.minValue)}</p>
                  <ul className="space-y-2 text-xs sm:text-sm pt-2 border-t text-bark-700 border-surface-border">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 mt-0.5 text-grass-600" />
                      <span><strong>{box.items}</strong> chọn theo hồ sơ thú cưng</span>
                    </li>
                    {box.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 mt-0.5 text-grass-600" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-4 mt-5 sm:pt-6 sm:mt-6 border-t border-surface-border">
                  <Link
                    href={box.highlight ? "/boxes?tier=premium" : "/boxes?tier=standard"}
                    className="block w-full py-2.5 sm:py-3 rounded-box text-center text-xs sm:text-sm font-bold bg-pine-900 hover:bg-pine-800 text-white transition-colors"
                  >
                    Xem {box.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Tóm tắt gói định kỳ, áp dụng cho cả 2 loại box */}
          {plans.length > 0 && (
            <div className="max-w-4xl mx-auto mt-6 sm:mt-8 p-4 sm:p-5 rounded-container bg-pine-950/50 border border-pine-800 flex flex-col md:flex-row md:items-center gap-3.5 sm:gap-4 justify-between">
              <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs">
                {plans.map((plan) => (
                  <span key={plan.id} className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-tag bg-pine-800 text-pine-100 text-[11px] sm:text-xs">
                    <strong className="text-white">{plan.name}</strong>
                    {plan.discount_percentage > 0 ? ` · giảm ${plan.discount_percentage}%` : " · giá gốc"}
                    {plan.free_shipping ? " · miễn phí giao hàng" : ""}
                    {plan.birthday_gift ? " · quà sinh nhật" : ""}
                  </span>
                ))}
              </div>
              <Link href="/subscription" className="shrink-0 text-center min-h-10 sm:min-h-11 inline-flex items-center justify-center px-4 sm:px-5 rounded-box bg-white hover:bg-pine-50 text-pine-950 text-xs font-bold transition-colors">
                Xem gói định kỳ
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 4. DẢI CAM KẾT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { icon: Truck, title: "Giao toàn quốc", text: SHIPPING_POLICY },
            { icon: RefreshCw, title: "Đổi trả trong 3–7 ngày", text: "Mystery Box báo lỗi trong 3 ngày (món dị ứng đã khai, hàng hỏng, giao thiếu); hàng lẻ còn nguyên seal đổi trong 7 ngày.", href: "/return-policy" },
            { icon: CreditCard, title: "MoMo, VNPay hoặc COD", text: "COD cho đơn mua 1 lần dưới 2.000.000₫. Gói định kỳ trả trước, không tự động trừ tiền." },
          ].map(({ icon: Icon, title, text, href }) => (
            <div key={title} className="p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border flex gap-3 items-start">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-box bg-pine-50 text-pine-900 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <h3 className="text-xs sm:text-sm font-bold text-pine-950">{title}</h3>
                <p className="text-[11px] sm:text-xs text-bark-600 leading-relaxed">{text}</p>
                {href && <Link href={href} className="inline-block text-[11px] sm:text-xs font-bold text-pine-900 hover:underline">Xem chính sách đổi trả</Link>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. SẢN PHẨM NỔI BẬT TỪ SHOP */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-0.5 sm:space-y-1">
              <h2 className="text-xl sm:text-3xl font-extrabold text-pine-950 font-display">Mua lẻ tại Shop</h2>
              <p className="text-xs sm:text-sm text-bark-600">Đồ ăn, đồ chơi và phụ kiện chọn lọc cho chó mèo.</p>
            </div>
            <Link href="/shop" className="text-xs sm:text-sm font-bold text-pine-900 hover:underline shrink-0">Xem tất cả</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {featured.map((p) => (
              <Link key={p.id} href={`/shop/${p.slug}`} className="rounded-container bg-surface-card border border-surface-border overflow-hidden hover:border-pine-800 transition-colors group">
                <div className="relative w-full aspect-square bg-surface-muted">
                  <ProductItemImage src={p.image} alt={p.name} category={p.category} placeholderColor={p.placeholderColor} sizes="(max-width: 768px) 50vw, 25vw" showNote={false} />
                </div>
                <div className="p-2.5 sm:p-3 space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-pine-950 line-clamp-2 leading-snug min-h-[2.5em]">{p.name}</h3>
                  <div className="text-xs sm:text-sm font-extrabold text-pine-950">{formatVND(p.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 6. FEEDBACK KHÁCH HÀNG: chỉ hiển thị review thật đã xuất bản, ẩn cả mục nếu chưa có */}
      {topReviews.length >= 3 && (
        <section className="bg-surface-muted border-y border-surface-border py-10 sm:py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10 space-y-1.5">
              <h2 className="text-xl sm:text-3xl font-extrabold text-pine-950 font-display">
                Niềm vui unbox của các bé
              </h2>
              <p className="text-xs sm:text-sm text-bark-600">
                Đánh giá từ khách hàng đã nhận hàng từ FPETS.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {topReviews.map((rev) => (
                <div key={rev.id} className="p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border space-y-2.5 sm:space-y-3">
                  <div className="flex items-center gap-1 text-honey-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${i < rev.rating ? "fill-honey-500" : "fill-bark-200 text-bark-200"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-bark-700 leading-relaxed line-clamp-5">&ldquo;{rev.comment}&rdquo;</p>
                  <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs">
                    <span className="font-bold text-pine-950">{rev.profiles?.full_name || "Khách hàng FPETS"}</span>
                    <span className="text-[10px] sm:text-[11px] text-bark-500">{formatDate(rev.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-6 sm:mt-8">
              <Link href="/reviews" className="text-xs sm:text-sm font-bold text-pine-900 hover:underline">
                Xem tất cả đánh giá
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 7. FAQ NGẮN */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-5">
        <h2 className="text-xl sm:text-3xl font-extrabold text-pine-950 font-display text-center">Câu hỏi thường gặp</h2>
        <div className="rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border">
          {HOME_FAQ.map((item) => (
            <details key={item.q} className="group p-3.5 sm:p-5">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-xs sm:text-sm font-bold text-pine-950">
                <span>{item.q}</span>
                <ChevronDown className="w-4 h-4 text-bark-500 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-xs sm:text-sm text-bark-600 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="text-center">
          <Link href="/faq" className="text-xs sm:text-sm font-bold text-pine-900 hover:underline">Xem thêm câu hỏi</Link>
        </div>
      </section>
    </div>
  );
}
