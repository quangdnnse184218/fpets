"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Minus } from "lucide-react";
import { formatDate, formatVND } from "@/lib/formatters";
import { fetchBoxTypes, fetchPlanOptions } from "@/lib/catalog";
import { QUIZ_NAME } from "@/lib/copy";
import { BUSINESS } from "@/config/business";
import { planUnitPrice } from "@/lib/pricing";
import { DEFAULT_PLANS, capitalize, discountSentence, freeShippingPlans } from "@/lib/planCopy";
import { DELIVERY_DAYS, SHIPPING_CONFIG } from "@/lib/shipping";
import { DeliverySchedule, SCHEDULE_LABEL, cutoffOf, deliveryWindowLabel, laterBoxWindows, recommendedSchedule } from "@/lib/deliverySchedule";
import { buttonClass } from "@/components/ui/Button";
import { SubscriptionPlan } from "@/types/models";

// Luồng thật của gói định kỳ (SPEC §5): hồ sơ bé → chọn hộp, gói, đợt giao → trả trước → nhận hộp mỗi tháng → gia hạn
const STEPS = [
  { title: "Tạo hồ sơ cho bé", text: `Làm ${QUIZ_NAME} hoặc nhập nhanh: loài, cân nặng, độ tuổi, dị ứng và sở thích.` },
  { title: "Chọn hộp, gói và đợt giao", text: "Box Tiêu chuẩn hoặc Premium; gói 1, 3 hoặc 6 hộp; giao đầu tháng hoặc giữa tháng." },
  { title: "Thanh toán một lần", text: "Trả trước toàn bộ gói qua MoMo hoặc VNPay. FPETS không lưu thẻ và không tự trừ tiền." },
  { title: "Nhận hộp đầu ngay, rồi mỗi tháng một hộp", text: "Hộp đầu gửi ngay sau khi thanh toán. Các hộp sau giao theo đợt bạn chọn; 7 ngày trước mỗi đợt, FPETS chốt hồ sơ của bé và chọn món, ưu tiên món bé chưa nhận ở các hộp trước." },
  { title: "Chấm món, gia hạn khi hết gói", text: "Chấm từng món thích hay không để hộp sau hợp hơn. Giao hết số hộp đã trả, FPETS nhắc bạn gia hạn." },
];

// Các thao tác khách tự làm trong Tài khoản → Gói định kỳ, đúng với quy tắc đang chạy trên hệ thống
const MANAGE = [
  {
    title: "Tạm dừng",
    when: "Trước ngày chốt của kỳ sắp giao",
    result: "Bỏ qua 1 hoặc 2 kỳ. Lịch giao lùi lại tương ứng, số hộp đã trả giữ nguyên. Hết thời gian tạm dừng gói tự chạy lại, hoặc bạn bấm Tiếp tục để nhận sớm hơn.",
  },
  {
    title: "Đổi đợt giao, địa chỉ",
    when: "Bất kỳ lúc nào",
    result: "Lưu trước ngày chốt thì áp dụng ngay cho hộp sắp giao; sau ngày chốt thì áp dụng từ kỳ sau.",
  },
  {
    title: "Gia hạn",
    when: "Từ khi còn hộp cuối, tới hạn gia hạn và thêm 5 ngày sau đó",
    result: "Hạn gia hạn là ngày chốt của hộp kế tiếp sau khi đã giao hết số hộp trả trước; FPETS nhắc trước 7, 3 và 1 ngày. Chọn lại gói, thanh toán là gói nối tiếp lịch cũ. Không gia hạn thì gói tự kết thúc, không phát sinh phí.",
  },
  {
    title: "Hủy gói",
    when: "Bất kỳ lúc nào",
    result: "Gói dừng nhắc gia hạn. Các hộp đã trả trước vẫn được giao đủ theo lịch; FPETS không hoàn tiền phần đã trả.",
  },
];

const FAQ = [
  {
    q: "Khi nào bé nhận hộp đầu tiên?",
    a: `Ngay sau khi bạn thanh toán: FPETS chọn món và gửi đi, thời gian giao ${DELIVERY_DAYS}. Từ hộp thứ 2, hộp giao theo đợt bạn chọn (đầu tháng hoặc giữa tháng), mỗi tháng một hộp.`,
  },
  {
    q: "Ngày chốt là gì?",
    a: "Áp dụng từ hộp thứ 2: là mốc 7 ngày trước đợt giao. Trước mốc này bạn tạm dừng gói, đổi địa chỉ hoặc cập nhật dị ứng, sở thích của bé; sau mốc này thay đổi áp dụng từ kỳ sau vì hộp đã được chuẩn bị.",
  },
  {
    q: "Gói định kỳ thanh toán bằng gì?",
    a: "MoMo hoặc VNPay, trả trước một lần cho cả gói. Mua thử 1 hộp lẻ thì có thể trả tiền khi nhận hàng (COD).",
  },
  {
    q: "Tôi đăng ký gói cho nhiều bé được không?",
    a: "Được. Mỗi bé có hồ sơ và gói riêng, để hộp đúng loài, cân nặng và dị ứng của từng bé.",
  },
];

const addMonths = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));

export default function SubscriptionIntroPage() {
  // Khách đã có hồ sơ bé thì chọn hộp luôn; chưa có thì làm Pet Quiz để tạo hồ sơ trước
  // Chọn gói thì sang xem các hộp với giá của gói đó. Hồ sơ bé chỉ cần khi đặt hộp, lúc đó khách tự chọn làm quiz hay nhập nhanh.
  const planHref = (cycles: number) => `/boxes?plan=${cycles}`;
  const [tier, setTier] = useState<"standard" | "premium">("standard");
  const [prices, setPrices] = useState<{ standard: number; premium: number } | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  // Câu chữ về mức giảm dùng cùng dữ liệu với các thẻ gói bên dưới
  const planLites = plans.length > 0 ? plans : DEFAULT_PLANS;
  const [schedule, setSchedule] = useState<DeliverySchedule>(() => recommendedSchedule());

  useEffect(() => {
    fetchBoxTypes().then((boxes) => {
      const min = (premium: boolean) => Math.min(...boxes.filter((b) => b.slug.includes("premium") === premium).map((b) => b.basePrice));
      if (boxes.length > 0) setPrices({ standard: min(false), premium: min(true) });
    });
    fetchPlanOptions().then(setPlans);
  }, []);

  const basePrice = prices ? prices[tier] : null;
  // Ví dụ gói 3 hộp đăng ký hôm nay: hộp 1 gửi ngay, hộp 2 và 3 theo đợt đã chọn; kỳ kế tiếp là kỳ cần gia hạn
  const laterBoxes = laterBoxWindows(schedule, 3);
  const renewalCutoff = cutoffOf(addMonths(laterBoxes[laterBoxes.length - 1], 1));

  return (
    <div className="pb-12 sm:pb-16">
      {/* Phần đầu trang: chữ và ảnh nằm cạnh nhau từ màn hình vừa trở lên */}
      <section className="bg-surface-card border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14 items-center">
          <div className="space-y-5">
            <h1 className="text-[30px] sm:text-[36px] lg:text-[44px] font-extrabold text-pine-950 font-display tracking-tight leading-[1.25]">
              Mỗi tháng một hộp quà chọn riêng cho bé
            </h1>
            <p className="text-base text-bark-700 leading-relaxed">
              Trả trước 1, 3 hoặc 6 hộp. Hộp đầu gửi ngay sau khi thanh toán, các hộp sau mỗi tháng một hộp vào đợt bạn chọn. {capitalize(discountSentence(planLites))}, {freeShippingPlans(planLites)} được miễn phí vận chuyển.
            </p>
            <ul className="space-y-2 text-sm text-bark-700">
              {["Không tự động trừ tiền, không lưu thẻ", "Tạm dừng 1–2 kỳ khi bé còn nhiều đồ", "Hủy bất kỳ lúc nào: hộp đã trả vẫn giao đủ, không hoàn tiền"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-grass-700 shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3 pt-1">
              <a href="#chon-goi" className={buttonClass("primary", "lg")}>
                Xem các gói <ArrowRight className="w-4 h-4" />
              </a>
              <Link href="/boxes" className={buttonClass("secondary", "lg")}>Xem các loại hộp</Link>
            </div>
          </div>
          {/* Ảnh hộp tạm; thay bằng ảnh chụp hộp thật khi có */}
          <div className="relative aspect-[4/3] rounded-container overflow-hidden border border-surface-border bg-surface-muted">
            <Image
              src="/images/hero/fpets-box-open.jpg"
              alt="Hộp FPETS đang mở với gói snack, bóng cao su, dây thừng và thiệp gửi bé"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 space-y-12 sm:space-y-16">
        {/* BẢNG GÓI */}
        <section id="chon-goi" className="space-y-6 scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Chọn gói</h2>
            <div role="group" aria-label="Loại hộp để tính giá" className="inline-flex p-1 rounded-box bg-surface-card border border-surface-border text-sm self-start">
              {(["standard", "premium"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tier === t}
                  onClick={() => setTier(t)}
                  className={`min-h-10 px-4 rounded-[10px] font-bold transition-colors ${tier === t ? "bg-pine-900 text-white" : "text-bark-600 hover:text-pine-950"}`}
                >
                  {t === "standard" ? "Box Tiêu chuẩn" : "Box Premium"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-stretch">
            {plans.length === 0 && [0, 1, 2].map((i) => <div key={i} className="h-80 rounded-container bg-surface-muted animate-pulse" />)}
            {plans.map((plan) => {
              // Gói được làm nổi: gói bán chạy nếu cửa hàng đã khai báo, chưa có số liệu thì là gói 3 hộp do FPETS gợi ý
              const recommended = plan.cycles === (BUSINESS.mostChosenPlanCycles ?? 3);
              const unit = basePrice !== null ? planUnitPrice(basePrice, plan.discountPercent) : null;
              const perks: [boolean, string][] = [
                [true, plan.cycles === 1 ? "Nhận 1 hộp" : `Mỗi tháng 1 hộp, trong ${plan.cycles} tháng`],
                [plan.freeShipping, plan.freeShipping ? "Miễn phí vận chuyển mọi hộp" : `Phí ship ${formatVND(SHIPPING_CONFIG.hcmFee)} – ${formatVND(SHIPPING_CONFIG.otherFee)}`],
                [true, "Tạm dừng hoặc đổi đợt giao trước ngày chốt"],
                [plan.birthdayGift, plan.birthdayGift ? "Quà sinh nhật cho bé" : "Không kèm quà sinh nhật"],
              ];
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-container p-5 sm:p-6 bg-surface-card border flex flex-col ${recommended ? "border-pine-900 shadow-md" : "border-surface-border"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-extrabold text-pine-950 font-display">{plan.name}</h3>
                    {recommended && (
                      <span className="text-xs font-bold uppercase tracking-[0.06em] text-pine-900">{BUSINESS.mostChosenPlanCycles ? "Được chọn nhiều nhất" : "FPETS gợi ý"}</span>
                    )}
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-pine-950 font-display">{unit !== null ? formatVND(unit) : "—"}</span>
                    <span className="text-sm text-bark-500"> / hộp</span>
                  </div>
                  <p className="mt-1 text-xs text-bark-600 min-h-[1.25rem]">
                    {plan.discountPercent > 0 && basePrice !== null ? (
                      <>
                        <span className="line-through">{formatVND(basePrice)}</span>
                        <span className="ml-1.5 font-bold text-grass-700">Giảm {plan.discountPercent}%</span>
                      </>
                    ) : (
                      "Giá gốc"
                    )}
                  </p>
                  <p className="mt-3 pt-3 border-t border-surface-border text-sm text-bark-700">
                    Trả trước <strong className="text-pine-950">{unit !== null ? formatVND(unit * plan.cycles) : "—"}</strong>
                    {plan.cycles > 1 ? ` cho ${plan.cycles} hộp` : ""}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm flex-1">
                    {perks.map(([on, text]) => (
                      <li key={text} className={`flex items-start gap-2 ${on ? "text-bark-800" : "text-bark-500"}`}>
                        {on ? <Check className="w-4 h-4 text-grass-700 shrink-0 mt-0.5" /> : <Minus className="w-4 h-4 shrink-0 mt-0.5" />}
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={planHref(plan.cycles)} className={`${buttonClass(recommended ? "primary" : "secondary", "md")} mt-6 w-full`}>
                    Chọn {plan.name}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-bark-500">
            Giá tính cho {tier === "standard" ? "Box Tiêu chuẩn" : "Box Premium"}. Chưa chắc bé có hợp không?{" "}
            <Link href="/boxes" className="font-bold text-pine-900 underline underline-offset-2">Mua thử 1 hộp</Link>, trả tiền khi nhận hàng.
          </p>
        </section>

        {/* CÁCH HOẠT ĐỘNG */}
        <section aria-labelledby="how-heading" className="space-y-6">
          <h2 id="how-heading" className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Cách gói định kỳ hoạt động</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-5 gap-y-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <div className="flex items-center gap-3 lg:block">
                  <span className="w-9 h-9 rounded-full bg-pine-900 text-white text-sm font-extrabold font-display flex items-center justify-center shrink-0 relative z-10">
                    {i + 1}
                  </span>
                  {/* Đường nối giữa các bước trên desktop */}
                  {i < STEPS.length - 1 && <span aria-hidden="true" className="hidden lg:block absolute top-[18px] left-9 right-[-20px] h-px bg-pine-800/30" />}
                  <h3 className="text-sm font-bold text-pine-950 lg:mt-3">{s.title}</h3>
                </div>
                <p className="mt-1.5 text-sm text-bark-600 leading-relaxed pl-12 lg:pl-0">{s.text}</p>
              </li>
            ))}
          </ol>

          {/* Lịch giao tính theo ngày thật nếu đăng ký hôm nay */}
          <div className="p-4 sm:p-5 rounded-container bg-surface-card border border-surface-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-pine-950">Nếu đăng ký gói 3 hộp hôm nay</h3>
              <div role="group" aria-label="Đợt giao" className="inline-flex p-1 rounded-box bg-surface-muted text-xs self-start">
                {(Object.keys(SCHEDULE_LABEL) as DeliverySchedule[]).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    aria-pressed={schedule === sc}
                    onClick={() => setSchedule(sc)}
                    className={`min-h-9 px-3 rounded-lg font-bold transition-colors ${schedule === sc ? "bg-white text-pine-950 shadow-xs" : "text-bark-600"}`}
                  >
                    {SCHEDULE_LABEL[sc]}
                  </button>
                ))}
              </div>
            </div>
            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <li className="p-3.5 rounded-box bg-pine-50 border border-pine-200 text-sm">
                <p className="text-xs font-bold text-pine-900 uppercase tracking-wide">Hộp 1/3</p>
                <p className="font-bold text-pine-950 mt-1">Gửi ngay sau khi thanh toán</p>
                <p className="text-xs text-bark-700 mt-0.5">Giao {DELIVERY_DAYS}</p>
              </li>
              {laterBoxes.map((start, i) => (
                <li key={i} className="p-3.5 rounded-box bg-surface-muted/70 border border-surface-border text-sm">
                  <p className="text-xs font-bold text-bark-600 uppercase tracking-wide">Hộp {i + 2}/3</p>
                  <p className="font-bold text-pine-950 mt-1">Giao {deliveryWindowLabel(start, schedule)}</p>
                  <p className="text-xs text-bark-600 mt-0.5">Chốt hồ sơ ngày {formatDate(cutoffOf(start))}</p>
                </li>
              ))}
            </ol>
            <p className="text-xs text-bark-700">
              Sau hộp 3, FPETS nhắc bạn gia hạn. Hạn gia hạn là <strong className="text-pine-950">{formatDate(renewalCutoff)}</strong>; không gia hạn thì gói tự kết thúc.
            </p>
          </div>
        </section>

        {/* QUẢN LÝ GÓI */}
        <section aria-labelledby="manage-heading" className="space-y-5">
          <div className="space-y-1.5">
            <h2 id="manage-heading" className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">Tạm dừng, gia hạn hoặc hủy</h2>
            <p className="text-sm text-bark-600">
              Bạn tự làm trong <Link href="/my-account/subscriptions" className="font-bold text-pine-900 underline underline-offset-2">Tài khoản → Gói định kỳ</Link>, không cần gọi điện.
            </p>
          </div>
          <div className="rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border">
            {MANAGE.map((m) => (
              <div key={m.title} className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-6">
                <div>
                  <h3 className="text-sm font-bold text-pine-950">{m.title}</h3>
                  <p className="text-xs text-bark-500 mt-0.5">{m.when}</p>
                </div>
                <p className="text-sm text-bark-700 leading-relaxed">{m.result}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HỎI NHANH */}
        <section aria-labelledby="sub-faq-heading" className="space-y-4 max-w-3xl">
          <h2 id="sub-faq-heading" className="text-xl sm:text-2xl font-extrabold text-pine-950 font-display">Câu hỏi về gói định kỳ</h2>
          <div className="rounded-container bg-surface-card border border-surface-border divide-y divide-surface-border">
            {FAQ.map((item) => (
              <details key={item.q} className="group p-4 sm:p-5">
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-bold text-pine-950">
                  {item.q}
                  <span aria-hidden="true" className="text-bark-500 text-lg leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm text-bark-600 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
          <Link href="/faq" className="inline-block text-sm font-bold text-pine-900 underline underline-offset-2">Xem tất cả câu hỏi</Link>
        </section>
      </div>
    </div>
  );
}
