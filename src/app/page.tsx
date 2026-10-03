"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star, Truck, RefreshCw, CreditCard, ChevronDown } from "lucide-react";
import { fetchBoxTypes, fetchProducts } from "@/lib/catalog";
import { formatVND, formatDate } from "@/lib/formatters";
import { createClient } from "@/lib/supabase/client";
import ProductItemImage from "@/components/common/ProductItemImage";
import { DISLIKE_POLICY, NO_AUTO_CHARGE, PREMIUM_ITEMS, QUIZ_LENGTH, QUIZ_NAME, STANDARD_ITEMS } from "@/lib/copy";
import { BoxType, Product } from "@/types/models";
import { ButtonLink } from "@/components/ui/Button";
import { SHIPPING_SUMMARY } from "@/lib/shipping";
import { capitalize, discountSentence, freeShippingPlans, savingsSentence } from "@/lib/planCopy";
import { usePlans } from "@/lib/usePlans";

// Lối vào nhanh theo loại bé: dẫn thẳng tới bộ lọc "Dành cho" của trang Mystery Box
const AUDIENCE_CARDS = [
  { key: "dog-small", title: "Chó nhỏ", sub: "dưới 10 kg", note: "Đồ chơi vừa miệng, bánh thưởng nhỏ", href: "/boxes?species=dog&size=small", match: (b: BoxType) => b.species === "dog" && b.size === "small" },
  { key: "dog-large", title: "Chó lớn", sub: "từ 10 kg", note: "Đồ chơi cỡ lớn, chịu lực gặm", href: "/boxes?species=dog&size=large", match: (b: BoxType) => b.species === "dog" && b.size === "large" },
  { key: "cat", title: "Mèo", sub: "mọi cân nặng", note: "Pate, bánh thưởng và đồ chơi cho mèo", href: "/boxes?species=cat", match: (b: BoxType) => b.species === "cat" },
];

const HOW_IT_WORKS = [
  { title: "Kể cho FPETS về bé", text: `Trả lời ${QUIZ_NAME} (${QUIZ_LENGTH}): loài, cân nặng, độ tuổi, sở thích và thành phần bé bị dị ứng.` },
  { title: "FPETS chọn món riêng cho bé", text: "Sát ngày giao, FPETS mới chọn món. Ví dụ bé 8 kg dị ứng gà sẽ không nhận món có gà, đồ chơi đúng cỡ chó nhỏ, và ưu tiên món bé chưa nhận." },
  { title: "Nhận hộp và chấm điểm món", text: "Mở hộp cùng bé, chấm từng món “thích / bình thường / không thích” để hộp sau hợp khẩu vị hơn." },
];

const HOME_FAQ = [
  {
    q: "Trong hộp có những gì?",
    a: `Box Tiêu chuẩn có ${STANDARD_ITEMS}, Box Premium có ${PREMIUM_ITEMS}. Hộp nào cũng có ít nhất 1 món ăn, 1 đồ chơi và 1 món chăm sóc hoặc phụ kiện.`,
  },
  { q: "Bé không thích món trong hộp thì sao?", a: DISLIKE_POLICY },
  {
    q: "Gói định kỳ có tự trừ tiền không?",
    a: `Không. ${NO_AUTO_CHARGE} Khi còn hộp cuối, FPETS nhắc bạn gia hạn; không gia hạn thì gói tự kết thúc.`,
  },
  {
    q: "Có cần tài khoản để mua không?",
    a: "Có. Bạn đăng nhập để thêm hàng vào giỏ và theo dõi đơn. Mystery Box còn cần hồ sơ thú cưng để FPETS chọn đúng món cho bé.",
  },
];

// Chỉ khoe số liệu khi đủ lớn để tạo niềm tin; "1 đánh giá" phản tác dụng
const MIN_REVIEWS_TO_SHOW = 5;
const MIN_DELIVERED_TO_SHOW = 20;

const isPremium = (b: BoxType) => b.slug.includes("premium");
const container = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";
const sectionTitle = "text-xl sm:text-3xl font-extrabold text-pine-950 font-display leading-snug";

export default function HomePage() {
  const plans = usePlans();
  const [boxes, setBoxes] = useState<BoxType[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [stats, setStats] = useState({ delivered: 0, avgRating: 0, reviewCount: 0 });
  const [topReviews, setTopReviews] = useState<{ id: string; rating: number; comment: string | null; created_at: string; profiles: { full_name: string | null } | null }[]>([]);

  useEffect(() => {
    fetchBoxTypes().then(setBoxes);
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

  // Giá và trị giá tối thiểu của 2 phân hạng lấy từ bảng box_types (giá trị gốc theo SPEC trong lúc chờ tải)
  const tierOf = (premium: boolean, fallbackPrice: number, fallbackValue: number) => {
    const group = boxes.filter((b) => isPremium(b) === premium);
    return {
      price: group.length ? Math.min(...group.map((b) => b.basePrice)) : fallbackPrice,
      minValue: group.length ? Math.min(...group.map((b) => b.minRetailValue)) : fallbackValue,
    };
  };
  const standard = tierOf(false, 299000, 380000);
  const premium = tierOf(true, 499000, 650000);

  return (
    <div className="space-y-12 sm:space-y-16 pb-12 sm:pb-20">
      {/* 1. HERO: một khối nổi (thẻ bo góc lớn, bóng mềm), tách khỏi header và phần bên dưới */}
      <section className={`${container} pt-4 sm:pt-6`}>
        <div className="rounded-3xl bg-surface-card border border-surface-border/70 shadow-[0_24px_64px_-28px_rgba(23,52,44,0.3)] p-5 sm:p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            <h1 className="text-[26px] sm:text-[36px] lg:text-[46px] font-extrabold text-pine-950 font-display tracking-tight leading-[1.25]">
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

            <p className="text-sm text-bark-700">
              Box Tiêu chuẩn từ <strong className="text-pine-950">{formatVND(standard.price)}</strong>, Box Premium từ{" "}
              <strong className="text-pine-950">{formatVND(premium.price)}</strong> mỗi hộp.
            </p>

            {/* Số liệu lấy thật từ database; chỉ hiện khi đã có dữ liệu để tránh khoe số 0 */}
            {(stats.delivered >= MIN_DELIVERED_TO_SHOW || stats.reviewCount >= MIN_REVIEWS_TO_SHOW) && (
              <div className="pt-3 sm:pt-4 border-t border-surface-border/70 flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-bark-700">
                {stats.delivered >= MIN_DELIVERED_TO_SHOW && (
                  <div>
                    <span className="font-extrabold text-pine-950 block leading-tight">{stats.delivered.toLocaleString("vi-VN")}</span>
                    <span className="text-xs text-bark-600">Đơn hàng đã giao</span>
                  </div>
                )}
                {stats.delivered >= MIN_DELIVERED_TO_SHOW && stats.reviewCount >= MIN_REVIEWS_TO_SHOW && <div className="hidden sm:block w-px h-7 bg-surface-border" />}
                {stats.reviewCount >= MIN_REVIEWS_TO_SHOW && (
                  <div>
                    <div className="flex items-center gap-1 font-extrabold text-pine-950 leading-tight">
                      <Star className="w-3.5 h-3.5 text-honey-500 fill-honey-500" />
                      <span>{stats.avgRating.toFixed(1)} / 5</span>
                    </div>
                    <span className="text-xs text-bark-600">Từ {stats.reviewCount} đánh giá</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            {/* Ảnh hộp tạm; thay bằng ảnh chụp hộp thật khi có */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-surface-muted">
              <Image
                src="/images/hero/fpets-box-open.jpg"
                alt="Hộp FPETS đang mở với gói snack, bóng cao su, dây thừng và thiệp gửi bé"
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. CÁCH HOẠT ĐỘNG */}
      <section aria-labelledby="how-heading" className={`${container} space-y-5 sm:space-y-8`}>
        <div className="space-y-1.5 max-w-2xl">
          <h2 id="how-heading" className={sectionTitle}>Cách Mystery Box hoạt động</h2>
          <p className="text-sm text-bark-700">Không đóng sẵn hàng loạt: mỗi hộp được chọn món sát ngày giao, cho đúng một bé.</p>
        </div>

        {/* Điện thoại: số bước bên trái, chữ bên phải cho gọn; từ md xếp 3 cột */}
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title} className="p-4 sm:p-6 rounded-container bg-surface-card border border-surface-border flex items-start md:flex-col gap-3">
              <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-box bg-pine-900 text-white flex items-center justify-center font-bold text-sm sm:text-base font-display shrink-0">
                {i + 1}
              </span>
              <div className="space-y-1 sm:space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-pine-950">{step.title}</h3>
                <p className="text-sm text-bark-700 leading-relaxed">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 3. CHỌN HỘP: theo loại bé, kèm tóm tắt 2 phân hạng và mức tiết kiệm của gói (chi tiết ở /boxes và /subscription) */}
      <section aria-labelledby="audience-heading" className={`${container} space-y-4 sm:space-y-6`}>
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h2 id="audience-heading" className={sectionTitle}>Chọn hộp cho bé nhà bạn</h2>
            <p className="text-sm text-bark-700">Mỗi nhóm có Box Tiêu chuẩn và Box Premium.</p>
          </div>
          <Link href="/boxes" className="text-sm font-bold text-pine-900 hover:underline shrink-0">Tất cả hộp</Link>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
          {AUDIENCE_CARDS.map((card) => {
            const group = boxes.filter(card.match);
            const image = group.find((b) => !isPremium(b))?.imageUrl || group[0]?.imageUrl;
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
                    <h3 className="text-base font-bold text-pine-950">
                      {card.title} <span className="font-medium text-bark-600">{card.sub}</span>
                    </h3>
                    <p className="text-sm text-bark-700">{card.note}</p>
                    <p className="mt-auto pt-2 flex items-center justify-between gap-2 text-sm">
                      <span className="text-bark-700">{from !== null ? <>Từ <strong className="text-pine-950">{formatVND(from)}</strong>/hộp</> : ""}</span>
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

        <div className="rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border overflow-hidden">
          {[
            { name: "Box Tiêu chuẩn", items: STANDARD_ITEMS, ...standard, href: "/boxes?tier=standard" },
            { name: "Box Premium", items: PREMIUM_ITEMS, ...premium, href: "/boxes?tier=premium" },
          ].map((tier) => (
            <Link key={tier.name} href={tier.href} className="group flex flex-wrap items-center gap-x-5 gap-y-1 px-4 sm:px-5 py-3.5 hover:bg-surface-muted/50 transition-colors">
              <span className="text-base font-bold text-pine-950 sm:w-36">{tier.name}</span>
              <span className="text-base font-extrabold text-pine-950 font-display tabular-nums">
                {formatVND(tier.price)}
                <span className="text-sm font-medium text-bark-600"> / hộp</span>
              </span>
              <span className="text-sm text-bark-700 basis-full sm:basis-0 sm:flex-1">{tier.items}, trị giá sản phẩm từ {formatVND(tier.minValue)}</span>
              <ArrowRight className="hidden sm:block w-4 h-4 text-pine-900 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </Link>
          ))}
          {/* Mức giảm của gói: số liệu từ bảng subscription_plans, tiền tiết kiệm tính trên giá Box Tiêu chuẩn */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 bg-honey-100/60">
            <p className="text-sm text-bark-800 leading-relaxed">
              <strong className="text-pine-950">Đăng ký gói định kỳ:</strong> {discountSentence(plans)}, {freeShippingPlans(plans)} được miễn phí giao hàng.{" "}
              {capitalize(savingsSentence(plans, standard.price))} so với mua lẻ từng hộp Tiêu chuẩn.
            </p>
            <ButtonLink href="/subscription" variant="secondary" className="shrink-0">Xem gói định kỳ</ButtonLink>
          </div>
        </div>
      </section>

      {/* 4. DẢI CAM KẾT: giao hàng, đổi trả, thanh toán */}
      <section aria-label="Giao hàng, đổi trả và thanh toán" className={container}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {[
            { icon: Truck, title: "Giao toàn quốc", text: SHIPPING_SUMMARY },
            { icon: RefreshCw, title: "Đổi trả trong 3–7 ngày", text: "Mystery Box báo lỗi trong 3 ngày (món dị ứng đã khai, hàng hỏng, giao thiếu); hàng lẻ còn nguyên seal đổi trong 7 ngày.", href: "/return-policy" },
            { icon: CreditCard, title: "MoMo, VNPay hoặc COD", text: "COD cho đơn mua 1 lần dưới 2.000.000₫. Gói định kỳ trả trước, không tự động trừ tiền." },
          ].map(({ icon: Icon, title, text, href }) => (
            <div key={title} className="p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border flex gap-3 items-start">
              <div className="w-10 h-10 rounded-box bg-honey-100 text-honey-700 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-pine-950">{title}</h3>
                <p className="text-sm text-bark-700 leading-relaxed">{text}</p>
                {href && <Link href={href} className="inline-block text-sm font-bold text-pine-900 hover:underline">Xem chính sách đổi trả</Link>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. ĐÁNH GIÁ: chỉ hiển thị review thật đã xuất bản, ẩn cả mục nếu chưa đủ */}
      {topReviews.length >= 3 && (
        <section aria-labelledby="reviews-heading" className="bg-surface-muted border-y border-surface-border py-10 sm:py-14">
          <div className={`${container} space-y-6 sm:space-y-8`}>
            <div className="flex items-end justify-between gap-4">
              <h2 id="reviews-heading" className={sectionTitle}>Khách đã nhận hộp nói gì</h2>
              <Link href="/reviews" className="text-sm font-bold text-pine-900 hover:underline shrink-0">Tất cả đánh giá</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {topReviews.map((rev) => (
                <div key={rev.id} className="p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border space-y-3">
                  <div className="flex items-center gap-1 text-honey-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < rev.rating ? "fill-honey-500" : "fill-bark-200 text-bark-200"}`} />
                    ))}
                  </div>
                  <p className="text-sm text-bark-700 leading-relaxed line-clamp-5">&ldquo;{rev.comment}&rdquo;</p>
                  <div className="pt-2 border-t border-surface-border flex items-center justify-between text-sm">
                    <span className="font-bold text-pine-950">{rev.profiles?.full_name || "Khách hàng FPETS"}</span>
                    <span className="text-xs text-bark-600">{formatDate(rev.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. FAQ rút gọn */}
      <section aria-labelledby="faq-heading" className={`${container} space-y-4 sm:space-y-5`}>
        <div className="flex items-end justify-between gap-4 max-w-3xl">
          <h2 id="faq-heading" className={sectionTitle}>Câu hỏi thường gặp</h2>
          <Link href="/faq" className="text-sm font-bold text-pine-900 hover:underline shrink-0">Xem thêm câu hỏi</Link>
        </div>
        <div className="max-w-3xl rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border">
          {HOME_FAQ.map((item) => (
            <details key={item.q} className="group p-4 sm:p-5">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm sm:text-[15px] font-bold text-pine-950">
                <span>{item.q}</span>
                <ChevronDown className="w-4 h-4 text-bark-600 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-bark-700 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 7. MUA LẺ: phần phụ, đặt cuối để mạch chính của trang là Mystery Box */}
      {featured.length > 0 && (
        <section aria-labelledby="shop-heading" className={`${container} space-y-4 sm:space-y-6`}>
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h2 id="shop-heading" className={sectionTitle}>Mua lẻ tại cửa hàng</h2>
              <p className="text-sm text-bark-700">Đồ ăn, đồ chơi và phụ kiện cho chó mèo, mua từng món.</p>
            </div>
            <Link href="/shop" className="text-sm font-bold text-pine-900 hover:underline shrink-0">Xem tất cả</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {featured.map((p) => (
              <Link key={p.id} href={`/shop/${p.slug}`} className="rounded-container bg-surface-card border border-surface-border overflow-hidden hover:border-pine-800 transition-colors group">
                <div className="relative w-full aspect-square bg-surface-muted">
                  <ProductItemImage src={p.image} alt={p.name} category={p.category} placeholderColor={p.placeholderColor} sizes="(max-width: 768px) 50vw, 25vw" showNote={false} />
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="text-sm font-bold text-pine-950 line-clamp-2 leading-snug min-h-[2.5em]">{p.name}</h3>
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
