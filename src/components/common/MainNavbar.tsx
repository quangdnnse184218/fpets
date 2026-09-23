"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { ShoppingCart, Sparkles, User, Package, Search, Menu, X, Compass, PawPrint } from "lucide-react";

export default function MainNavbar() {
  const pathname = usePathname();
  const { cart, isLoggedIn } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navLinks = [
    { href: "/boxes", label: "Mystery Box" },
    { href: "/shop", label: "Shop bán lẻ" },
    { href: "/quiz", label: "Pet Quiz", badge: "Gợi ý box" },
    { href: "/order-tracking", label: "Tra cứu đơn" },
  ];

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-surface-card border-b border-surface-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo Thương hiệu */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-box bg-pine-900 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-pine-800 transition-colors">
            <PawPrint className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-pine-950 font-display">
              FPETS
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium text-bark-500 bg-surface-muted px-2 py-0.5 rounded-tag">
              Mystery Box Thú Cưng
            </span>
          </div>
        </Link>

        {/* Menu Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-2 text-sm font-medium rounded-box transition-colors ${
                  active
                    ? "text-pine-950 bg-pine-50 font-semibold"
                    : "text-bark-700 hover:text-pine-900 hover:bg-surface-muted"
                }`}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="ml-1.5 inline-flex items-center px-1.5 py-0.2 text-[11px] font-semibold rounded-tag bg-pine-100 text-pine-800 border border-pine-200">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Cụm hành động bên phải */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* CTA Pet Quiz trên desktop */}
          <Link
            href="/quiz"
            className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-box bg-pine-900 hover:bg-pine-800 text-white shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-pine-200" />
            <span>Làm Quiz tìm Box</span>
          </Link>

          {/* Nút tài khoản */}
          <Link
            href="/my-account/pets"
            className={`p-2 rounded-box text-bark-700 hover:bg-surface-muted transition-colors ${
              pathname.startsWith("/my-account") ? "bg-pine-50 text-pine-950" : ""
            }`}
            title="Tài khoản của tôi"
          >
            <User className="w-5 h-5" />
          </Link>

          {/* Nút Giỏ hàng */}
          <Link
            href="/cart"
            className="relative p-2 rounded-box text-bark-700 hover:bg-surface-muted transition-colors"
            title="Giỏ hàng"
          >
            <ShoppingCart className="w-5 h-5 text-pine-950" />
            {totalCartItems > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-honey-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                {totalCartItems}
              </span>
            )}
          </Link>

          {/* Toggle Menu Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-box text-bark-700 hover:bg-surface-muted"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu xổ xuống trên Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-card border-b border-surface-border px-4 py-3 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 text-sm font-medium text-bark-800 hover:text-pine-900"
            >
              <span>{link.label}</span>
              {link.badge && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-tag bg-pine-100 text-pine-800">
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
          <div className="pt-2 border-t border-surface-border flex gap-2">
            <Link
              href="/quiz"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 text-center py-2 text-xs font-bold rounded-box bg-pine-900 text-white"
            >
              Làm trắc nghiệm tìm Box
            </Link>
            <Link
              href="/my-account/pets"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 text-center py-2 text-xs font-bold rounded-box bg-pine-900 text-white"
            >
              Tài khoản
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
