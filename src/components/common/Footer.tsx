"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, MessageCircle } from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";

export default function Footer() {
  const pathname = usePathname();

  // Không hiển thị Footer của khách khi đang ở các trang Admin
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="bg-pine-950 text-pine-100 mt-auto border-t border-pine-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-8">
        {/* KHỐI NỘI DUNG CHÍNH */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* CỘT 1: Logo & Giới thiệu ngắn */}
          <div className="md:col-span-5 space-y-3">
            <BrandLogo variant="dark" size="sm" />
            <p className="text-xs text-pine-300/85 leading-relaxed max-w-sm">
              Mỗi tháng một hộp quà bất ngờ, tuyển chọn riêng theo sở thích và sức khỏe bé cưng. Dịch vụ hộp quà thú cưng cá nhân hóa đầu tiên tại Việt Nam.
            </p>
          </div>

          {/* CỘT 2: Thông tin & Hỗ trợ khách hàng */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-pine-400">
              Thông tin & Hỗ trợ
            </h4>
            <nav className="flex flex-col space-y-2 text-xs text-pine-200">
              <Link href="/about" className="hover:text-white transition-colors">
                Về chúng tôi
              </Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                Liên hệ hợp tác
              </Link>
              <Link href="/order-tracking" className="hover:text-white transition-colors">
                Tra cứu tình trạng đơn hàng
              </Link>
              <Link href="/faq" className="hover:text-white transition-colors">
                FAQ & Trung tâm trợ giúp
              </Link>
              <Link href="/faq#doi-tra" className="hover:text-white transition-colors">
                Chính sách đổi trả trong 3 ngày
              </Link>
            </nav>
          </div>

          {/* CỘT 3: Kênh liên hệ trực tiếp */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-pine-400">
              Chăm sóc khách hàng
            </h4>
            <div className="space-y-2.5 text-xs text-pine-300">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-pine-400 shrink-0" />
                <span>Hotline: <strong className="text-white font-semibold">1900 6868</strong> (8h – 21h)</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-grass-400 shrink-0" />
                <span>Zalo OA: <strong className="text-white font-semibold">FPETS Official</strong></span>
              </div>
              <p className="text-[11px] text-pine-400/80 pt-1 leading-normal">
                Tư vấn thực đơn dinh dưỡng và hộp quà phù hợp cho từng thể trạng cún miu.
              </p>
            </div>
          </div>
        </div>

        {/* DÒNG BẢN QUYỀN CUỐI TRANG */}
        <div className="pt-6 border-t border-pine-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-pine-400">
          <div>
            © 2026 FPETS Vietnam. Dịch vụ hộp quà thú cưng cá nhân hóa đầu tiên tại Việt Nam.
          </div>
          <div className="text-pine-400/70">
            Múi giờ Asia/Ho_Chi_Minh
          </div>
        </div>
      </div>
    </footer>
  );
}
