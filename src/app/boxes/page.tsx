"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { BoxType } from "@/mock/boxTypes";
import { fetchBoxTypes } from "@/lib/catalog";
import { formatVND } from "@/lib/formatters";
import { 
  CheckCircle2, 
  Filter, 
  Dog, 
  Cat, 
  ShieldCheck, 
  RefreshCw, 
  Gift, 
  ArrowRight, 
  Star, 
  PackageOpen, 
  Check, 
  HeartHandshake, 
  HelpCircle 
} from "lucide-react";

export default function BoxesPage() {
  const [speciesFilter, setSpeciesFilter] = useState<'all' | 'dog' | 'cat'>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'standard' | 'premium'>('all');
  const [boxes, setBoxes] = useState<BoxType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoxTypes().then((data) => {
      setBoxes(data);
      setLoading(false);
    });
  }, []);

  // Giá thấp nhất của từng phân hạng lấy từ dữ liệu thật để hiển thị trên bộ lọc / bảng so sánh
  const minPriceOf = (tier: 'tieu-chuan' | 'premium') => {
    const prices = boxes.filter((b) => b.slug.includes(tier)).map((b) => b.basePrice);
    return prices.length > 0 ? Math.min(...prices) : null;
  };
  const standardPrice = minPriceOf('tieu-chuan');
  const premiumPrice = minPriceOf('premium');

  const filteredBoxes = boxes.filter((box) => {
    // Lọc theo loài
    if (speciesFilter !== 'all' && box.species !== speciesFilter) {
      return false;
    }
    // Lọc theo phân hạng (Tiêu chuẩn / Premium dựa trên slug hoặc giá)
    if (tierFilter === 'standard' && !box.slug.includes('tieu-chuan')) {
      return false;
    }
    if (tierFilter === 'premium' && !box.slug.includes('premium')) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-bark-900 pb-16 sm:pb-24">
      {/* 1. HERO BANNER: THIẾT KẾ EDITORIAL ẤM ÁP, SANG TRỌNG */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F6F4EE] via-[#FAF9F6] to-[#FAF8F5] border-b border-surface-border/80 pt-10 pb-12 sm:pt-14 sm:pb-16">
        {/* Quầng sáng mờ tạo chiều sâu */}
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-honey-200/30 blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-80 h-80 rounded-full bg-pine-100/40 blur-[80px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pine-50 border border-pine-200/80 text-pine-900 text-xs font-semibold">
            <Gift className="w-3.5 h-3.5 text-pine-800" />
            <span>Bộ sưu tập Mystery Box tuyển chọn riêng</span>
          </div>

          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-pine-950 font-display tracking-tight leading-[1.12]">
              Hộp quà bất ngờ được may đo theo đúng thể trạng của từng bé cưng.
            </h1>
            <p className="text-base sm:text-lg text-bark-700 leading-relaxed font-normal">
              Không đóng sẵn hàng loạt. Mỗi chiếc hộp là sự kết hợp cân đối giữa thực phẩm dinh dưỡng lành tính, đồ chơi dai bền kích thích phản xạ và vật dụng chăm sóc phù hợp kích cỡ khung hàm của bé.
            </p>
          </div>

          {/* Dải 4 cam kết chất lượng dạng thẻ nhãn tinh tế */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
            <div className="flex items-center gap-2 p-2.5 sm:px-3 sm:py-2 rounded-xl bg-white border border-surface-border/80 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-grass-600 shrink-0" />
              <span className="font-semibold text-bark-800 text-[11px] sm:text-xs">Loại trừ món dị ứng</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 sm:px-3 sm:py-2 rounded-xl bg-white border border-surface-border/80 shadow-2xs">
              <RefreshCw className="w-4 h-4 text-pine-700 shrink-0" />
              <span className="font-semibold text-bark-800 text-[11px] sm:text-xs">Đổi món nếu lỗi do shop</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 sm:px-3 sm:py-2 rounded-xl bg-white border border-surface-border/80 shadow-2xs">
              <PackageOpen className="w-4 h-4 text-honey-600 shrink-0" />
              <span className="font-semibold text-bark-800 text-[11px] sm:text-xs">Đóng gói thủ công tỉ mỉ</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 sm:px-3 sm:py-2 rounded-xl bg-white border border-surface-border/80 shadow-2xs">
              <HeartHandshake className="w-4 h-4 text-pine-800 shrink-0" />
              <span className="font-semibold text-bark-800 text-[11px] sm:text-xs">Theo thể trạng & dị ứng</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. KHU VỰC BỘ LỌC & DANH SÁCH HỘP */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 space-y-8">
        {/* THANH ĐIỀU HƯỚNG BỘ LỌC HIỆN ĐẠI */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          {/* Lọc theo loài */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-bark-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Dành cho:
            </span>
            <button
              onClick={() => setSpeciesFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                speciesFilter === 'all'
                  ? 'bg-pine-900 text-white shadow-xs'
                  : 'bg-white hover:bg-surface-muted text-bark-700 border border-surface-border'
              }`}
            >
              Tất cả các bé ({boxes.length})
            </button>
            <button
              onClick={() => setSpeciesFilter('dog')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                speciesFilter === 'dog'
                  ? 'bg-pine-900 text-white shadow-xs'
                  : 'bg-white hover:bg-surface-muted text-bark-700 border border-surface-border'
              }`}
            >
              <Dog className="w-3.5 h-3.5" />
              <span>Cún cưng ({boxes.filter(b => b.species === 'dog').length})</span>
            </button>
            <button
              onClick={() => setSpeciesFilter('cat')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                speciesFilter === 'cat'
                  ? 'bg-pine-900 text-white shadow-xs'
                  : 'bg-white hover:bg-surface-muted text-bark-700 border border-surface-border'
              }`}
            >
              <Cat className="w-3.5 h-3.5" />
              <span>Mèo yêu ({boxes.filter(b => b.species === 'cat').length})</span>
            </button>
          </div>

          {/* Lọc theo phân hạng Tiêu chuẩn vs Premium */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-surface-border self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setTierFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tierFilter === 'all'
                  ? 'bg-pine-100 text-pine-950 font-extrabold'
                  : 'text-bark-600 hover:text-pine-900'
              }`}
            >
              Mọi phân hạng
            </button>
            <button
              onClick={() => setTierFilter('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tierFilter === 'standard'
                  ? 'bg-pine-900 text-white shadow-xs'
                  : 'text-bark-600 hover:text-pine-900'
              }`}
            >
              Box Tiêu Chuẩn{standardPrice ? ` (${formatVND(standardPrice)})` : ""}
            </button>
            <button
              onClick={() => setTierFilter('premium')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tierFilter === 'premium'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-bark-600 hover:text-pine-900'
              }`}
            >
              Box Premium{premiumPrice ? ` (${formatVND(premiumPrice)})` : ""}
            </button>
          </div>
        </div>

        {/* LƯỚI THẺ SẢN PHẨM MYSTERY BOX NÂNG CẤP */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[520px] rounded-2xl bg-surface-muted animate-pulse" />
            ))}
          </div>
        )}
        {!loading && filteredBoxes.length === 0 && (
          <div className="p-10 text-center rounded-2xl bg-white border border-surface-border text-sm text-bark-600">
            Chưa có loại box nào phù hợp bộ lọc này.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredBoxes.map((box) => {
            const isPremium = box.slug.includes('premium');
            const savingsAmount = Math.max(0, box.minRetailValue - box.basePrice);
            const savingsPercent = box.minRetailValue > 0 ? Math.round((savingsAmount / box.minRetailValue) * 100) : 0;

            return (
              <div
                key={box.id}
                className={`rounded-2xl bg-white border transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1 hover:shadow-lg ${
                  isPremium
                    ? 'border-amber-200/90 ring-1 ring-amber-400/20 shadow-xs'
                    : 'border-surface-border shadow-xs hover:border-pine-800'
                }`}
              >
                {/* PHẦN TRÊN: ẢNH VÀ THÔNG TIN CHI TIẾT */}
                <div>
                  {/* Khung ảnh đại diện */}
                  <div className="relative w-full aspect-[16/10] overflow-hidden bg-surface-muted">
                    <Image
                      src={box.imageUrl}
                      alt={box.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />

                    {/* Gradient phủ nhẹ để nổi bật chữ */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

                    {/* Huy hiệu phân hạng góc trên bên trái */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                      {isPremium ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 text-white text-[11px] font-extrabold shadow-sm tracking-wide">
                          <Star className="w-3 h-3 fill-white" />
                          <span>Hộp Premium</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-pine-900/95 text-white text-[11px] font-bold shadow-sm">
                          <PackageOpen className="w-3 h-3 text-pine-200" />
                          <span>Hộp Tiêu Chuẩn</span>
                        </span>
                      )}
                    </div>

                    {/* Số lượng món góc trên bên phải */}
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs text-pine-950 text-[11px] font-bold shadow-xs z-10">
                      {box.itemCount}
                    </span>

                    {/* Khung kích cỡ & cân nặng góc dưới ảnh */}
                    <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium">
                        {box.sizeLabel}
                      </span>
                    </div>
                  </div>

                  {/* Chi tiết nội dung Box */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-pine-800 flex items-center gap-1">
                          {box.species === 'dog' ? <Dog className="w-3.5 h-3.5" /> : <Cat className="w-3.5 h-3.5" />}
                          {box.species === 'dog' ? 'Dành cho Chó' : 'Dành cho Mèo'}
                        </span>
                        <span className="text-[11px] font-semibold text-grass-700 bg-grass-50 px-2 py-0.5 rounded-md border border-grass-200/60">
                          Tiết kiệm {formatVND(savingsAmount)}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-extrabold text-pine-950 font-display group-hover:text-pine-800 transition-colors">
                        {box.name}
                      </h3>
                    </div>

                    <p className="text-xs sm:text-sm text-bark-600 line-clamp-2 leading-relaxed">
                      {box.description}
                    </p>

                    {/* Danh sách các món tiêu biểu kỳ này */}
                    <div className="pt-3 border-t border-surface-border/80 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-bark-500">
                        Món tiêu biểu bên trong:
                      </div>
                      <ul className="space-y-1.5 text-xs text-bark-700">
                        {box.typicalItems.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-grass-600 shrink-0" />
                            <span className="truncate">{item}</span>
                          </li>
                        ))}
                        {box.typicalItems.length > 3 && (
                          <li className="text-[11px] text-bark-500 italic pl-5.5">
                            + cùng {box.typicalItems.length - 3} món và phụ kiện tuyển chọn khác
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* PHẦN DƯỚI: KHỐI GIÁ & NÚT HÀNH ĐỘNG */}
                <div className="p-5 sm:p-6 pt-4 bg-[#FAF9F6] border-t border-surface-border/90 space-y-3.5">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-[11px] text-bark-500 block">Giá trải nghiệm 1 hộp:</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-pine-950 font-display">
                          {formatVND(box.basePrice)}
                        </span>
                        <span className="text-xs text-bark-500 font-normal">/ hộp</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-bark-500 block">Trị giá sản phẩm:</span>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs font-bold text-bark-500 line-through">
                          {formatVND(box.minRetailValue)}
                        </span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-grass-100 text-grass-800">
                          -{savingsPercent}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/boxes/${box.slug}`}
                    className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-center text-xs font-bold shadow-xs transition-all ${
                      isPremium
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-pine-900 hover:bg-pine-800 text-white'
                    }`}
                  >
                    <span>Xem chi tiết & Đặt Box</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="text-center">
                    <span className="text-[11px] text-bark-500 flex items-center justify-center gap-1">
                      <Check className="w-3 h-3 text-grass-600 stroke-[2.5]" />
                      Đổi món miễn phí nếu bé dị ứng
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. BẢNG SO SÁNH NHANH TIÊU CHUẨN VS PREMIUM */}
        <section className="pt-10">
          <div className="bg-white rounded-2xl border border-surface-border/90 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-pine-950 font-display">
                Nên chọn Hộp Tiêu Chuẩn hay Hộp Premium?
              </h2>
              <p className="text-xs sm:text-sm text-bark-600">
                Cả 2 phiên bản đều được cá nhân hóa 100% theo hồ sơ của bé, khác biệt chủ yếu ở phân hạng nguyên liệu và độ đặc biệt của quà tặng.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Tiêu chuẩn */}
              <div className="p-5 rounded-xl bg-surface-muted/60 border border-surface-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-pine-950 text-base">Box Tiêu Chuẩn</h3>
                  {standardPrice && <span className="text-xs font-bold text-pine-900">Từ {formatVND(standardPrice)} / hộp</span>}
                </div>
                <p className="text-xs text-bark-600">
                  Phù hợp cho bé làm quen với dịch vụ, gia đình muốn bổ sung đều đặn bánh thưởng và đồ chơi mỗi tháng với chi phí tiết kiệm nhất.
                </p>
                <ul className="space-y-2 text-xs text-bark-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-grass-600 stroke-[2.5]" />
                    <span><strong>4 – 5 món</strong> tuyển chọn thiết yếu</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-grass-600 stroke-[2.5]" />
                    <span>Snack thịt sấy, bánh quy sạch răng, đồ chơi cơ bản dai bền</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-grass-600 stroke-[2.5]" />
                    <span>Đổi món miễn phí nếu bé dị ứng</span>
                  </li>
                </ul>
              </div>

              {/* Premium */}
              <div className="p-5 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-4 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-pine-950 text-base">Box Premium</h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold">Đặc biệt</span>
                  </div>
                  {premiumPrice && <span className="text-xs font-bold text-amber-900">Từ {formatVND(premiumPrice)} / hộp</span>}
                </div>
                <p className="text-xs text-bark-600">
                  Dành cho ba mẹ muốn dành tặng bé trải nghiệm hoàng gia: thực phẩm nhập khẩu hảo hạng, đồ chơi kích thích trí tuệ và phụ kiện độc quyền.
                </p>
                <ul className="space-y-2 text-xs text-bark-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
                    <span><strong>6 – 7 món</strong> cao cấp thượng hạng</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
                    <span>Thịt bò Úc sấy thăng hoa, đồ chơi giấu mồi IQ, thảm cào cao cấp</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
                    <span>Tặng quà sinh nhật khi đăng ký gói 6 hộp</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 4. BANNER TRỢ GIÚP PET QUIZ GỌN GÀNG */}
        <div className="p-6 sm:p-8 rounded-2xl bg-pine-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-bold font-display">
              Bạn vẫn chưa chắc bé thích hợp với loại hộp nào nhất?
            </h3>
            <p className="text-xs sm:text-sm text-pine-200 max-w-xl">
              Chỉ mất 2 phút trả lời trắc nghiệm nhanh về độ tuổi, cân nặng và sở thích gặm/ăn của bé. Hệ thống sẽ tính toán khẩu phần tối ưu nhất cho bạn.
            </p>
          </div>
          <Link
            href="/quiz"
            className="px-6 py-3 rounded-xl bg-white hover:bg-pine-50 text-pine-950 font-bold text-xs shrink-0 transition-all shadow-sm"
          >
            Làm Pet Quiz ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
