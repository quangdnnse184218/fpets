"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  Bell,
  ChevronDown,
  Dog,
  LogOut,
  Menu,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  User,
  X,
  ChevronRight,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";
import NotificationBell from "@/components/common/NotificationBell";
import { buttonClass } from "@/components/ui/Button";
import { CONTACT_INFO } from "@/lib/contactInfo";
import { SHIPPING_CONFIG } from "@/lib/shipping";
import { formatVND } from "@/lib/formatters";

type SubLink = { href: string; label: string; desc?: string };
type NavItem = { label: string; href: string; children?: SubLink[] };

// Cấu trúc menu chính: mỗi luồng của khách (mua hộp, đăng ký gói, mua lẻ, hỗ trợ) có 1 mục riêng
const NAV_ITEMS: NavItem[] = [
  { label: "Trang chủ", href: "/" },
  {
    label: "Mystery Box",
    href: "/boxes",
    children: [
      { href: "/boxes", label: "Tất cả loại hộp", desc: "Tiêu chuẩn và Premium, chọn theo hồ sơ bé" },
      { href: "/boxes?species=dog", label: "Hộp cho chó", desc: "Theo size chó nhỏ, chó lớn" },
      { href: "/boxes?species=cat", label: "Hộp cho mèo", desc: "Đồ ăn, đồ chơi hợp khẩu vị mèo" },
      { href: "/boxes?tier=premium", label: "Hộp Premium", desc: "Nhiều món hơn, thương hiệu cao cấp" },
    ],
  },
  { label: "Gói định kỳ", href: "/subscription" },
  {
    label: "Cửa hàng",
    href: "/shop",
    children: [
      { href: "/shop", label: "Tất cả sản phẩm" },
      { href: "/shop?category=food", label: "Thức ăn & Pate" },
      { href: "/shop?category=toy", label: "Đồ chơi" },
      { href: "/shop?category=accessory", label: "Phụ kiện" },
    ],
  },
  { label: "Đánh giá", href: "/reviews" },
  {
    label: "Hỗ trợ",
    href: "/faq",
    children: [
      { href: "/faq", label: "Câu hỏi thường gặp" },
      { href: "/order-tracking", label: "Tra cứu đơn hàng" },
      { href: "/faq#doi-tra", label: "Chính sách đổi trả" },
      { href: "/contact", label: "Liên hệ" },
      { href: "/about", label: "Về FPETS" },
    ],
  },
];

const ACCOUNT_LINKS = [
  { href: "/my-account/pets", label: "Thú cưng của tôi", icon: Dog },
  { href: "/my-account/orders", label: "Đơn hàng & Vận chuyển", icon: Package },
  { href: "/my-account/subscriptions", label: "Gói định kỳ", icon: RefreshCw },
  { href: "/my-account/notifications", label: "Thông báo", icon: Bell },
  { href: "/my-account/profile", label: "Thông tin & Địa chỉ", icon: User },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Quản trị viên",
  customer: "Thành viên FPETS",
};

const navItemClass = (active: boolean) =>
  `flex items-center gap-1 h-10 px-3 text-sm rounded-box transition-colors ${
    active ? "text-pine-950 font-semibold bg-pine-50" : "font-medium text-bark-700 hover:text-pine-900 hover:bg-surface-muted"
  }`;

export default function MainNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { cart, isLoggedIn, user, logout } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Đổi trang thì đóng mọi menu đang mở
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setOpenMenu(null);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenMenu(null);
      setUserMenuOpen(false);
      setSearchOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Không hiển thị Header khách khi đang ở các trang Admin
  if (pathname.startsWith("/admin")) return null;

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const isActive = (item: NavItem) => {
    if (item.href === "/") return pathname === "/";
    const roots = [item.href, ...(item.children || []).map((c) => c.href.split(/[?#]/)[0])];
    return roots.some((r) => r !== "/" && pathname.startsWith(r));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
    setSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    await logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-surface-card border-b border-surface-border">
      {/* Thanh thông tin: chính sách giao hàng và kênh hỗ trợ */}
      <div className="bg-pine-950 text-pine-100 text-[11px] sm:text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-center md:justify-between gap-4">
          <p className="flex items-center gap-1.5 truncate">
            <Truck className="w-3.5 h-3.5 text-grass-400 shrink-0" />
            <span className="truncate">
              Miễn phí giao hàng đơn từ {formatVND(SHIPPING_CONFIG.freeShippingThreshold)}
              <span className="hidden sm:inline"> · Đổi món miễn phí nếu bé dị ứng</span>
            </span>
          </p>
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <Link href={isLoggedIn ? "/my-account/orders" : "/order-tracking"} className="hover:text-white transition-colors">
              {isLoggedIn ? "Đơn hàng của tôi" : "Tra cứu đơn hàng"}
            </Link>
            <span className="w-px h-3 bg-pine-700" aria-hidden="true" />
            <a href={`tel:${CONTACT_INFO.hotlineTel}`} className="flex items-center gap-1 hover:text-white transition-colors">
              <Phone className="w-3 h-3" /> Hotline <strong className="text-white">{CONTACT_INFO.hotline}</strong>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 xl:gap-8 min-w-0">
          <BrandLogo href="/" size="md" />

          {/* Menu chính trên desktop */}
          <nav aria-label="Menu chính" className="hidden lg:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) =>
              item.children ? (
                <div key={item.label} className="relative" onMouseEnter={() => setOpenMenu(item.label)} onMouseLeave={() => setOpenMenu(null)}>
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
                    aria-expanded={openMenu === item.label}
                    aria-haspopup="true"
                    className={navItemClass(isActive(item))}
                  >
                    {item.label}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openMenu === item.label ? "rotate-180" : ""}`} />
                  </button>
                  {openMenu === item.label && (
                    <div className="absolute left-0 top-full pt-1.5 z-50">
                      <div className={`${item.children.some((c) => c.desc) ? "w-72" : "w-56"} p-1.5 rounded-container bg-surface-card border border-surface-border shadow-xl`}>
                        {item.children.map((c) => (
                          <Link key={c.href} href={c.href} onClick={() => setOpenMenu(null)} className="block px-3 py-2 rounded-box hover:bg-surface-muted">
                            <span className="block text-sm font-semibold text-pine-950">{c.label}</span>
                            {c.desc && <span className="block text-[11px] text-bark-500 mt-0.5">{c.desc}</span>}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link key={item.label} href={item.href} className={navItemClass(isActive(item))} aria-current={isActive(item) ? "page" : undefined}>
                  {item.label}
                </Link>
              )
            )}
          </nav>
        </div>

        {/* Cụm hành động bên phải */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Tìm sản phẩm"
            aria-expanded={searchOpen}
            title="Tìm sản phẩm"
            className="min-w-11 min-h-11 flex items-center justify-center rounded-box text-pine-950 hover:bg-surface-muted transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          {isLoggedIn && user.id && <NotificationBell userId={user.id} />}

          <Link
            href="/cart"
            className="relative min-w-11 min-h-11 flex items-center justify-center rounded-box hover:bg-surface-muted transition-colors"
            title="Giỏ hàng"
            aria-label={totalCartItems > 0 ? `Giỏ hàng, ${totalCartItems} sản phẩm` : "Giỏ hàng"}
          >
            <ShoppingCart className="w-5 h-5 text-pine-950" />
            {totalCartItems > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-honey-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                {totalCartItems}
              </span>
            )}
          </Link>

          {isLoggedIn ? (
            <div className="flex items-center gap-1.5 ml-1">
              {/* Nút tắt vào Admin Portal nhanh khi tài khoản là Admin */}
              {user.role === "admin" && (
                <Link
                  href="/admin/dashboard"
                  className="hidden lg:inline-flex items-center gap-1.5 h-10 px-3 rounded-box bg-pine-900 hover:bg-pine-850 text-white text-xs font-bold transition-colors shadow-xs"
                  title="Vào bảng quản trị Admin"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-honey-400" />
                  <span>Trang quản trị</span>
                </Link>
              )}

              <div className="relative hidden md:block" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-2 h-10 pl-1 pr-2 rounded-box border border-surface-border hover:bg-surface-muted transition-colors ${userMenuOpen ? "bg-pine-50 border-pine-300" : ""}`}
                >
                  <span className="w-8 h-8 rounded-full bg-pine-900 text-white text-xs font-bold flex items-center justify-center">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </span>
                  <span className="text-left hidden xl:block max-w-[120px]">
                    <span className="block text-xs font-semibold text-bark-900 truncate">{user.name}</span>
                    <span className="block text-[10px] text-bark-500 truncate">{ROLE_LABEL[user.role] || "Thành viên FPETS"}</span>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-bark-500" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-surface-card rounded-container border border-surface-border shadow-xl py-2 z-50">
                    <div className="px-4 py-3 border-b border-surface-border">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-pine-950 truncate">{user.name}</p>
                        {user.role === "admin" ? (
                          <span className="px-2 py-0.5 rounded-full bg-pine-900 text-white text-[10px] font-bold shrink-0">
                            Quản trị viên
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-surface-muted text-bark-600 text-[10px] font-medium shrink-0">
                            Thành viên
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-bark-500 truncate mt-0.5">{user.email}</p>
                    </div>

                    {/* Đối với Admin: Khối lối tắt Cổng Quản Trị đặt nổi bật ngay trên đầu */}
                    {user.role === "admin" && (
                      <div className="p-2 border-b border-surface-border bg-pine-50/70">
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-box bg-pine-900 hover:bg-pine-850 text-white shadow-xs transition-all group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-4 h-4 text-honey-400" />
                            </div>
                            <div className="text-left">
                              <span className="block text-xs font-bold leading-tight">Cổng Quản Trị Hệ Thống</span>
                              <span className="block text-[10px] text-pine-200">Quản lý đơn hàng, kho &amp; box</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-pine-300 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    )}

                    {/* Khu vực thông tin cá nhân của người dùng */}
                    <div className="py-1">
                      <div className="px-4 py-1">
                        <span className="text-[10px] font-semibold text-bark-400 uppercase tracking-wider">
                          Tài khoản cá nhân
                        </span>
                      </div>
                      {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 min-h-9 text-xs font-medium text-bark-800 hover:bg-surface-muted hover:text-pine-900 transition-colors"
                        >
                          <Icon className="w-4 h-4 text-pine-700" />
                          <span>{label}</span>
                        </Link>
                      ))}
                    </div>

                    <div className="pt-1 border-t border-surface-border">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 min-h-9 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 pl-2 ml-1 border-l border-surface-border">
              <Link href="/login" className="inline-flex items-center h-10 px-3 text-sm font-medium text-bark-700 hover:text-pine-950 rounded-box hover:bg-surface-muted transition-colors">
                Đăng nhập
              </Link>
              {/* Màn hình vừa (lg) chật chỗ: nút Đăng ký chỉ hiện từ xl, trang Đăng nhập vẫn có link đăng ký */}
              <Link href="/register" className={buttonClass("primary", "md", "!min-h-10 lg:hidden xl:inline-flex")}>
                Đăng ký
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden min-w-11 min-h-11 flex items-center justify-center rounded-box text-bark-700 hover:bg-surface-muted"
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Ô tìm kiếm sản phẩm */}
      {searchOpen && (
        <div className="border-t border-surface-border bg-surface-card">
          <form onSubmit={handleSearch} role="search" className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex gap-2">
            <label htmlFor="header-search" className="sr-only">Tìm sản phẩm</label>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-bark-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                id="header-search"
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm pate, hạt, đồ chơi, phụ kiện..."
                className="w-full h-11 pl-9 pr-3 rounded-box border border-surface-border bg-white text-sm focus:border-pine-900 focus:outline-none"
              />
            </div>
            <button type="submit" className={buttonClass("primary", "md")}>Tìm</button>
          </form>
        </div>
      )}

      {/* Menu trên mobile / tablet */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-surface-border bg-surface-card max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-3">
            {isLoggedIn ? (
              <div className="p-3.5 rounded-box bg-pine-50 border border-pine-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-pine-950">{user.name}</p>
                    <p className="text-xs text-pine-700">{user.email}</p>
                  </div>
                  {user.role === "admin" ? (
                    <span className="px-2 py-0.5 rounded-full bg-pine-900 text-white text-[10px] font-bold">
                      Quản trị viên
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-surface-muted text-bark-600 text-[10px] font-medium">
                      Thành viên
                    </span>
                  )}
                </div>

                {user.role === "admin" && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-box bg-pine-900 text-white font-bold text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-honey-400" />
                      <span>Vào Cổng Quản Trị Hệ Thống</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-pine-300" />
                  </Link>
                )}

                <div className="pt-2 border-t border-pine-200/60 grid grid-cols-2 gap-x-3 gap-y-1">
                  {ACCOUNT_LINKS.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center min-h-9 text-xs font-medium text-pine-900 hover:underline"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 md:hidden">
                <Link href="/login" className={buttonClass("secondary", "md")}>Đăng nhập</Link>
                <Link href="/register" className={buttonClass("primary", "md")}>Đăng ký</Link>
              </div>
            )}

            <nav aria-label="Menu chính" className="divide-y divide-surface-border">
              {NAV_ITEMS.map((item) =>
                item.children ? (
                  <details key={item.label} className="group" open={isActive(item)}>
                    <summary className="flex items-center justify-between min-h-12 text-sm font-semibold text-pine-950 cursor-pointer list-none">
                      {item.label}
                      <ChevronDown className="w-4 h-4 text-bark-500 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="pb-2 pl-3">
                      {item.children.map((c) => (
                        <Link key={c.href} href={c.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center min-h-11 text-sm text-bark-700 hover:text-pine-900">
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  </details>
                ) : (
                  <Link key={item.label} href={item.href} className={`flex items-center min-h-12 text-sm font-semibold ${isActive(item) ? "text-pine-900" : "text-pine-950"}`}>
                    {item.label}
                  </Link>
                )
              )}
            </nav>

            <div className="pt-3 border-t border-surface-border flex flex-col gap-1 text-xs text-bark-600">
              <a href={`tel:${CONTACT_INFO.hotlineTel}`} className="flex items-center gap-1.5 min-h-10">
                <Phone className="w-3.5 h-3.5 text-pine-700" /> Hotline <strong className="text-pine-950">{CONTACT_INFO.hotline}</strong> ({CONTACT_INFO.hours})
              </a>
              {isLoggedIn && (
                <button type="button" onClick={handleLogout} className="flex items-center gap-1.5 min-h-10 text-red-700 font-medium text-left">
                  <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
