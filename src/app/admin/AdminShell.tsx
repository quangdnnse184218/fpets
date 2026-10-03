"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  LayoutDashboard,
  PackageSearch,
  ClipboardList,
  Warehouse,
  Store,
  LogOut,
  UserCheck,
  Gift,
  Calendar,
  Users,
  PawPrint,
  Tag,
  Star,
  BarChart3,
  ExternalLink,
  History,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";
import { AdminNotificationBell, AdminTasksProvider, AdminTaskCounts, useAdminTasks } from "./AdminTasks";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  // Các loại việc đang chờ cộng vào số đếm cạnh mục menu
  badge?: (keyof AdminTaskCounts)[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ href: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard }],
  },
  {
    title: "Bán hàng",
    items: [
      { href: "/admin/orders", label: "Đơn hàng", icon: ClipboardList, badge: ["returns_pending", "orders_to_prepare", "orders_to_ship"] },
      { href: "/admin/box-curation", label: "Hàng chờ tuyển chọn", icon: PackageSearch, badge: ["curation_pending"] },
      { href: "/admin/subscriptions", label: "Gói định kỳ", icon: Calendar },
    ],
  },
  {
    title: "Kho & sản phẩm",
    items: [
      { href: "/admin/products", label: "Sản phẩm", icon: Warehouse, badge: ["low_stock"] },
      { href: "/admin/inventory", label: "Nhập / xuất kho", icon: History },
      { href: "/admin/box-types", label: "Loại Mystery Box", icon: Gift },
    ],
  },
  {
    title: "Khách hàng",
    items: [
      { href: "/admin/customers", label: "Khách hàng", icon: Users },
      { href: "/admin/pets", label: "Hồ sơ thú cưng", icon: PawPrint },
      { href: "/admin/reviews", label: "Đánh giá & góp ý", icon: Star, badge: ["feedback_new", "reviews_unreplied"] },
      { href: "/admin/vouchers", label: "Voucher", icon: Tag },
    ],
  },
  {
    items: [{ href: "/admin/analytics", label: "Báo cáo", icon: BarChart3 }],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminTasksProvider>
      <AdminLayout>{children}</AdminLayout>
    </AdminTasksProvider>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  const pageTitle = ALL_ITEMS.find((m) => pathname.startsWith(m.href))?.label || "Quản trị";

  useEffect(() => {
    setMobileMenuOpen(false);
    setAdminMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) setAdminMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAdminMenuOpen(false);
      setMobileMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Khóa cuộn trang khi mở menu trên điện thoại
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleLogoutAdmin = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col md:flex-row antialiased">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-60 bg-pine-950 text-pine-100 px-3 py-4 flex-col border-r border-pine-900 shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <div className="px-2 pb-4 mb-2 border-b border-pine-900/80">
          <BrandLogo variant="dark" size="sm" showText={true} href="/admin/dashboard" />
          <p className="text-[11px] text-pine-400 mt-1">Quản trị cửa hàng</p>
        </div>
        <AdminNav pathname={pathname} />
      </aside>

      {/* Menu điện thoại */}
      {mobileMenuOpen && (
        <div role="presentation" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 z-50 md:hidden" />
      )}
      <aside
        aria-label="Menu quản trị"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-pine-950 text-pine-100 px-3 py-4 flex flex-col shadow-2xl transition-transform duration-200 ease-in-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
      >
        <div className="px-2 pb-3 mb-2 border-b border-pine-900/80 flex items-center justify-between">
          <BrandLogo variant="dark" size="sm" showText={true} href="/admin/dashboard" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg text-pine-400 hover:text-white hover:bg-pine-900/80 transition-colors"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNav pathname={pathname} />
        </div>
        <div className="pt-3 mt-2 border-t border-pine-900/80 space-y-1 text-xs">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-box text-pine-200 hover:text-white hover:bg-pine-900/70"
          >
            <Store className="w-4 h-4 text-pine-400" />
            <span className="flex-1">Xem cửa hàng</span>
            <ExternalLink className="w-3.5 h-3.5 text-pine-500" />
          </a>
          <button
            type="button"
            onClick={handleLogoutAdmin}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-box text-pine-200 hover:text-white hover:bg-pine-900/70 text-left"
          >
            <LogOut className="w-4 h-4 text-pine-400" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-surface-card border-b border-surface-border px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 rounded-box text-bark-700 hover:text-pine-950 hover:bg-surface-muted md:hidden transition-colors"
              aria-label="Mở menu quản trị"
            >
              <Menu className="w-5 h-5" />
            </button>
            <p className="text-sm font-bold text-pine-950 truncate">{pageTitle}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Lối duy nhất sang trang khách: mở tab mới để kiểm tra giá, ảnh, nội dung đúng như khách thấy */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-box border border-surface-border text-bark-800 hover:text-pine-950 hover:bg-surface-muted text-xs font-semibold transition-colors"
            >
              <Store className="w-3.5 h-3.5 text-pine-700" />
              <span>Xem cửa hàng</span>
              <ExternalLink className="w-3 h-3 text-bark-400" />
            </a>

            <AdminNotificationBell />

            <div className="relative" ref={adminMenuRef}>
              <button
                type="button"
                onClick={() => setAdminMenuOpen((v) => !v)}
                aria-expanded={adminMenuOpen}
                aria-haspopup="true"
                aria-label="Tài khoản quản trị"
                className={`flex items-center gap-2 h-9 pl-1 pr-2 rounded-box border border-surface-border hover:bg-surface-muted transition-colors ${
                  adminMenuOpen ? "bg-pine-50 border-pine-300" : ""
                }`}
              >
                <span className="w-7 h-7 rounded-full bg-pine-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                </span>
                <span className="text-xs font-semibold text-pine-950 truncate max-w-[120px] hidden lg:block">{user?.name || "Quản trị viên"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-bark-400" />
              </button>

              {adminMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-surface-card rounded-container border border-surface-border shadow-xl py-1.5 z-50 text-xs">
                  <div className="px-4 py-2.5 border-b border-surface-border">
                    <p className="font-bold text-pine-950 truncate">{user?.name || "Quản trị viên"}</p>
                    <p className="text-[11px] text-bark-500 truncate mt-0.5">{user?.email}</p>
                  </div>
                  <Link
                    href="/my-account/profile"
                    className="flex items-center gap-2 px-4 py-2.5 text-bark-700 hover:text-pine-950 hover:bg-surface-muted transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-pine-700" />
                    <span>Thông tin tài khoản</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogoutAdmin}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-red-700 hover:bg-red-50 font-medium transition-colors text-left border-t border-surface-border"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 w-full max-w-[1600px] overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

function AdminNav({ pathname }: { pathname: string }) {
  const { counts } = useAdminTasks();
  return (
    <nav className="space-y-4 text-xs" aria-label="Danh mục quản trị">
      {NAV_SECTIONS.map((section, i) => (
        <div key={section.title || i} className="space-y-0.5">
          {section.title && (
            <p className="px-3 pb-1 text-[10px] font-semibold text-pine-400/80 uppercase tracking-wider">{section.title}</p>
          )}
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            const badge = (item.badge || []).reduce((sum, key) => sum + counts[key], 0);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-box font-medium transition-colors ${
                  active ? "bg-pine-800 text-white font-semibold" : "text-pine-300 hover:text-white hover:bg-pine-900/70"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-honey-400" : "text-pine-400"}`} />
                <span className="flex-1 truncate">{item.label}</span>
                {badge > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-honey-500 text-pine-950 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
