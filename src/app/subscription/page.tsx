"use client";

import React, { useState } from "react";
import Link from "next/link";
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
import { SUBSCRIPTION_PLANS, BOX_TYPES } from "@/mock/boxTypes";

export default function SubscriptionIntroPage() {
  const [selectedSpecies, setSelectedSpecies] = useState<'dog' | 'cat'>('dog');
  const [selectedBoxLevel, setSelectedBoxLevel] = useState<'standard' | 'premium'>('standard');

  // Giá cơ bản: Tiêu chuẩn 299k, Premium 499k
  const baseBoxPrice = selectedBoxLevel === 'standard' ? 299000 : 499000;

  return (
    <div className="min-h-screen bg-surface-muted py-8 sm:py-14 space-y-12 sm:space-y-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-20">
        {/* HERO SECTION */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-tag bg-pine-100 text-pine-900 text-xs font-bold">
            <Calendar className="w-3.5 h-3.5 text-pine-800" />
            <span>Gói Định Kỳ Mystery Box FPETS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-pine-950 font-display tracking-tight leading-tight">
            Mỗi tháng một niềm vui bất ngờ gõ cửa nhà bạn.
          </h1>

          <p className="text-base sm:text-lg text-bark-700 leading-relaxed">
            Chăm sóc thú cưng chưa bao giờ thảnh thơi và thú vị đến thế. Đăng ký gói định kỳ để nhận hộp quà tuyển chọn riêng mỗi tháng với mức giá tiết kiệm đến 15%, miễn phí giao hàng và trọn quyền kiểm soát.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/quiz"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm transition-colors"
            >
              <span>Làm Quiz chọn gói phù hợp</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/boxes"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-box bg-surface-card hover:bg-white text-pine-950 border border-surface-border font-bold text-sm transition-colors"
            >
              <span>Khám phá các loại Box</span>
            </Link>
          </div>
        </section>

        {/* BẢNG SO SÁNH 3 GÓI 1/3/6 HỘP */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
              Chọn Gói Định Kỳ Phù Hợp
            </h2>
            <p className="text-xs sm:text-sm text-bark-600">
              Thanh toán trả trước một lần duy nhất. Hoàn toàn không tự động gia hạn hay trừ tiền thẻ.
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
                Hộp Tiêu chuẩn (299k/hộp)
              </button>
              <button
                type="button"
                onClick={() => setSelectedBoxLevel('premium')}
                className={`px-3 py-1.5 rounded font-bold transition-colors ${
                  selectedBoxLevel === 'premium' ? 'bg-pine-900 text-white' : 'text-bark-600 hover:text-pine-950'
                }`}
              >
                Hộp Premium (499k/hộp)
              </button>
            </div>
          </div>

          {/* 3 Thẻ so sánh gói */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isPopular = plan.cycles === 3;
              const isBest = plan.cycles === 6;
              const originalTotal = baseBoxPrice * plan.cycles;
              const discountAmount = (originalTotal * plan.discountPercent) / 100;
              const finalTotal = originalTotal - discountAmount;
              const perBoxPrice = Math.round(finalTotal / plan.cycles);

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

                      {plan.discountPercent > 0 && (
                        <div className="text-xs text-bark-500 mt-1 flex items-center gap-1.5">
                          <span className="line-through">{formatVND(baseBoxPrice)}</span>
                          <span className="font-bold text-grass-700 bg-grass-100 px-1.5 py-0.5 rounded">
                            Giảm {plan.discountPercent}%
                          </span>
                        </div>
                      )}

                      <div className="text-[11px] text-bark-500 mt-2">
                        Tổng trả trước: <strong className="text-pine-950 font-bold">{formatVND(finalTotal)}</strong> cho {plan.cycles} kỳ
                      </div>
                    </div>

                    {/* Quyền lợi danh sách */}
                    <div className="space-y-2.5 pt-3 border-t border-surface-border text-xs text-bark-700">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-grass-700 shrink-0" />
                        <span>Giao định kỳ mỗi tháng 1 hộp</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-grass-700 shrink-0" />
                        <span>Tuyển chọn riêng theo sở thích & dị ứng</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${plan.freeShipping ? 'text-grass-700' : 'text-bark-300'}`} />
                        <span className={plan.freeShipping ? 'font-bold text-grass-800' : 'text-bark-400'}>
                          {plan.freeShipping ? 'Miễn phí vận chuyển toàn bộ kỳ' : 'Phí ship đồng giá 25k/35k'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${plan.birthdayGift ? 'text-honey-600' : 'text-bark-300'}`} />
                        <span className={plan.birthdayGift ? 'font-bold text-honey-800' : 'text-bark-400'}>
                          {plan.birthdayGift ? 'Tặng kèm Quà sinh nhật đặc biệt cho bé' : 'Chưa có quà sinh nhật'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-grass-700 shrink-0" />
                        <span>Tự do tạm dừng 1–2 kỳ bất kỳ lúc nào</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-4">
                    <Link
                      href={`/quiz?plan=${plan.cycles}`}
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
              Quy Trình Hoạt Động Rất Đơn Giản
            </h2>
            <p className="text-xs sm:text-sm text-bark-600">
              Chỉ 4 bước để bé cưng nhận quà đều đặn mỗi tháng
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2.5 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-pine-900 text-white font-extrabold flex items-center justify-center text-sm font-display mx-auto sm:mx-0">
                1
              </div>
              <h3 className="font-bold text-sm text-pine-950">Lập Pet Profile</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Hoàn thành Quiz 5 câu: loài, size, độ tuổi, các món bé thích và thành phần dị ứng cần tránh.
              </p>
            </div>

            <div className="space-y-2.5 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-pine-900 text-white font-extrabold flex items-center justify-center text-sm font-display mx-auto sm:mx-0">
                2
              </div>
              <h3 className="font-bold text-sm text-pine-950">Chọn Gói & Đợt Giao</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Chọn gói 1, 3 hoặc 6 hộp và đợt giao thuận tiện: Đầu tháng (ngày 1–5) hoặc Giữa tháng (ngày 15–20).
              </p>
            </div>

            <div className="space-y-2.5 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-pine-900 text-white font-extrabold flex items-center justify-center text-sm font-display mx-auto sm:mx-0">
                3
              </div>
              <h3 className="font-bold text-sm text-pine-950">Chuyên Gia Đóng Gói</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Trước mỗi đợt giao 7 ngày, chuyên gia chọn món mới lạ không trùng lặp các kỳ trước và gửi tận nhà.
              </p>
            </div>

            <div className="space-y-2.5 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-pine-900 text-white font-extrabold flex items-center justify-center text-sm font-display mx-auto sm:mx-0">
                4
              </div>
              <h3 className="font-bold text-sm text-pine-950">Unbox & Chấm Điểm</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Cùng bé mở hộp quà, chấm điểm từng món để hộp quà các kỳ tiếp theo càng ngày càng hoàn hảo hơn.
              </p>
            </div>
          </div>
        </section>

        {/* CHÍNH SÁCH QUẢN LÝ GÓI LINH HOẠT */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
              Trọn Quyền Kiểm Soát Trong Tay Bạn
            </h2>
            <p className="text-xs sm:text-sm text-bark-600">
              Không trói buộc, không rắc rối, mọi thao tác đều thực hiện trực tuyến trong trang cá nhân.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-container bg-surface-card border border-surface-border shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-box bg-pine-100 text-pine-900 flex items-center justify-center">
                <PauseCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-pine-950">Tạm Dừng (Pause)</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Đi du lịch hoặc bé còn nhiều đồ chơi chưa dùng hết? Chỉ cần 1 chạm để tạm dừng 1 hoặc 2 kỳ. Lịch giao sẽ tự động lùi lại mà không mất quyền lợi.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-container bg-surface-card border border-surface-border shadow-2xs">
              <div className="w-10 h-10 rounded-box bg-honey-100 text-honey-800 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-pine-950">Gia Hạn Liền Mạch (Renew)</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Khi đến kỳ giao hộp cuối, bạn sẽ nhận được nhắc nhở để gia hạn. Gói mới sẽ tự động nối tiếp tháng kế tiếp mà không làm gián đoạn lịch nhận quà của bé.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-container bg-surface-card border border-surface-border shadow-2xs">
              <div className="w-10 h-10 rounded-box bg-grass-100 text-grass-800 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-pine-950">Hủy Gói Minh Bạch (Cancel)</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Nếu muốn ngừng gói, bạn có thể bấm Hủy bất cứ lúc nào. Các hộp bạn đã thanh toán trước vẫn sẽ được đóng gói và giao đầy đủ đến tận hộp cuối cùng.
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
              <div className="font-bold text-pine-950">Ngày chốt kỳ (Cut-off date) là gì?</div>
              <p className="text-bark-600 leading-relaxed">
                Là mốc trước ngày giao hàng 7 ngày. Trước mốc này, bạn có thể thoải mái cập nhật địa chỉ giao hàng, tạm dừng gói hoặc chỉnh sửa sở thích dị ứng của bé.
              </p>
            </div>

            <div className="pt-3 space-y-1">
              <div className="font-bold text-pine-950">Tôi có thể đổi địa chỉ nhận hàng giữa các kỳ không?</div>
              <p className="text-bark-600 leading-relaxed">
                Có! Bạn có thể vào mục &lsquo;Quản lý gói định kỳ&rsquo; để đổi địa chỉ giao hàng cho kỳ tiếp theo bất kỳ lúc nào trước ngày Cut-off.
              </p>
            </div>

            <div className="pt-3 space-y-1">
              <div className="font-bold text-pine-950">Tôi có thể đăng ký gói cho nhiều bé cùng lúc được không?</div>
              <p className="text-bark-600 leading-relaxed">
                Hoàn toàn được! Mỗi bé sẽ có một Pet Profile riêng biệt và một gói quà riêng để đảm bảo đúng loài, size và không dính dị ứng.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
