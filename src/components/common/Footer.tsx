"use client";

import React from "react";
import Link from "next/link";
import { Phone, MessageCircle, Heart, ShieldCheck, Truck, RefreshCw, PawPrint } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-pine-950 text-pine-100 mt-auto border-t border-pine-900">
      {/* 3 Cam kết thương hiệu: Thiết kế dạng danh sách tinh gọn với icon nhỏ liền kề chữ */}
      <div className="border-b border-pine-900/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 md:divide-x md:divide-pine-800/60">
          <div className="md:pr-6 space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-pine-300 shrink-0" />
              <h4 className="text-sm font-bold text-white">Tuyển chọn theo Pet Profile</h4>
            </div>
            <p className="text-xs text-pine-300/80 leading-relaxed pl-6 md:pl-0">
              Loại trừ hoàn toàn thành phần dị ứng đã khai báo. Đổi món miễn phí nếu lỗi thuộc về shop.
            </p>
          </div>

          <div className="md:px-6 space-y-1">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-pine-300 shrink-0" />
              <h4 className="text-sm font-bold text-white">Giao định kỳ đúng hẹn</h4>
            </div>
            <p className="text-xs text-pine-300/80 leading-relaxed pl-6 md:pl-0">
              Đợt giao đầu tháng hoặc giữa tháng. Gói 3 và 6 hộp được miễn phí giao hàng toàn quốc.
            </p>
          </div>

          <div className="md:pl-6 space-y-1">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-pine-300 shrink-0" />
              <h4 className="text-sm font-bold text-white">Không tự động trừ tiền</h4>
            </div>
            <p className="text-xs text-pine-300/80 leading-relaxed pl-6 md:pl-0">
              Khách trả trước theo gói, hệ thống nhắc gia hạn chủ động. Tạm dừng hoặc hủy bất kỳ lúc nào.
            </p>
          </div>
        </div>
      </div>

      {/* Thông tin chân trang */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PawPrint className="w-5 h-5 text-pine-300" />
            <span className="font-extrabold text-lg text-white font-display">FPETS</span>
          </div>
          <p className="text-xs text-pine-300 leading-relaxed mb-4">
            Dịch vụ Mystery Box cá nhân hóa đầu tiên tại Việt Nam, mang đến trải nghiệm mở hộp bất ngờ và niềm vui mỗi tháng cho bé cưng của bạn.
          </p>
          <div className="flex items-center gap-2 text-xs text-pine-200">
            <Heart className="w-3.5 h-3.5 text-pine-300 fill-pine-300" />
            <span>Tận tâm vì sức khỏe thú cưng</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-white mb-3">Khám phá</h4>
          <ul className="space-y-2 text-xs text-pine-300">
            <li>
              <Link href="/boxes" className="hover:text-white transition-colors">
                Các loại Mystery Box
              </Link>
            </li>
            <li>
              <Link href="/shop" className="hover:text-white transition-colors">
                Cửa hàng đồ ăn & phụ kiện lẻ
              </Link>
            </li>
            <li>
              <Link href="/quiz" className="hover:text-white transition-colors">
                Pet Quiz gợi ý hộp 2 phút
              </Link>
            </li>
            <li>
              <Link href="/order-tracking" className="hover:text-white transition-colors">
                Tra cứu đơn hàng vãng lai
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-white mb-3">Chính sách & Hỗ trợ</h4>
          <ul className="space-y-2 text-xs text-pine-300">
            <li>
              <Link href="/faq" className="hover:text-white transition-colors">
                Câu hỏi thường gặp (FAQ)
              </Link>
            </li>
            <li>
              <span className="text-pine-400">Chính sách đổi trả trong 3 ngày</span>
            </li>
            <li>
              <span className="text-pine-400">Chính sách tạm dừng & hủy gói</span>
            </li>
            <li>
              <span className="text-pine-400">Biểu phí giao hàng toàn quốc</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-white mb-3">Kênh liên hệ nhanh</h4>
          <div className="space-y-2.5 text-xs text-pine-200">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-pine-300" />
              <span>Hotline: 1900 6868 (8:00 – 21:00)</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-grass-600" />
              <span>Zalo OA: FPETS Official</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-pine-900 text-[11px] text-pine-400">
            Giao diện tiếng Việt · Tiền tệ VND · Múi giờ Asia/Ho_Chi_Minh
          </div>
        </div>
      </div>

      <div className="bg-black/30 py-3 text-center text-[11px] text-pine-400 border-t border-pine-900/50">
        © 2026 FPETS Vietnam. Bản quyền thuộc về FPETS. Thiết kế dành riêng cho người nuôi thú cưng tại Việt Nam.
      </div>
    </footer>
  );
}
