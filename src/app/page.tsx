"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Gift,
  CheckCircle2,
  Heart,
  Star,
  ShieldCheck,
  Truck,
  RefreshCw,
  PackageOpen,
  UtensilsCrossed,
  Bone,
  PawPrint,
  HeartHandshake,
  Check,
} from "lucide-react";
import { BOX_TYPES, SUBSCRIPTION_PLANS } from "@/mock/boxTypes";
import { formatVND } from "@/lib/formatters";

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-24">
      {/* 1. HERO SECTION: Trải nghiệm mở hộp quà bất ngờ nổi bật, tương phản cao */}
      <section className="bg-surface-muted border-b border-surface-border pt-8 pb-14 sm:pt-16 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Cột chữ Hero */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-extrabold text-pine-950 font-display tracking-tight leading-[1.12]">
              Mỗi tháng một hộp quà bất ngờ, tuyển chọn riêng cho bé cưng.
            </h1>

            <p className="text-base sm:text-lg text-bark-700 leading-relaxed max-w-xl">
              Không còn mất công phân vân ở pet shop. FPETS gửi đến tận nhà Mystery Box định kỳ gồm thức ăn giàu dinh dưỡng, đồ chơi dai bền và phụ kiện hữu ích — được nhặt riêng theo đúng cân nặng, độ tuổi và sở thích dị ứng của từng bé.
            </p>

            {/* Các điểm cam kết nhanh */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs font-semibold text-bark-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-grass-700 shrink-0" />
                <span>Tránh 100% món dị ứng</span>
              </div>
              <div className="flex items-center gap-2">
                <PackageOpen className="w-4 h-4 text-grass-700 shrink-0" />
                <span>Trị giá cao hơn giá bán</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-grass-700 shrink-0" />
                <span>Không tự động trừ tiền</span>
              </div>
            </div>

            {/* Cụm CTA chính (không còn Sparkles trang trí) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                href="/quiz"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-base shadow-sm transition-colors text-center"
              >
                <span>Làm Quiz tìm Box cho bé</span>
              </Link>
              <Link
                href="/boxes"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-box bg-surface-card hover:bg-white text-pine-950 border border-surface-border font-bold text-base transition-colors text-center"
              >
                <span>Xem các loại Mystery Box</span>
              </Link>
            </div>

            {/* Thanh bảo chứng uy tín (Social Proof & Trust metrics) */}
            <div className="pt-4 border-t border-surface-border/80 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-bark-600">
              {/* Stack Avatar khách hàng & Pet */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-surface-muted overflow-hidden relative">
                    <Image
                      src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=100&q=80"
                      alt="Corgi"
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-surface-muted overflow-hidden relative">
                    <Image
                      src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&q=80"
                      alt="Mèo"
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-surface-muted overflow-hidden relative">
                    <Image
                      src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=100&q=80"
                      alt="Golden"
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                </div>
                <div>
                  <span className="font-extrabold text-pine-950 block">1.200+</span>
                  <span className="text-[11px] text-bark-500">Bé cưng hạnh phúc</span>
                </div>
              </div>

              <div className="hidden sm:block w-px h-8 bg-surface-border" />

              <div>
                <span className="font-extrabold text-pine-950 block">4.800+</span>
                <span className="text-[11px] text-bark-500">Hộp quà đã giao</span>
              </div>

              <div className="hidden sm:block w-px h-8 bg-surface-border" />

              <div>
                <div className="flex items-center gap-1 font-extrabold text-pine-950">
                  <Star className="w-3.5 h-3.5 text-honey-500 fill-honey-500" />
                  <span>4.9 / 5</span>
                </div>
                <span className="text-[11px] text-bark-500">620+ đánh giá 5 sao</span>
              </div>
            </div>
          </div>

          {/* Cột Hình ảnh minh họa hộp quà lớn & nổi bật */}
          <div className="lg:col-span-5">
            <div className="relative rounded-container overflow-hidden border border-surface-border shadow-xl bg-surface-card">
              {/* Ảnh chính lớn mở hộp thú cưng: Có chiều cao xác định ở mọi breakpoint */}
              {/* TODO: thay bằng ảnh thật của FPETS khi có */}
              <div className="relative w-full h-[260px] sm:h-[340px] md:h-[400px] lg:h-[430px]">
                <Image
                  src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=1000&q=85"
                  alt="Ảnh chụp hộp quà Mystery Box FPETS mở ra cùng đồ ăn và đồ chơi cho thú cưng"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />

                {/* Gradient nhẹ phủ phía dưới chỉ từ md trở lên để làm nổi thẻ thông tin */}
                <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />

                {/* Badge góc trên */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 px-3 py-1 rounded-tag bg-white/95 backdrop-blur-xs text-pine-950 text-xs font-bold shadow-sm border border-white/50 flex items-center gap-1.5 z-10">
                  <PackageOpen className="w-3.5 h-3.5 text-pine-900" />
                  <span>Hộp quà Tiêu chuẩn tháng này</span>
                </div>
              </div>

              {/* Khối thông tin: ở mobile đẩy xuống dưới ảnh (không overlay để không che mặt thú cưng), từ md trở lên mới là overlay nổi */}
              <div className="p-3.5 sm:p-4 bg-white border-t border-surface-border text-xs space-y-1.5 md:border-t-0 md:absolute md:bottom-4 md:inset-x-4 md:p-3.5 md:rounded-box md:bg-white/95 md:backdrop-blur-xs md:border md:border-white/60 md:shadow-lg z-10">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-pine-950">Gồm 4 – 5 món chọn lọc</span>
                  <span className="px-2 py-0.5 rounded-tag bg-grass-100 text-grass-800 text-[11px] font-bold">
                    Trị giá thực từ 380.000₫
                  </span>
                </div>
                <p className="text-[11px] text-bark-600 line-clamp-1">
                  Pate cá hồi Na Uy · Dây thừng gặm răng · Bánh men sạch khuẩn · Đồ chơi bất ngờ
                </p>
                <div className="pt-1 flex items-center gap-3 text-[10px] text-bark-500 border-t border-surface-border">
                  <span className="flex items-center gap-1 text-grass-700 font-semibold">
                    <Check className="w-3 h-3" /> Đổi món nếu dị ứng
                  </span>
                  <span>·</span>
                  <span>Tiết kiệm 81.000₫</span>
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
            Chúng tôi không đóng sẵn hàng loạt. Mỗi hộp được nhân viên kho nhặt riêng sát ngày giao dựa trên hồ sơ của bé.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="p-6 rounded-container bg-surface-card border border-surface-border space-y-3 relative hover:border-pine-800 transition-colors">
            <div className="w-10 h-10 rounded-box bg-pine-900 text-white flex items-center justify-center font-bold text-base font-display">
              1
            </div>
            <h3 className="text-base font-bold text-pine-950">Kể về bé cưng (Làm Quiz 2 phút)</h3>
            <p className="text-xs sm:text-sm text-bark-600 leading-relaxed">
              Bạn chia sẻ tên bé, loài (chó/mèo), cân nặng, sở thích và các thành phần dị ứng (như gà, bắp, hải sản...) qua bảng trắc nghiệm ngắn.
            </p>
          </div>

          <div className="p-6 rounded-container bg-surface-card border border-surface-border space-y-3 relative hover:border-pine-800 transition-colors">
            <div className="w-10 h-10 rounded-box bg-honey-600 text-white flex items-center justify-center font-bold text-base font-display">
              2
            </div>
            <h3 className="text-base font-bold text-pine-950">FPETS chọn đồ riêng theo hồ sơ</h3>
            <p className="text-xs sm:text-sm text-bark-600 leading-relaxed">
              Sát ngày giao, chuyên viên kho chọn 4–7 món đạt chuẩn an toàn, kiểm tra thành phần loại trừ dị ứng và cơ cấu đủ đồ ăn + đồ chơi + phụ kiện.
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
                  <span className="text-3xl font-extrabold text-pine-950 font-display">299.000₫</span>
                  <span className="text-xs text-bark-500">/ hộp</span>
                </div>
                <p className="text-xs text-grass-700 font-semibold">
                  Giá trị hàng bên trong tối thiểu 380.000₫
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
                  href="/boxes/box-tieu-chuan-cho-nho"
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
                  <span className="text-3xl font-extrabold text-pine-950 font-display">499.000₫</span>
                  <span className="text-xs text-bark-500">/ hộp</span>
                </div>
                <p className="text-xs text-grass-700 font-semibold">
                  Giá trị hàng bên trong tối thiểu 650.000₫
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
                    <span>Tặng kèm quà sinh nhật độc quyền khi đăng ký gói 6 hộp</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-pine-700 shrink-0" />
                    <span>Đặc quyền ưu tiên đổi món theo yêu cầu riêng</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-surface-border">
                <Link
                  href="/boxes/box-premium-cho"
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
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isBest = plan.cycles === 3;
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
                    <div className="text-2xl font-extrabold text-pine-950 font-display">
                      {plan.cycles === 1 && "299.000₫"}
                      {plan.cycles === 3 && "807.000₫"}
                      {plan.cycles === 6 && "1.525.000₫"}
                    </div>
                    <div className="text-xs text-grass-700 font-medium">
                      {plan.discountPercent > 0 ? `Tiết kiệm ${plan.discountPercent}% mỗi hộp` : "Giá niêm yết chuẩn"}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-bark-700 pt-3 border-t border-surface-border">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-grass-600 shrink-0" />
                      <span>Nhận 1 hộp mỗi tháng ({plan.cycles} tháng)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-grass-600 shrink-0" />
                      <span>{plan.freeShipping ? "Freeship toàn bộ các kỳ giao" : "Phí ship tiêu chuẩn theo tỉnh"}</span>
                    </div>
                    {plan.birthdayGift && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-honey-600 shrink-0" />
                        <span className="font-semibold text-honey-700">Tặng thêm quà sinh nhật bé cưng</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-surface-border">
                  <Link
                    href="/boxes"
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

      {/* 5. FEEDBACK KHÁCH HÀNG: Trải nghiệm thật */}
      <section className="bg-surface-muted border-y border-surface-border py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
              Niềm vui unbox của các bé tại Việt Nam
            </h2>
            <p className="text-sm text-bark-600">
              Đánh giá thực tế từ các ba mẹ đã trải nghiệm dịch vụ Mystery Box FPETS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-container bg-surface-card border border-surface-border space-y-3">
              <div className="flex items-center gap-1 text-honey-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-honey-500" />
                ))}
              </div>
              <p className="text-xs text-bark-700 leading-relaxed">
                “Bé Golden nhà mình rất khó tính vụ ăn uống, hay bị dị ứng gà nổi mẩn ngứa. Đăng ký thử hộp tháng 9 shop nhặt toàn vị cừu với bò sấy, kèm sợi thừng cắn siêu dai. Bé mê tít luôn!”
              </p>
              <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-pine-950">Chị Mai Anh</span>
                  <span className="text-bark-500"> · Ba mẹ bé Bơ (Golden 18kg)</span>
                </div>
                <span className="text-[11px] text-grass-700 font-semibold">Box Tiêu chuẩn</span>
              </div>
            </div>

            <div className="p-5 rounded-container bg-surface-card border border-surface-border space-y-3">
              <div className="flex items-center gap-1 text-honey-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-honey-500" />
                ))}
              </div>
              <p className="text-xs text-bark-700 leading-relaxed">
                “Hộp đóng gói chỉn chu có thiệp ghi tên bé Miu cưng xỉu. Con cá nhồi catnip có tiếng sột soạt bé ôm đá chân sau cả ngày. Giá 299k mà tính lẻ các món ra gần 400k.”
              </p>
              <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-pine-950">Anh Tuấn Hoàng</span>
                  <span className="text-bark-500"> · Ba mẹ bé Miu (Mèo Anh)</span>
                </div>
                <span className="text-[11px] text-grass-700 font-semibold">Gói 3 hộp</span>
              </div>
            </div>

            <div className="p-5 rounded-container bg-surface-card border border-surface-border space-y-3">
              <div className="flex items-center gap-1 text-honey-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-honey-500" />
                ))}
              </div>
              <p className="text-xs text-bark-700 leading-relaxed">
                “Thích nhất là không bị trừ tiền âm thầm như mấy dịch vụ nước ngoài. Hết gói shop nhắn nhắc gia hạn, tháng nào bận đi công tác thì bấm tạm dừng 1 kỳ rất tiện.”
              </p>
              <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-pine-950">Bạn Thùy Dương</span>
                  <span className="text-bark-500"> · Ba mẹ bé Corgi Bắp</span>
                </div>
                <span className="text-[11px] text-grass-700 font-semibold">Box Premium</span>
              </div>
            </div>
          </div>
        </div>
      </section>

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
            {/* TODO: thay bằng ảnh thật của FPETS khi có */}
            <Image
              src="https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=800&q=80"
              alt="Cún cưng và mèo cưng đáng yêu bên nhau"
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
