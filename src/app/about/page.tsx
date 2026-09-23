import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  ShieldCheck,
  PackageOpen,
  Users,
  Award,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Clock,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";

export const metadata = {
  title: "Về FPETS - Câu chuyện thương hiệu & Cam kết chất lượng",
  description: "Dịch vụ hộp quà thú cưng cá nhân hóa định kỳ đầu tiên tại Việt Nam. Tìm hiểu sứ mệnh và cam kết an toàn cho thú cưng của FPETS.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-surface-muted py-8 sm:py-14 space-y-12 sm:space-y-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-20">
        {/* HERO SECTION: Giới thiệu & Sứ mệnh */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-tag bg-pine-100 text-pine-900 text-xs font-bold">
            <Heart className="w-3.5 h-3.5 text-pine-800 fill-pine-800" />
            <span>Câu chuyện thương hiệu FPETS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-pine-950 font-display tracking-tight leading-tight">
            Mỗi bé cưng là một cá tính riêng, xứng đáng với niềm vui riêng biệt.
          </h1>

          <p className="text-base sm:text-lg text-bark-700 leading-relaxed">
            FPETS ra đời từ chính sự bối rối của những người nuôi chó mèo: đứng trước hàng trăm món đồ ở pet shop nhưng không biết món nào bé thích, đồ chơi nào bền và thành phần nào bé không bị dị ứng.
          </p>
        </section>

        {/* HÌNH ẢNH MINH HỌA & CÂU CHUYỆN KHỞI NGUỒN */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center rounded-container bg-surface-card border border-surface-border p-6 sm:p-10 shadow-xs">
          <div className="relative aspect-[4/3] rounded-box overflow-hidden border border-surface-border bg-surface-muted shadow-sm">
            {/* TODO: thay bằng ảnh thật của FPETS khi có */}
            <Image
              src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1000&q=85"
              alt="Hai chú cún cưng vui mừng khi mở hộp quà FPETS"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>

          <div className="space-y-4 text-bark-700 text-sm sm:text-base leading-relaxed">
            <h2 className="text-2xl font-bold text-pine-950 font-display">
              Từ tình yêu thương đến mô hình hộp quà định kỳ đầu tiên tại Việt Nam
            </h2>
            <p>
              Năm 2026, nhóm sáng lập FPETS nhận thấy phần lớn ba mẹ thú cưng tại Việt Nam đang tốn quá nhiều thời gian mua sắm lặp lại, hoặc mua phải những món đồ chơi bé chỉ ngửi qua rồi bỏ xó.
            </p>
            <p>
              Chúng tôi quyết định áp dụng công nghệ hồ sơ cá nhân hóa kết hợp cùng sự giám sát của các chuyên gia dinh dưỡng thú y để tạo nên <strong>Mystery Box</strong>: Mỗi tháng gửi đến tận cửa nhà bạn một hộp quà chứa đựng sự bất ngờ, niềm vui và sự an tâm tuyệt đối.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs font-bold text-pine-900">
              <span className="flex items-center gap-1.5 bg-pine-50 px-3 py-1.5 rounded-tag border border-pine-200">
                <CheckCircle2 className="w-4 h-4 text-grass-700" /> Cá nhân hóa 100%
              </span>
              <span className="flex items-center gap-1.5 bg-pine-50 px-3 py-1.5 rounded-tag border border-pine-200">
                <CheckCircle2 className="w-4 h-4 text-grass-700" /> An toàn dinh dưỡng
              </span>
              <span className="flex items-center gap-1.5 bg-pine-50 px-3 py-1.5 rounded-tag border border-pine-200">
                <CheckCircle2 className="w-4 h-4 text-grass-700" /> Tiết kiệm hơn mua lẻ
              </span>
            </div>
          </div>
        </section>

        {/* 4 CAM KẾT VÀNG CỦA FPETS */}
        <section className="space-y-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
              4 Cam Kết Chất Lượng Vững Chắc
            </h2>
            <p className="text-xs sm:text-sm text-bark-600">
              Chúng tôi chăm sóc thú cưng của bạn như chính thành viên trong gia đình mình.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-container bg-surface-card border border-surface-border shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-box bg-grass-100 text-grass-800 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-pine-950 font-display">Tránh 100% Dị Ứng</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Hệ thống tự động lọc và loại trừ tuyệt đối mọi thành phần dị ứng mà bạn đã khai báo trong Pet Profile trước khi đóng gói.
              </p>
            </div>

            <div className="p-6 rounded-container bg-surface-card border border-surface-border shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-box bg-honey-100 text-honey-800 flex items-center justify-center font-bold">
                <PackageOpen className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-pine-950 font-display">Giá Trị Thật Vượt Trội</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Tổng giá trị bán lẻ thực tế của các món trong hộp luôn cao hơn từ 81.000₫ – 151.000₫ so với mức giá bạn trả cho hộp quà.
              </p>
            </div>

            <div className="p-6 rounded-container bg-surface-card border border-surface-border shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-box bg-pine-100 text-pine-900 flex items-center justify-center font-bold">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-pine-950 font-display">Đổi Món Miễn Phí 3 Ngày</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Đổi món hoặc hoàn tiền 100% nếu món ăn dính dị ứng ngoài ý muốn hoặc hàng hóa bị hỏng vỡ trong quá trình vận chuyển.
              </p>
            </div>

            <div className="p-6 rounded-container bg-surface-card border border-surface-border shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-box bg-cream-200 text-pine-950 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-pine-950 font-display">Minh Bạch Tuyệt Đối</h3>
              <p className="text-xs text-bark-600 leading-relaxed">
                Gói định kỳ thanh toán trả trước từng đợt, không bao giờ tự ý lưu thẻ hay tự động trừ tiền trong tài khoản của khách.
              </p>
            </div>
          </div>
        </section>

        {/* CỘT MỐC & CON SỐ THỰC TẾ */}
        <section className="rounded-container bg-pine-950 text-pine-100 p-8 sm:p-12 border border-pine-900">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-pine-800">
            <div className="pt-4 md:pt-0">
              <div className="text-3xl sm:text-5xl font-extrabold text-honey-400 font-display">1.200+</div>
              <div className="text-xs sm:text-sm text-pine-300 mt-1">Bé cưng đang nhận quà</div>
            </div>
            <div className="pt-4 md:pt-0">
              <div className="text-3xl sm:text-5xl font-extrabold text-honey-400 font-display">4.800+</div>
              <div className="text-xs sm:text-sm text-pine-300 mt-1">Hộp quà đã gửi đi</div>
            </div>
            <div className="pt-4 md:pt-0">
              <div className="text-3xl sm:text-5xl font-extrabold text-honey-400 font-display">98.5%</div>
              <div className="text-xs sm:text-sm text-pine-300 mt-1">Tỉ lệ hài lòng về món ăn</div>
            </div>
            <div className="pt-4 md:pt-0">
              <div className="text-3xl sm:text-5xl font-extrabold text-honey-400 font-display">4.9 / 5</div>
              <div className="text-xs sm:text-sm text-pine-300 mt-1">Điểm đánh giá từ ba mẹ</div>
            </div>
          </div>
        </section>

        {/* CTA BẮT ĐẦU */}
        <section className="text-center space-y-5 py-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">
            Sẵn sàng mang đến niềm vui bất ngờ cho bé yêu?
          </h2>
          <p className="text-xs sm:text-sm text-bark-600 max-w-md mx-auto">
            Chỉ mất 2 phút hoàn thành Pet Quiz để khám phá chiếc hộp hoàn hảo được thiết kế riêng cho bé.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/quiz"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm transition-colors"
            >
              <span>Làm Quiz tìm Box ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/subscription"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-box bg-surface-card hover:bg-white text-pine-950 border border-surface-border font-bold text-sm transition-colors"
            >
              <span>Tìm hiểu các Gói định kỳ</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
