"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, MessageCircle, ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";

export default function Footer() {
  const pathname = usePathname();

  // Không hiển thị Footer của khách khi đang ở các trang Admin
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="bg-pine-950 text-pine-100 mt-auto border-t border-pine-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* KHỐI NỘI DUNG CHÍNH GỌN GÀNG */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* CỘT 1: Logo & Thông điệp ngắn gọn */}
          <div className="md:col-span-5 space-y-2.5">
            <BrandLogo variant="dark" size="sm" />
            <p className="text-xs text-pine-300/85 leading-relaxed max-w-sm">
              Hộp quà bí ẩn cá nhân hóa đầu tiên tại Việt Nam, tuyển chọn riêng theo sở thích và thể trạng của từng bé cưng.
            </p>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-pine-400">
              <ShieldCheck className="w-3.5 h-3.5 text-grass-400 shrink-0" />
              <span>100% sản phẩm chính hãng & kiểm định thú y an toàn</span>
            </div>
          </div>

          {/* CỘT 2: Thông tin & Trợ giúp (Đã lược bỏ Tra cứu đơn hàng) */}
          <div className="md:col-span-3 space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-pine-400">
              Thông tin & Trợ giúp
            </h4>
            <nav className="flex flex-col space-y-1.5 text-xs text-pine-200">
              <Link href="/about" className="hover:text-white transition-colors">
                Về chúng tôi
              </Link>
              <Link href="/faq" className="hover:text-white transition-colors">
                FAQ & Hướng dẫn mua hàng
              </Link>
              <Link href="/faq#doi-tra" className="hover:text-white transition-colors">
                Chính sách đổi trả trong 3 ngày
              </Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                Liên hệ hợp tác
              </Link>
            </nav>
          </div>

          {/* CỘT 3: Kênh liên hệ nhanh */}
          <div className="md:col-span-4 space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-pine-400">
              Chăm sóc khách hàng
            </h4>
            <div className="space-y-2 text-xs text-pine-300">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-pine-400 shrink-0" />
                <span>Hotline: <strong className="text-white font-semibold">1900 6868</strong> (8h – 21h hàng ngày)</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-grass-400 shrink-0" />
                <span>Zalo OA: <strong className="text-white font-semibold">FPETS Official</strong></span>
              </div>
              <p className="text-[11px] text-pine-400/80 leading-normal">
                Tư vấn thực đơn dinh dưỡng và hộp quà bất ngờ theo từng giống loài.
              </p>
            </div>
          </div>

        </div>

        {/* DÒNG BẢN QUYỀN CUỐI TRANG - TINH GỌN */}
        <div className="mt-6 pt-4 border-t border-pine-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-pine-400">
          <div>
            © 2026 FPETS Vietnam. Dịch vụ hộp quà thú cưng cá nhân hóa hàng đầu.
          </div>
          <div className="text-pine-400/70">
            Giờ làm việc: 08:00 – 21:00 (Asia/Ho_Chi_Minh)
          </div>
        </div>
      </div>
    </footer>
  );
}
