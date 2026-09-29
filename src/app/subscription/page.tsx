"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Gift,
  Truck,
  ShieldCheck,
  CheckCircle2,
  PauseCircle,
  XCircle,
  RefreshCw,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  Clock,
  HeartHandshake,
} from "lucide-react";
import { formatVND } from "@/lib/formatters";
import { fetchBoxTypes, fetchSubscriptionPlans } from "@/lib/catalog";
import { QUIZ_LENGTH, QUIZ_NAME } from "@/lib/copy";

// Lịch giao minh họa cho gói 3 hộp, đợt đầu tháng (SPEC §5: chốt hộp 7 ngày trước đợt giao)
const SAMPLE_SCHEDULE = [
  { month: "Tháng 1", cutoff: "Chốt ngày 25 tháng trước", box: "Hộp 1/3" },
  { month: "Tháng 2", cutoff: "Chốt ngày 25/1", box: "Hộp 2/3" },
  { month: "Tháng 3", cutoff: "Chốt ngày 25/2", box: "Hộp 3/3 · nhắc gia hạn" },
];

export default function SubscriptionIntroPage() {
  const [selectedBoxLevel, setSelectedBoxLevel] = useState<'standard' | 'premium'>('standard');
  const [standardPrice, setStandardPrice] = useState(299000);
  const [premiumPrice, setPremiumPrice] = useState(499000);
  const [plans, setPlans] = useState<{ id: string; name: string; cycle_count: number; discount_percentage: number; free_shipping: boolean; birthday_gift: boolean; badge: string | null; description: string | null }[]>([]);

  useEffect(() => {
    fetchBoxTypes().then((boxes) => {
      const standard = boxes.find((b) => b.slug.includes("tieu-chuan")) || boxes[0];
      const premium = boxes.find((b) => b.slug.includes("premium")) || boxes[boxes.length - 1];
      if (standard) setStandardPrice(standard.basePrice);
      if (premium) setPremiumPrice(premium.basePrice);
    });
    fetchSubscriptionPlans().then(setPlans);
  }, []);

  const baseBoxPrice = selectedBoxLevel === 'standard' ? standardPrice : premiumPrice;

  return (
    <div className="min-h-screen bg-surface-muted py-8 sm:py-14 space-y-12 sm:space-y-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-20">
        {/* HERO SECTION */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-tag bg-pine-100 text-pine-900 text-xs font-bold">
            <Calendar className="w-3.5 h-3.5 text-pine-800" />
            <span>Gói định kỳ Mystery Box</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-pine-950 font-display tracking-tight leading-tight">
            Mỗi tháng một niềm vui bất ngờ gõ cửa nhà bạn.
          </h1>

          <p className="text-base sm:text-lg text-bark-700 leading-relaxed">
            Trả trước cho 1, 3 hoặc 6 hộp, nhận mỗi tháng 1 hộp chọn riêng cho bé. Gói 3 và 6 hộp giảm 10–15% và freeship. Không tự động trừ tiền; tạm dừng hoặc hủy ngay trong tài khoản.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/quiz"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm transition-colors"
            >
              <span>Làm {QUIZ_NAME}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/boxes"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-box bg-surface-card hover:bg-white text-pine-950 border border-surface-border font-bold text-sm transition-colors"
            >
              <span>Xem các loại box</span>
            </Link>
          </div>

          {/* Ảnh minh họa tạo bằng AI; thay bằng ảnh chụp hộp thật khi có */}
          <div className="relative mx-auto mt-6 max-w-2xl aspect-[4/3] rounded-container overflow-hidden border border-surface-border shadow-md">
            <Image
              src="/images/hero/fpets-box-open.jpg"
              alt="Hộp FPETS đang mở với gói snack, bóng cao su, dây thừng và thiệp gửi bé"
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover"
              priority
            />
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/45 text-white text-[10px]">Ảnh minh họa</span>
          </div>
        </section>

        {/* BẢNG SO SÁNH 3 GÓI 1/3/6 HỘP */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
              Chọn gói định kỳ
            </h2>
            <p className="text-xs sm:text-sm text-bark-600">
              Thanh toán trả trước một lần. Không tự động gia hạn, không trừ tiền thẻ.
            </p>
          </div>

          {/* Toggle chọn loại box để tính tiền minh họa */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="bg-surface-card border border-surface-border p-1 rounded-box flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedBoxLevel('standard')}
                className={`px-3 py-1.5 rounded font-bold transition-colors ${
                  selectedBoxLevel === 'standard' ? 'bg-pine-900 text-white' : 'text-bark-600 hover:text-pine-950'
                }`}
              >
                Box Tiêu chuẩn ({formatVND(standardPrice)}/hộp)
              </button>
              <button
                type="button"
                onClick={() => setSelectedBoxLevel('premium')}
                className={`px-3 py-1.5 rounded font-bold transition-colors ${
                  selectedBoxLevel === 'premium' ? 'bg-pine-900 text-white' : 'text-bark-600 hover:text-pine-950'
                }`}
              >
                Box Premium ({formatVND(premiumPrice)}/hộp)
              </button>
            </div>
          </div>

          {/* 3 Thẻ so sánh gói */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan) => {
              const isPopular = plan.cycle_count === 3;
              const isBest = plan.cycle_count === 6;
              const originalTotal = baseBoxPrice * plan.cycle_count;
              const discountAmount = (originalTotal * plan.discount_percentage) / 100;
              const finalTotal = originalTotal - discountAmount;
              const perBoxPrice = Math.round(finalTotal / plan.cycle_count);

              return (
                <div
                  key={plan.id}
                  className={`rounded-container p-6 sm:p-7 bg-surface-card border flex flex-col justify-between transition-shadow relative ${
                    isPopular
                      ? "border-pine-800 shadow-md ring-2 ring-pine-900/10"
                      : isBest
                      ? "border-honey-500 shadow-md ring-2 ring-honey-500/20"
                      : "border-surface-border shadow-xs"
                  }`}
                >
                  {/* Badge nổi */}
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className={`px-3 py-0.5 rounded-full text-[11px] font-extrabold shadow-xs ${
                        isPopular ? "bg-pine-900 text-white" : "bg-honey-600 text-white"
                      }`}>
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-extrabold text-pine-950 font-display">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-bark-600 mt-1 leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    {/* Khối giá */}
                    <div className="pt-2 border-t border-surface-border">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold text-pine-950 font-display">
                          {formatVND(perBoxPrice)}
                        </span>
                        <span className="text-xs text-bark-500">/ hộp</span>
                      </div>

                      {plan.discount_percentage > 0 && (
                        <div className="text-xs text-bark-500 mt-1 flex items-center gap-1.5">
                          <span className="line-through">{formatVND(baseBoxPrice)}</span>
                          <span className="font-bold text-grass-700 bg-grass-100 px-1.5 py-0.5 rounded">
                            Giảm {plan.discount_percentage}%
                          </span>
                        </div>
                      )}

                      <div className="text-[11px] text-bark-500 mt-2">
                        Tổng trả trước: <strong className="text-pine-950 font-bold">{formatVND(finalTotal)}</strong>{plan.cycle_count > 1 ? ` cho ${plan.cycle_count} hộp` : ""}
                      </div>
                    </div>

                    {/* Quyền lợi danh sách */}
                    <div className="space-y-2.5 pt-3 border-t border-surface-border text-xs text-bark-700">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-grass-700 shrink-0" />
                        <span>{plan.cycle_count === 1 ? "Nhận 1 hộp, không cam kết" : `Mỗi tháng 1 hộp, trong ${plan.cycle_count} tháng`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-grass-700 shrink-0" />
                        <span>Tuyển chọn riêng theo sở thích & dị ứng</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {plan.free_shipping ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-grass-700" />
                        ) : (
                          <XCircle className="w-4 h-4 shrink-0 text-bark-300" />
                        )}
                        <span className={plan.free_shipping ? 'font-bold text-grass-800' : 'text-bark-400'}>
                          {plan.free_shipping ? 'Miễn phí vận chuyển mọi hộp' : 'Phí ship 25.000₫ / 35.000₫'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {plan.birthday_gift ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-honey-600" />
                        ) : (
                          <XCircle className="w-4 h-4 shrink-0 text-bark-300" />
                        )}
                        <span className={plan.birthday_gift ? 'font-bold text-honey-800' : 'text-bark-400'}>
                          {plan.birthday_gift ? 'Quà sinh nhật cho bé' : 'Không kèm quà sinh nhật'}
                        </span>
                      </div>
                      {plan.cycle_count > 1 && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-grass-700 shrink-0" />
                          <span>Tạm dừng 1–2 kỳ trước ngày chốt</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 mt-4">
                    <Link
                      href={`/quiz?plan=${plan.cycle_count}`}
                      className={`w-full py-3 rounded-box text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                        isPopular
                          ? "bg-pine-900 hover:bg-pine-800 text-white shadow-xs"
                          : isBest
                          ? "bg-honey-500 hover:bg-honey-600 text-pine-950 shadow-xs"
                          : "bg-surface-muted hover:bg-surface-border text-pine-950 border border-surface-border"
                      }`}
                    >
                      <span>Đăng ký {plan.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4 BƯỚC HOẠT ĐỘNG */}
        <section className="rounded-container bg-surface-card border border-surface-border p-6 sm:p-10 space-y-8 shadow-xs">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
              Cách gói định kỳ hoạt động
            </h2>
            <p className="text-xs sm:text-sm text-bark-600">
              4 bước để bé nhận hộp đều đặn mỗi tháng
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2.5 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-pine-900 text-white font-extrabold flex items-center justify-center text-sm font-display mx-auto sm:mx-0">
                1
              </div>
              <h3 className="font-bold text-sm text-pine-950">Tạo hồ sơ thú cưng</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Trả lời {QUIZ_NAME} ({QUIZ_LENGTH}): loài, cân nặng, độ tuổi, sở thích và thành phần bé bị dị ứng.
              </p>
            </div>

            <div className="space-y-2.5 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-pine-900 text-white font-extrabold flex items-center justify-center text-sm font-display mx-auto sm:mx-0">
                2
              </div>
              <h3 className="font-bold text-sm text-pine-950">Chọn gói và đợt giao</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Chọn gói 1, 3 hoặc 6 hộp và đợt giao thuận tiện: Đầu tháng (ngày 1–5) hoặc Giữa tháng (ngày 15–20).
              </p>
            </div>

            <div className="space-y-2.5 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-pine-900 text-white font-extrabold flex items-center justify-center text-sm font-display mx-auto sm:mx-0">
                3
              </div>
              <h3 className="font-bold text-sm text-pine-950">FPETS chọn món theo hồ sơ</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Đến ngày chốt (7 ngày trước đợt giao), FPETS chọn món cho kỳ đó, không trùng món đã gửi các kỳ trước.
              </p>
            </div>

            <div className="space-y-2.5 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-pine-900 text-white font-extrabold flex items-center justify-center text-sm font-display mx-auto sm:mx-0">
                4
              </div>
              <h3 className="font-bold text-sm text-pine-950">Nhận hộp và chấm điểm món</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Mở hộp cùng bé, chấm từng món &ldquo;thích / bình thường / không thích&rdquo; để hộp sau hợp khẩu vị hơn.
              </p>
            </div>
          </div>

          {/* Lịch giao minh họa */}
          <div className="pt-6 border-t border-surface-border space-y-3">
            <div className="text-xs font-bold text-pine-950">Ví dụ lịch giao gói 3 hộp, đợt đầu tháng</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SAMPLE_SCHEDULE.map((item, i) => (
                <div key={item.month} className="relative p-4 rounded-box bg-surface-muted border border-surface-border flex items-center gap-3">
                  <div className="w-11 h-11 rounded-box bg-honey-100 text-honey-800 flex items-center justify-center shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-pine-950">{item.month} · giao ngày 1–5</div>
                    <div className="text-bark-600">{item.box}</div>
                    <div className="text-[11px] text-bark-400">{item.cutoff}</div>
                  </div>
                  {i < SAMPLE_SCHEDULE.length - 1 && (
                    <ArrowRight className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-300 z-10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CHÍNH SÁCH QUẢN LÝ GÓI LINH HOẠT */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
              Tạm dừng, gia hạn hoặc hủy dễ dàng
            </h2>
            <p className="text-xs sm:text-sm text-bark-600">
              Mọi thao tác làm ngay trong mục Gói định kỳ của tài khoản.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-container bg-surface-card border border-surface-border shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-box bg-pine-100 text-pine-900 flex items-center justify-center">
                <PauseCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-pine-950">Tạm dừng khi bận</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Đi du lịch hoặc bé còn nhiều đồ chưa dùng hết? Tạm dừng 1 hoặc 2 kỳ trước ngày chốt, lịch giao tự lùi lại, hộp đã trả trước vẫn giữ nguyên.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-container bg-surface-card border border-surface-border shadow-2xs">
              <div className="w-10 h-10 rounded-box bg-honey-100 text-honey-800 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-pine-950">Gia hạn khi hết gói</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Khi còn hộp cuối, FPETS nhắc bạn trên web trước 7, 3 và 1 ngày. Bấm Gia hạn, chọn lại gói và thanh toán là gói nối tiếp. Không gia hạn thì gói tự kết thúc sau 5 ngày, không trừ tiền.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-container bg-surface-card border border-surface-border shadow-2xs">
              <div className="w-10 h-10 rounded-box bg-grass-100 text-grass-800 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-pine-950">Hủy gói bất kỳ lúc nào</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Bấm Hủy bất cứ lúc nào. Các hộp đã trả trước vẫn được giao đủ; FPETS không hoàn tiền phần đã trả.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ MINI CHO GÓI ĐỊNH KỲ */}
        <section className="rounded-container bg-surface-card border border-surface-border p-6 sm:p-8 space-y-4 shadow-xs">
          <h2 className="text-lg font-bold text-pine-950 font-display flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-pine-800" />
            <span>Câu hỏi nhanh về Gói định kỳ</span>
          </h2>

          <div className="divide-y divide-surface-border text-xs sm:text-sm space-y-3 pt-1">
            <div className="pt-3 space-y-1">
              <div className="font-bold text-pine-950">Ngày chốt kỳ là gì?</div>
              <p className="text-bark-600 leading-relaxed">
                Là mốc 7 ngày trước đợt giao. Trước mốc này, bạn có thể tạm dừng gói hoặc cập nhật sở thích, dị ứng trong hồ sơ thú cưng; sau mốc này thay đổi áp dụng từ kỳ sau.
              </p>
            </div>

            <div className="pt-3 space-y-1">
              <div className="font-bold text-pine-950">Tôi có thể đổi địa chỉ nhận hàng giữa các kỳ không?</div>
              <p className="text-bark-600 leading-relaxed">
                Có. Bạn liên hệ FPETS qua hotline hoặc trang Liên hệ trước ngày chốt kỳ, chúng tôi sẽ cập nhật địa chỉ cho kỳ giao tiếp theo.
              </p>
            </div>

            <div className="pt-3 space-y-1">
              <div className="font-bold text-pine-950">Tôi có thể đăng ký gói cho nhiều bé cùng lúc được không?</div>
              <p className="text-bark-600 leading-relaxed">
                Được. Mỗi bé có hồ sơ thú cưng riêng và gói riêng, để hộp đúng loài, cân nặng và dị ứng của từng bé.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
