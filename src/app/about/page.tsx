import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  PackageOpen,
  RefreshCw,
  HeartHandshake,
  Check,
  ChevronRight,
  Compass,
  UtensilsCrossed,
  Bone,
  Mail,
  Award,
} from "lucide-react";
import { EXCHANGE_POLICY, QUIZ_LENGTH, QUIZ_NAME } from "@/lib/copy";

export const metadata = {
  title: "Về chúng tôi",
  description: "Câu chuyện của FPETS và cách chúng tôi chọn Mystery Box theo hồ sơ của từng bé chó, mèo.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] text-bark-900 selection:bg-honey-200">
      {/* KHỐI 1: HERO EDITORIAL — PHONG CÁCH TẠP CHÍ LIFESTYLE THÚ CƯNG */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 border-b border-surface-border/80">
        {/* Nền hoa văn vi mô hữu cơ tạo cảm giác giấy thủ công */}
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none bg-[radial-gradient(#17342C_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Tag tiêu đề phong cách thủ công */}
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-honey-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-pine-900">
              Khởi nguồn từ tình yêu thương thuần khiết
            </span>
          </div>

          {/* Bố cục Hero bất đối xứng */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            {/* Cột chữ lớn */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-pine-950 font-display tracking-tight leading-[1.08]">
                Mỗi bé cưng là một cá tính riêng. Niềm vui mở quà cũng phải đặc biệt như thế.
              </h1>

              <p className="text-base sm:text-lg text-bark-700 leading-relaxed font-normal">
                FPETS giúp ba mẹ thú cưng bớt băn khoăn khi đi pet shop: mỗi tháng một hộp quà với đồ ăn,
                đồ chơi và phụ kiện được chọn riêng theo hồ sơ của từng bé.
              </p>

              {/* Tuyên ngôn 3 trụ cột giá trị dạng thẻ nhãn thủ công */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-box bg-white border border-surface-border/90 shadow-2xs">
                  <div className="text-xs font-bold text-pine-950 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-honey-500" />
                    Cá nhân hóa theo hồ sơ
                  </div>
                  <p className="text-[11px] text-bark-600 leading-snug">
                    Không nhặt đồ đại trà; dựa đúng độ tuổi, cân nặng và dị ứng.
                  </p>
                </div>

                <div className="p-3.5 rounded-box bg-white border border-surface-border/90 shadow-2xs">
                  <div className="text-xs font-bold text-pine-950 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-grass-600" />
                    Rõ nguồn gốc
                  </div>
                  <p className="text-[11px] text-bark-600 leading-snug">
                    Chọn sản phẩm có nguồn gốc rõ ràng, hạn chế độn bột và phụ gia.
                  </p>
                </div>

                <div className="p-3.5 rounded-box bg-white border border-surface-border/90 shadow-2xs">
                  <div className="text-xs font-bold text-pine-950 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pine-700" />
                    Bất ngờ & tiết kiệm
                  </div>
                  <p className="text-[11px] text-bark-600 leading-snug">
                    Trị giá sản phẩm bên trong luôn cao hơn giá tiền thực trả.
                  </p>
                </div>
              </div>
            </div>

            {/* Cột ảnh chính: Kiểu ảnh Polaroid lồng ghép nghệ thuật */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Khung ảnh chính */}
                <div className="relative rounded-container overflow-hidden border-2 border-white shadow-xl bg-white p-2">
                  <div className="relative aspect-[4/5] rounded-box overflow-hidden bg-surface-muted">
                    <Image
                      src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1000&q=85"
                      alt="Hai chú cún chạy trên bãi cỏ"
                      fill
                      sizes="(max-width: 768px) 100vw, 40vw"
                      className="object-cover"
                      priority
                    />
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KHỐI 2: CÂU CHUYỆN KHỞI NGUỒN — VÌ SAO CHÚNG TÔI BẮT ĐẦU */}
      <section className="py-16 sm:py-24 bg-surface-card border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-bold text-honey-600 uppercase tracking-widest block mb-2">
              Khởi nguồn từ một sự thất vọng có thật
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-pine-950 font-display leading-snug">
              Bạn có từng đứng giữa pet shop với 500k trong ví nhưng không biết nên mua gì cho bé?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Cột trái: Nỗi đau của người nuôi thú cưng */}
            <div className="md:col-span-6 space-y-4 text-sm sm:text-base text-bark-700 leading-relaxed">
              <p>
                Đó chính là trải nghiệm của nhóm sáng lập FPETS vào năm 2026. Chúng tôi nuôi cún và mèo, và tháng nào cũng lặp lại kịch bản: chạy ra cửa hàng thú cưng, nhìn hàng trăm gói snack ngoại nhập không rõ chất lượng, mua một món đồ chơi đắt đỏ rồi mang về nhà... bé ngửi một lần rồi bỏ xó.
              </p>
              <p>
                Tệ hơn nữa, có những lần cho bé ăn thử bánh thưởng lạ, bé bị dị ứng nổi mẩn ngứa khắp bụng và phải đi khám thú y tốn cả triệu đồng.
              </p>
              <blockquote className="p-4 rounded-box bg-[#FAF8F5] border-l-4 border-pine-800 text-sm italic text-pine-950 font-medium my-4">
                &ldquo;Tại sao không có một dịch vụ hiểu rõ bé cưng của mình: biết bé nặng bao nhiêu cân để chọn đồ chơi vừa miệng, biết bé dị ứng gà để không gửi đồ gà, và mỗi tháng đem đến một sự háo hức mới?&rdquo;
              </blockquote>
              <p>
                Đó là khoảnh khắc FPETS ra đời. Chúng tôi tin rằng việc chăm sóc thú cưng không nên là gánh nặng tính toán, mà nên là một hành trình sẻ chia niềm vui.
              </p>
            </div>

            {/* Cột phải: Bảng so sánh lối suy nghĩ mới */}
            <div className="md:col-span-6 bg-[#FAF9F5] p-6 sm:p-8 rounded-container border border-surface-border space-y-6">
              <h3 className="text-lg font-bold text-pine-950 font-display flex items-center gap-2">
                <Compass className="w-5 h-5 text-pine-800" />
                <span>Sự khác biệt khi đồng hành cùng FPETS</span>
              </h3>

              <div className="space-y-4">
                <div className="pb-4 border-b border-surface-border/80">
                  <div className="text-xs font-bold text-bark-500 uppercase tracking-wider mb-1 line-through">
                    Cách mua sắm truyền thống
                  </div>
                  <p className="text-xs sm:text-sm text-bark-600">
                    Tốn 1-2 tiếng mỗi tháng ghé tiệm, mua theo cảm tính của người bán, dễ dính món dị ứng, đồ chơi mua về bé không thèm chơi gây lãng phí.
                  </p>
                </div>

                <div>
                  <div className="text-xs font-bold text-pine-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-grass-700 stroke-[3]" />
                    Mô hình Mystery Box của FPETS
                  </div>
                  <p className="text-xs sm:text-sm text-bark-800 leading-relaxed font-medium">
                    Khai báo hồ sơ một lần qua Pet Quiz. Mỗi tháng nhận hộp quà tận cửa: đồ ăn đã loại thành phần bé bị dị ứng theo khai báo, đồ chơi đúng cỡ miệng và một món chăm sóc hoặc phụ kiện.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KHỐI 3: BÓC TÁCH CHIẾC HỘP — ANATOMY OF A MYSTERY BOX */}
      <section className="py-16 sm:py-24 bg-[#F5F2EB] border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold text-pine-900 uppercase tracking-widest block">
              Minh bạch từng món quà
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-pine-950 font-display">
              Bên trong một chiếc hộp FPETS thực sự có những gì?
            </h2>
            <p className="text-xs sm:text-sm text-bark-600">
              Mỗi hộp có ít nhất 1 món ăn, 1 đồ chơi và 1 món chăm sóc hoặc phụ kiện, tổng trị giá luôn cao hơn giá bán.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Hạng mục 1: Đồ ăn dinh dưỡng */}
            <div className="bg-white p-6 rounded-container border border-surface-border shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-grass-100 text-grass-800 flex items-center justify-center font-bold">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-pine-950 font-display">
                  Món ăn và bánh thưởng
                </h3>
                <p className="text-xs text-bark-600 leading-relaxed">
                  Thịt sấy lạnh, pate hoặc bánh thưởng. Không chọn món chứa thành phần bé bị dị ứng theo khai báo.
                </p>
              </div>
              <div className="pt-3 border-t border-surface-border text-[11px] text-grass-700 font-semibold">
                ✓ Nguồn gốc rõ ràng, còn hạn dài
              </div>
            </div>

            {/* Hạng mục 2: Đồ chơi bền bỉ */}
            <div className="bg-white p-6 rounded-container border border-surface-border shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-honey-100 text-honey-800 flex items-center justify-center font-bold">
                  <Bone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-pine-950 font-display">
                  Đồ chơi
                </h3>
                <p className="text-xs text-bark-600 leading-relaxed">
                  Dây thừng kéo co, bóng cao su hoặc đồ chơi nhồi catnip. Chọn đúng cỡ miệng để tránh nguy cơ nuốt phải.
                </p>
              </div>
              <div className="pt-3 border-t border-surface-border text-[11px] text-honey-700 font-semibold">
                ✓ Đúng cỡ theo cân nặng của bé
              </div>
            </div>

            {/* Hạng mục 3: Phụ kiện hữu ích */}
            <div className="bg-white p-6 rounded-container border border-surface-border shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-pine-100 text-pine-900 flex items-center justify-center font-bold">
                  <PackageOpen className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-pine-950 font-display">
                  Chăm sóc hoặc phụ kiện
                </h3>
                <p className="text-xs text-bark-600 leading-relaxed">
                  Khăn yếm, lược chải lông, khăn ướt hoặc xịt khử mùi, dùng được hằng ngày.
                </p>
              </div>
              <div className="pt-3 border-t border-surface-border text-[11px] text-pine-700 font-semibold">
                ✓ Hữu ích trong đời sống hàng ngày
              </div>
            </div>

            {/* Hạng mục 4: Thiệp cá nhân hóa */}
            <div className="bg-white p-6 rounded-container border border-surface-border shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-pine-950 font-display">
                  Thiệp tên bé
                </h3>
                <p className="text-xs text-bark-600 leading-relaxed">
                  Mỗi hộp kèm thiệp ghi tên bé và danh sách các món trong hộp.
                </p>
              </div>
              <div className="pt-3 border-t border-surface-border text-[11px] text-amber-800 font-semibold">
                ✓ Hộp nào cũng dành riêng cho một bé
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KHỐI 5: BẢN CAM KẾT DANH DỰ (THE 3 NON-NEGOTIABLES) */}
      <section className="py-16 sm:py-24 bg-pine-950 text-pine-100 relative overflow-hidden">
        {/* Họa tiết ánh sáng ấm áp góc nền */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-honey-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pine-800/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-xs font-bold text-honey-400 uppercase tracking-widest block">
              Cam kết
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white font-display">
              3 điều FPETS cam kết
            </h2>
            <p className="text-xs sm:text-sm text-pine-300">
              Những điều bạn có thể kiểm tra ngay trong tài khoản và đơn hàng của mình.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-container bg-pine-900/80 border border-pine-800 space-y-3">
              <div className="text-2xl font-extrabold text-honey-400 font-display">01</div>
              <h3 className="text-base font-bold text-white font-display">
                Đổi món khi lỗi do FPETS
              </h3>
              <p className="text-xs text-pine-300 leading-relaxed">{EXCHANGE_POLICY}</p>
            </div>

            <div className="p-6 rounded-container bg-pine-900/80 border border-pine-800 space-y-3">
              <div className="text-2xl font-extrabold text-honey-400 font-display">02</div>
              <h3 className="text-base font-bold text-white font-display">
                Không tự động trừ tiền
              </h3>
              <p className="text-xs text-pine-300 leading-relaxed">
                Gói định kỳ trả trước, không lưu thẻ và không tự gia hạn. Khi còn hộp cuối, FPETS nhắc bạn trên web để bạn tự quyết định.
              </p>
            </div>

            <div className="p-6 rounded-container bg-pine-900/80 border border-pine-800 space-y-3">
              <div className="text-2xl font-extrabold text-honey-400 font-display">03</div>
              <h3 className="text-base font-bold text-white font-display">
                Tôn trọng hồ sơ của bé
              </h3>
              <p className="text-xs text-pine-300 leading-relaxed">
                Khi chọn món, hệ thống cảnh báo nếu món chứa thành phần bé bị dị ứng theo khai báo, hoặc trùng món đã gửi trước đó.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* KHỐI 6: LỜI MỜI TRẢI NGHIỆM — CTA ẤM ÁP */}
      <section className="py-16 sm:py-20 bg-[#FAF9F5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-honey-100 text-honey-800 mx-auto">
            <HeartHandshake className="w-6 h-6" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-pine-950 font-display tracking-tight">
            Hãy để chiếc hộp tiếp theo mang tên bé yêu của bạn.
          </h2>

          <p className="text-sm sm:text-base text-bark-700 max-w-lg mx-auto leading-relaxed">
            Trả lời {QUIZ_NAME} ({QUIZ_LENGTH}) để FPETS biết bé thích gì và cần tránh gì.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/quiz"
              className="w-full sm:w-auto px-7 py-3.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm transition-colors text-center"
            >
              Làm {QUIZ_NAME}
            </Link>
            <Link
              href="/boxes"
              className="w-full sm:w-auto px-7 py-3.5 rounded-box bg-white hover:bg-surface-muted text-pine-950 border border-surface-border font-bold text-sm transition-colors text-center"
            >
              Xem các loại box
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
