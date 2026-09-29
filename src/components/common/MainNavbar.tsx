"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  ShoppingCart,
  Menu,
  X,
  LogOut,
  Package,
  Dog,
  ShieldAlert,
  ChevronDown,
  RefreshCw,
  Bell,
  User,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";
import NotificationBell from "@/components/common/NotificationBell";
import { buttonClass } from "@/components/ui/Button";

export default function MainNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { cart, isLoggedIn, user, logout } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [boxMenuOpen, setBoxMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Không hiển thị Header khách khi đang ở các trang Admin
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // "Mystery Box" là 1 mục có 2 mục con: loại hộp và bảng giá gói định kỳ
  const boxLinks = [
    { href: "/boxes", label: "Các loại hộp", desc: "Hộp Tiêu chuẩn và Premium cho chó, mèo" },
    { href: "/subscription", label: "Bảng giá gói", desc: "Gói 1, 3, 6 hộp, giảm đến 15%" },
  ];
  const navLinks = [
    { href: "/shop", label: "Shop bán lẻ" },
    { href: "/reviews", label: "Đánh giá" },
  ];
  const accountLinks = [
    { href: "/my-account/pets", label: "Thú cưng của tôi", icon: Dog },
    { href: "/my-account/orders", label: "Đơn hàng & Vận chuyển", icon: Package },
    { href: "/my-account/subscriptions", label: "Gói định kỳ", icon: RefreshCw },
    { href: "/my-account/notifications", label: "Thông báo", icon: Bell },
    { href: "/my-account/profile", label: "Thông tin & Địa chỉ", icon: User },
  ];
  const boxMenuActive = boxLinks.some((l) => pathname.startsWith(l.href));

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname.startsWith(href)) return true;
    return false;
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    await logout();
    router.push("/");
  };

  const roleLabels: Record<string, string> = {
    admin: "Quản trị viên",
    customer: "Thành viên FPETS",
  };

  return (
    <header className="sticky top-0 z-40 bg-surface-card border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo + menu chính nằm cùng cụm bên trái, hành động của khách ở bên phải */}
        <div className="flex items-center gap-6 lg:gap-10 min-w-0">
        <BrandLogo href="/" size="md" />

        <nav aria-label="Menu chính" className="hidden md:flex items-center gap-1">
          <div className="relative" onMouseLeave={() => setBoxMenuOpen(false)}>
            <button
              type="button"
              onClick={() => setBoxMenuOpen((v) => !v)}
              onMouseEnter={() => setBoxMenuOpen(true)}
              aria-expanded={boxMenuOpen}
              aria-haspopup="true"
              className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-box transition-colors ${
                boxMenuActive ? "text-pine-950 bg-pine-50 font-semibold" : "text-bark-700 hover:text-pine-900 hover:bg-surface-muted"
              }`}
            >
              Mystery Box <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {boxMenuOpen && (
              <div className="absolute left-0 top-full pt-1 z-50">
                <div className="w-72 p-1.5 rounded-box bg-surface-card border border-surface-border shadow-xl">
                  {boxLinks.map((l) => (
                    <Link key={l.href} href={l.href} onClick={() => setBoxMenuOpen(false)} className="block px-3 py-2.5 rounded-box hover:bg-surface-muted">
                      <span className="block text-sm font-bold text-pine-950">{l.label}</span>
                      <span className="block text-[11px] text-bark-500">{l.desc}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-2 text-sm font-medium rounded-box transition-colors ${
                  active
                    ? "text-pine-950 bg-pine-50 font-semibold"
                    : "text-bark-700 hover:text-pine-900 hover:bg-surface-muted"
                }`}
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
        </div>

        {/* Cụm hành động bên phải */}
        <div className="flex items-center gap-1 sm:gap-2">
          {isLoggedIn && user.id && <NotificationBell userId={user.id} />}

          {/* Giỏ hàng */}
          <Link
            href="/cart"
            className="relative min-w-11 min-h-11 flex items-center justify-center rounded-box text-bark-700 hover:bg-surface-muted transition-colors"
            title="Giỏ hàng"
            aria-label={totalCartItems > 0 ? `Giỏ hàng, ${totalCartItems} sản phẩm` : "Giỏ hàng"}
          >
            <ShoppingCart className="w-5 h-5 text-pine-950" />
            {totalCartItems > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-honey-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                {totalCartItems}
              </span>
            )}
          </Link>

          {/* KHU VỰC AUTH: Chưa đăng nhập vs Đã đăng nhập */}
          {isLoggedIn ? (
            /* ĐÃ ĐĂNG NHẬP: Dropdown Profile */
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-box border border-surface-border hover:bg-surface-muted transition-colors ${
                  userDropdownOpen ? "bg-pine-50 border-pine-300" : ""
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-pine-900 text-white text-xs font-bold flex items-center justify-center">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="text-left hidden xl:block max-w-[120px]">
                  <div className="text-xs font-semibold text-bark-900 truncate">{user.name}</div>
                  <div className="text-[10px] text-bark-500 truncate">{roleLabels[user.role] || "Thành viên FPETS"}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-bark-500" />
              </button>

              {/* Menu Dropdown User */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-surface-card rounded-container border border-surface-border shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-surface-border">
                    <p className="text-xs text-bark-500">Đang đăng nhập với tư cách</p>
                    <p className="text-sm font-bold text-bark-950 truncate mt-0.5">{user.name}</p>
                    <p className="text-xs text-bark-600 truncate">{user.email}</p>
                    <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pine-50 text-pine-800 border border-pine-200">
                      {roleLabels[user.role] || user.role}
                    </div>
                  </div>

                  <div className="py-1">
                    {accountLinks.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 min-h-10 text-xs font-medium text-bark-800 hover:bg-surface-muted hover:text-pine-900 transition-colors"
                      >
                        <Icon className="w-4 h-4 text-pine-700" />
                        <span>{label}</span>
                      </Link>
                    ))}

                    {/* Nếu là Admin -> Liên kết đến Admin Dashboard */}
                    {user.role === "admin" && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-honey-700 hover:bg-honey-50 transition-colors border-t border-b border-surface-border my-1"
                      >
                        <ShieldAlert className="w-4 h-4 text-honey-600" />
                        <span>Trang Quản trị Admin</span>
                      </Link>
                    )}
                  </div>

                  <div className="pt-1 border-t border-surface-border">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* CHƯA ĐĂNG NHẬP: Nút Đăng nhập & Đăng ký */
            <div className="hidden md:flex items-center gap-2 pl-2 ml-1 border-l border-surface-border">
              <Link
                href="/login"
                className="inline-flex items-center min-h-10 px-3 text-sm font-medium text-bark-700 hover:text-pine-950 rounded-box hover:bg-surface-muted transition-colors"
              >
                Đăng nhập
              </Link>
              <Link href="/register" className={buttonClass("primary", "md", "!min-h-10")}>
                Đăng ký
              </Link>
            </div>
          )}

          {/* Toggle Menu Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden min-w-11 min-h-11 flex items-center justify-center rounded-box text-bark-700 hover:bg-surface-muted"
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu xổ xuống trên Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-card border-b border-surface-border px-4 py-3 space-y-2 animate-in fade-in duration-150">
          
          {/* Thông tin User trên Mobile */}
          {isLoggedIn ? (
            <div className="p-3 rounded-xl bg-pine-50 border border-pine-200 mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-pine-950">{user.name}</p>
                  <p className="text-[11px] text-pine-700">{user.email}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pine-200 text-pine-900">
                  {roleLabels[user.role] || user.role}
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-pine-200/60 flex items-center justify-between text-xs">
                <Link
                  href="/my-account/pets"
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-medium text-pine-900 hover:underline"
                >
                  Tài khoản của tôi
                </Link>
                {user.role === "admin" && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-bold text-honey-700 hover:underline"
                  >
                    Vào trang Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-red-600 font-medium hover:underline flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mb-2 p-2 bg-surface-muted rounded-xl">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-center text-xs font-semibold rounded-lg bg-white border border-surface-border text-bark-800"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-center text-xs font-semibold rounded-lg bg-pine-900 text-white"
              >
                Đăng ký tài khoản
              </Link>
            </div>
          )}

          <div className="py-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-bark-500">Mystery Box</span>
            {boxLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center min-h-11 pl-3 text-sm font-medium text-bark-800 hover:text-pine-900">
                {l.label}
              </Link>
            ))}
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between min-h-11 text-sm font-medium text-bark-800 hover:text-pine-900"
            >
              <span>{link.label}</span>
            </Link>
          ))}

        </div>
      )}
    </header>
  );
}
