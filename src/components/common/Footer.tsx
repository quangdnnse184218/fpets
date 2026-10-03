"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { CONTACT_INFO } from "@/lib/contactInfo";
import BrandLogo from "@/components/common/BrandLogo";
import { useApp } from "@/context/AppContext";

const PAYMENT_METHODS = ["MoMo", "VNPay", "COD"];

export default function Footer() {
  const pathname = usePathname();
  const { isLoggedIn } = useApp();

  // Không hiển thị Footer của khách khi đang ở các trang Admin
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    // pb-20 trên mobile: chừa chỗ cho thanh điều hướng cố định ở đáy màn hình
    <footer className="bg-pine-950 text-pine-100 mt-auto border-t border-pine-900 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Logo & mô tả ngắn */}
          <div className="lg:col-span-4 space-y-2.5">
            <BrandLogo variant="dark" size="md" />
            <p className="text-xs text-pine-300/85 leading-relaxed max-w-sm">
              Mystery Box cho chó mèo: đồ ăn, đồ chơi và phụ kiện hợp với cân nặng, độ tuổi và dị ứng của từng bé. Mua thử 1 hộp hoặc đăng ký nhận hằng tháng.
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {PAYMENT_METHODS.map((m) => (
                <span key={m} className="px-2 py-0.5 rounded-tag bg-pine-900 border border-pine-800 text-[11px] font-bold text-pine-200">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Mua hàng */}
          <div className="lg:col-span-2 space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-pine-400">Mua hàng</h4>
            <nav className="flex flex-col space-y-1.5 text-xs text-pine-200">
              <Link href="/boxes" className="hover:text-white transition-colors">Mystery Box</Link>
              <Link href="/subscription" className="hover:text-white transition-colors">Gói định kỳ</Link>
              <Link href="/shop" className="hover:text-white transition-colors">Cửa hàng</Link>
              {/* Đã đăng nhập thì xem đơn trong tài khoản, không cần tra cứu bằng mã */}
              {isLoggedIn ? (
                <Link href="/my-account/orders" className="hover:text-white transition-colors">Đơn hàng của tôi</Link>
              ) : (
                <Link href="/order-tracking" className="hover:text-white transition-colors">Tra cứu đơn hàng</Link>
              )}
            </nav>
          </div>

          {/* Hỗ trợ & chính sách */}
          <div className="lg:col-span-3 space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-pine-400">Hỗ trợ</h4>
            <nav className="flex flex-col space-y-1.5 text-xs text-pine-200">
              <Link href="/faq" className="hover:text-white transition-colors">Câu hỏi thường gặp</Link>
              <Link href="/return-policy" className="hover:text-white transition-colors">Chính sách đổi trả</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Điều khoản dịch vụ</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Chính sách bảo mật</Link>
              <Link href="/about" className="hover:text-white transition-colors">Về FPETS</Link>
            </nav>
          </div>

          {/* Liên hệ */}
          <div className="lg:col-span-3 space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-pine-400">Liên hệ</h4>
            <div className="space-y-2 text-xs text-pine-300">
              <div className="flex items-start gap-2">
                <Phone className="w-3.5 h-3.5 text-pine-400 shrink-0 mt-0.5" />
                <span>
                  <a href={`tel:${CONTACT_INFO.hotlineTel}`} className="text-white font-semibold hover:underline">{CONTACT_INFO.hotline}</a>
                  {" "}({CONTACT_INFO.hours} hằng ngày)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 text-pine-400 shrink-0 mt-0.5" />
                <a href={`mailto:${CONTACT_INFO.email}`} className="text-white hover:underline">{CONTACT_INFO.email}</a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-pine-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{CONTACT_INFO.address}</span>
              </div>
              {(CONTACT_INFO.zaloUrl || CONTACT_INFO.messengerUrl) && (
                <div className="flex items-center gap-2 pt-1">
                  <MessageCircle className="w-3.5 h-3.5 text-grass-400 shrink-0" />
                  {CONTACT_INFO.zaloUrl && (
                    <a href={CONTACT_INFO.zaloUrl} target="_blank" rel="noopener noreferrer" className="text-white font-semibold hover:underline">Zalo</a>
                  )}
                  {CONTACT_INFO.messengerUrl && (
                    <a href={CONTACT_INFO.messengerUrl} target="_blank" rel="noopener noreferrer" className="text-white font-semibold hover:underline">Messenger</a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-pine-900/80 text-xs text-pine-400">
          © {new Date().getFullYear()} FPETS. Mystery Box cho chó mèo.
        </div>
      </div>
    </footer>
  );
}
