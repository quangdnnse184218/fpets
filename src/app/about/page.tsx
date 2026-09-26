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
  Sparkle,
  Compass,
  UtensilsCrossed,
  Bone,
  Mail,
  Award,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";

export const metadata = {
  title: "Về FPETS – Câu chuyện, Sứ mệnh & Cam kết bảo vệ bé cưng",
  description: "Khám phá câu chuyện đằng sau FPETS: Dịch vụ Mystery Box định kỳ đầu tiên tại Việt Nam, mang đến niềm vui bất ngờ và thực đơn an toàn tuyệt đối cho từng bé cún, bé miu.",
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
                Chúng tôi lập nên FPETS không phải để mở thêm một cửa hàng bán đồ thú cưng thông thường.
                FPETS ra đời để giải phóng ba mẹ thú cưng khỏi những băn khoăn khi đi pet shop, mang lại
                trải nghiệm đập hộp đầy háo hức mỗi tháng với những món đồ ăn thơm lành và đồ chơi được chọn lọc
                riêng cho thể trạng của từng bé.
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
                    Kiểm định dinh dưỡng
                  </div>
                  <p className="text-[11px] text-bark-600 leading-snug">
                    Thức ăn minh bạch nguồn gốc, hạn chế độn bột và phụ gia gây hại.
                  </p>
                </div>

                <div className="p-3.5 rounded-box bg-white border border-surface-border/90 shadow-2xs">
                  <div className="text-xs font-bold text-pine-950 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pine-700" />
                    Bất ngờ & Tiết kiệm
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
                      alt="Khoảnh khắc hai chú cún cưng vui mừng khi nhận được hộp quà FPETS"
                      fill
                      sizes="(max-width: 768px) 100vw, 40vw"
                      className="object-cover"
                      priority
                    />
                  </div>

                  {/* Chú thích ảnh phong cách tạp chí */}
                  <div className="p-3 text-left">
                    <div className="flex items-center justify-between text-[11px] text-bark-500 pb-1">
                      <span>Bơ & Đậu Phộng • Hà Nội</span>
                      <span className="font-mono text-[10px] text-pine-800 font-semibold">FPET-STORY #048</span>
                    </div>
                    <p className="text-xs font-medium text-bark-800 italic">
                      &ldquo;Cứ thấy shipper bấm chuông là Bơ nhảy cẫng lên vì biết hộp quà tháng mới đã tới!&rdquo;
                    </p>
                  </div>
                </div>

                {/* Huy hiệu con dấu mộc đè góc (Stamp) */}
                <div className="absolute -bottom-4 -left-4 sm:-bottom-5 sm:-left-5 bg-pine-950 text-pine-100 p-4 rounded-2xl border-2 border-honey-400 shadow-xl max-w-[190px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-honey-400">Cam kết vàng</div>
                  <div className="text-xs font-bold leading-tight mt-0.5 text-white">
                    Tránh 100% thành phần dị ứng đã khai báo
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
                Đó chính là trải nghiệm của nhóm sáng lập FPETS vào năm 2026. Chúng tôi nuôi cún và mèo, và tháng nào cũng lặp lại kịch bản: chạy ra cửa hàng thú cưng, nhìn hàng trăm gói snack ngoại ngữ không rõ chất lượng, mua một món đồ chơi đắt đỏ rồi mang về nhà... bé ngửi một lần rồi bỏ xó.
              </p>
              <p>
                Tệ hơn nữa, có những lần cho bé ăn thử bánh thưởng lạ, bé bị dị ứng nổi mẩn ngứa khắp bụng và phải đi khám thú y tốn cả triệu đồng.
              </p>
              <blockquote className="p-4 rounded-box bg-[#FAF8F5] border-l-4 border-pine-800 text-sm italic text-pine-950 font-medium my-4">
                &ldquo;Tại sao không có một dịch vụ hiểu rõ bé cưng của mình: biết bé nặng bao nhiêu cân để chọn đồ chơi vừa miệng, biết bé dị ứng gà để tuyệt đối không gửi đồ gà, và mỗi tháng đem đến một sự háo hức mới?&rdquo;
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
                    Khai báo hồ sơ 1 lần duy nhất qua Pet Quiz. Mỗi tháng nhận kiện quà tận cửa: đồ ăn thơm ngon đã sàng lọc dị ứng, đồ chơi dai bền đúng size hàm răng, kèm thiệp chúc mừng riêng mang tên bé.
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
              Không độn hàng tồn, không nhét đồ kém chất lượng. Mỗi chiếc hộp đều được cân đối 4 thành phần thiết yếu cho niềm vui và sức khỏe của bé.
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
                  02 Món Dinh Dưỡng Cao Cấp
                </h3>
                <p className="text-xs text-bark-600 leading-relaxed">
                  Thịt sấy thăng hoa (freeze-dried), pate giàu đạm hoặc bánh thưởng giòn răng sạch mảng bám. Tuyệt đối loại bỏ thành phần dị ứng của bé.
                </p>
              </div>
              <div className="pt-3 border-t border-surface-border text-[11px] text-grass-700 font-semibold">
                ✓ 100% thương hiệu chính ngạch có kiểm định
              </div>
            </div>

            {/* Hạng mục 2: Đồ chơi bền bỉ */}
            <div className="bg-white p-6 rounded-container border border-surface-border shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-honey-100 text-honey-800 flex items-center justify-center font-bold">
                  <Bone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-pine-950 font-display">
                  01 - 02 Đồ Chơi Tuyển Chọn
                </h3>
                <p className="text-xs text-bark-600 leading-relaxed">
                  Dây thừng kéo co, bóng nảy cao su đúc tự nhiên, hoặc đồ chơi nhồi cỏ Catnip hữu cơ. Chọn đúng cỡ miệng để tránh nguy cơ nuốt phải.
                </p>
              </div>
              <div className="pt-3 border-t border-surface-border text-[11px] text-honey-700 font-semibold">
                ✓ Thử nghiệm độ dai bền trước khi gửi
              </div>
            </div>

            {/* Hạng mục 3: Phụ kiện hữu ích */}
            <div className="bg-white p-6 rounded-container border border-surface-border shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-pine-100 text-pine-900 flex items-center justify-center font-bold">
                  <PackageOpen className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-pine-950 font-display">
                  01 Phụ Kiện Chăm Sóc
                </h3>
                <p className="text-xs text-bark-600 leading-relaxed">
                  Khăn bandana thời trang theo mùa, bàn chải ngón tay làm sạch răng, lược gỡ lông hoặc túi đựng phân tự phân hủy bảo vệ môi trường.
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
                  Thiệp Riêng & Thực Đơn
                </h3>
                <p className="text-xs text-bark-600 leading-relaxed">
                  Mỗi hộp gửi đi đều có thiệp in trang trọng tên bé cưng, kèm bảng hướng dẫn chia khẩu phần dinh dưỡng và ghi chú thú vị cho tháng đó.
                </p>
              </div>
              <div className="pt-3 border-t border-surface-border text-[11px] text-amber-800 font-semibold">
                ✓ Cảm giác mở quà độc bản
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KHỐI 4: ĐỘI NGŨ THẬT — NHỮNG "ĐỒNG NGHIỆP 4 CHÂN" VÀ CHUYÊN VIÊN */}
      <section className="py-16 sm:py-24 bg-surface-card border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-xs font-bold text-honey-600 uppercase tracking-widest block mb-2">
                Con người & Bạn đồng hành
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-pine-950 font-display">
                Đằng sau mỗi chiếc hộp được gửi đi
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-bark-600 max-w-sm">
              Không có dây chuyền công nghiệp vô cảm. Từng hộp quà đều qua tay những người yêu động vật thực sự và được nếm thử bởi các bạn 4 chân khó tính.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Thành viên 1: Bác sĩ thú y */}
            <div className="p-6 rounded-container bg-[#FAF9F5] border border-surface-border space-y-4">
              <div className="relative aspect-[4/3] rounded-box overflow-hidden bg-surface-muted">
                <Image
                  src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800&q=80"
                  alt="Bác sĩ thú y thẩm định thực đơn dinh dưỡng"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div>
                <div className="text-xs font-bold text-pine-800">Hội đồng Cố vấn Dinh Dưỡng</div>
                <h3 className="text-lg font-bold text-pine-950 font-display">Bác sĩ Thú y & Chuyên viên</h3>
              </div>
              <p className="text-xs text-bark-600 leading-relaxed">
                Rà soát thành phần dinh dưỡng của mọi lô hàng nhập khẩu, phân loại nhóm dị ứng và lập quy chuẩn thức ăn theo từng giai đoạn phát triển của cún mèo.
              </p>
            </div>

            {/* Thành viên 2: Cún Bơ Corgi - Chief Tester */}
            <div className="p-6 rounded-container bg-[#FAF9F5] border border-surface-border space-y-4">
              <div className="relative aspect-[4/3] rounded-box overflow-hidden bg-surface-muted">
                <Image
                  src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80"
                  alt="Chú cún Corgi kiểm duyệt độ dai của đồ chơi"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div>
                <div className="text-xs font-bold text-honey-600">Đồng nghiệp 4 chân</div>
                <h3 className="text-lg font-bold text-pine-950 font-display">Bơ Corgi • Trưởng ban Test Đồ Chơi</h3>
              </div>
              <p className="text-xs text-bark-600 leading-relaxed">
                Chuyên gia kiểm tra lực cắn và độ bền bóng cao su. Nếu một món đồ chơi không vượt qua được 3 ngày gặm nhiệt tình của Bơ, món đó sẽ bị loại.
              </p>
            </div>

            {/* Thành viên 3: Miu Miu - Taste Director */}
            <div className="p-6 rounded-container bg-[#FAF9F5] border border-surface-border space-y-4">
              <div className="relative aspect-[4/3] rounded-box overflow-hidden bg-surface-muted">
                <Image
                  src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80"
                  alt="Bé mèo mun sành ăn kiểm định Pate"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div>
                <div className="text-xs font-bold text-grass-700">Đồng nghiệp 4 chân</div>
                <h3 className="text-lg font-bold text-pine-950 font-display">Miu Miu • Giám đốc Thẩm định Pate</h3>
              </div>
              <p className="text-xs text-bark-600 leading-relaxed">
                Đại diện cho cộng đồng mèo sành ăn và khó tính. Miu chỉ gật đầu với các loại pate cá hồi, gà xé không chất tạo mùi nhân tạo.
              </p>
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
              Bản tuyên ngôn danh dự
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white font-display">
              3 Nguyên Tắc Bất Di Bất Dịch Tại FPETS
            </h2>
            <p className="text-xs sm:text-sm text-pine-300">
              Niềm tin của ba mẹ là tài sản lớn nhất. Chúng tôi cam kết bằng uy tín của cả thương hiệu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-container bg-pine-900/80 border border-pine-800 space-y-3">
              <div className="text-2xl font-extrabold text-honey-400 font-display">01</div>
              <h3 className="text-base font-bold text-white font-display">
                Đổi món miễn phí trong 3 ngày
              </h3>
              <p className="text-xs text-pine-300 leading-relaxed">
                Món chứa thành phần dị ứng đã khai báo, hàng hỏng/hết hạn hoặc giao thiếu: báo FPETS trong 3 ngày kèm ảnh mở hộp, chúng tôi đổi hoặc gửi bù miễn phí. Món bé không thích sẽ được ghi nhận để hộp sau tránh.
              </p>
            </div>

            <div className="p-6 rounded-container bg-pine-900/80 border border-pine-800 space-y-3">
              <div className="text-2xl font-extrabold text-honey-400 font-display">02</div>
              <h3 className="text-base font-bold text-white font-display">
                Minh bạch không tự trừ thẻ
              </h3>
              <p className="text-xs text-pine-300 leading-relaxed">
                Không có hợp đồng trói buộc hay tự động quẹt thẻ tín dụng lúc nửa đêm. Mọi kỳ giao đều có thông báo trước 7 ngày để bạn chủ động xác nhận hoặc tạm dừng.
              </p>
            </div>

            <div className="p-6 rounded-container bg-pine-900/80 border border-pine-800 space-y-3">
              <div className="text-2xl font-extrabold text-honey-400 font-display">03</div>
              <h3 className="text-base font-bold text-white font-display">
                Bảo vệ sức khỏe là trên hết
              </h3>
              <p className="text-xs text-pine-300 leading-relaxed">
                Nếu hồ sơ bé ghi dị ứng Thịt Bò, chiếc hộp sẽ được dán nhãn kiểm soát đỏ để người đóng gói không thể đưa nhầm bất kỳ sản phẩm nào liên quan đến bò.
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
            Chỉ mất 2 phút hoàn thành Pet Quiz để chúng tôi bắt đầu nghiên cứu khẩu phần và cá tính riêng của bé.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/quiz"
              className="w-full sm:w-auto px-7 py-3.5 rounded-box bg-pine-900 hover:bg-pine-800 text-white font-bold text-sm shadow-sm transition-colors text-center"
            >
              Làm Quiz tìm Box cho bé
            </Link>
            <Link
              href="/boxes"
              className="w-full sm:w-auto px-7 py-3.5 rounded-box bg-white hover:bg-surface-muted text-pine-950 border border-surface-border font-bold text-sm transition-colors text-center"
            >
              Khám phá các loại Mystery Box
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
