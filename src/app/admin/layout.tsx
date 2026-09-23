"use client";

import React from "react";
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
  Heart,
  Tag,
  Star,
  BarChart3,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleRole, user } = useApp();

  const menuItems = [
    { href: "/admin/dashboard", label: "Tổng quan Dashboard", icon: LayoutDashboard },
    { href: "/admin/box-curation", label: "Hàng chờ tuyển chọn Box", icon: PackageSearch, highlight: true },
    { href: "/admin/orders", label: "Quản lý Đơn hàng", icon: ClipboardList },
    { href: "/admin/products", label: "Sản phẩm & Tồn kho", icon: Warehouse },
    { href: "/admin/box-types", label: "Quản lý Mystery Box", icon: Gift },
    { href: "/admin/subscriptions", label: "Quản lý Subscription", icon: Calendar },
    { href: "/admin/customers", label: "Quản lý Khách hàng", icon: Users },
    { href: "/admin/pets", label: "Quản lý Pet Profile", icon: Heart },
    { href: "/admin/vouchers", label: "Quản lý Voucher", icon: Tag },
    { href: "/admin/reviews", label: "Đánh giá & Feedback", icon: Star },
    { href: "/admin/analytics", label: "Báo cáo & Thống kê", icon: BarChart3 },
  ];

  // Tiêu đề trang hiện tại
  const currentPage = menuItems.find((m) => m.href === pathname);
  const pageTitle = currentPage ? currentPage.label : "Quản trị hệ thống";

  const handleLogoutAdmin = () => {
    if (user.role === "admin") {
      toggleRole();
    }
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col md:flex-row antialiased">
      {/* Sidebar Admin Desktop: Cố định h-screen, khóa cứng scroll (overflow-hidden) */}
      <aside className="w-full md:w-64 bg-pine-950 text-pine-100 p-4 sm:p-5 flex flex-col justify-between border-r border-pine-900 shrink-0 md:sticky md:top-0 md:h-screen md:overflow-hidden select-none">
        <div className="flex flex-col min-h-0">
          {/* Logo Admin */}
          <div className="pb-3 border-b border-pine-900/80 mb-3">
            <BrandLogo variant="dark" size="sm" showText={true} />
            <p className="text-[10px] text-pine-400 mt-1 pl-8 font-medium">Hệ thống quản trị vận hành</p>
          </div>

          {/* Nhóm Quản trị hệ thống */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-[10px] font-semibold text-pine-400/80 uppercase tracking-wider">Danh mục quản lý</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-pine-900 text-pine-400 font-mono font-medium">
                {menuItems.length}
              </span>
            </div>

            <nav className="space-y-0.5 text-xs">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-box font-medium transition-all duration-150 ${
                      active
                        ? "bg-pine-800 text-white font-semibold shadow-sm shadow-pine-950/50 translate-x-0.5"
                        : "text-pine-300 hover:text-white hover:bg-pine-900/70"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? "text-honey-400" : "text-pine-400"}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.highlight && (
                      <span className="w-2 h-2 rounded-full bg-honey-500 animate-pulse shrink-0" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer Admin Sidebar: Được đẩy lên vị trí thuận tiện, thiết kế sang trọng & gọn gàng */}
        <div className="pt-3 border-t border-pine-900/80 mt-auto space-y-2.5">
          {/* Nút Xem cửa hàng khách hàng */}
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-pine-900/90 to-pine-850/90 hover:from-pine-850 hover:to-pine-800 border border-pine-800/80 hover:border-honey-500/40 text-pine-100 text-xs font-semibold shadow-sm transition-all duration-200"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-honey-500/15 text-honey-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Store className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="block text-white leading-tight font-medium">Xem cửa hàng khách</span>
                <span className="block text-[10px] text-pine-400 group-hover:text-pine-300 font-normal">Mở trang mua sắm</span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-pine-400 group-hover:text-honey-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </Link>

          {/* Badge trạng thái hệ sinh thái quản trị */}
          <div className="flex items-center justify-between px-2 pt-1 text-[10px] text-pine-400/90">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-grass-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-grass-500"></span>
              </span>
              <span className="font-medium text-pine-300">Máy chủ ổn định</span>
            </div>
            <div className="flex items-center gap-1 text-pine-500 font-mono">
              <ShieldCheck className="w-3 h-3 text-pine-400" />
              <span>v1.0.4</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Khu vực nội dung Admin có Top Bar tối giản */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar tối giản cho Admin */}
        <header className="h-14 bg-surface-card border-b border-surface-border px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-bark-500">Quản trị</span>
            <span className="text-xs text-bark-400">/</span>
            <h2 className="text-sm font-bold text-pine-950">{pageTitle}</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="w-6 h-6 rounded-full bg-pine-100 text-pine-900 flex items-center justify-center font-bold text-[10px]">
                <UserCheck className="w-3.5 h-3.5" />
              </span>
              <div className="text-right">
                <span className="font-bold text-pine-950 block leading-tight">Admin Kho & CSKH</span>
                <span className="text-[10px] text-grass-700 block">Trực tuyến</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogoutAdmin}
              className="px-2.5 py-1.5 rounded-box bg-surface-muted hover:bg-surface-border text-bark-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Đăng xuất khỏi phiên quản trị"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thoát Admin</span>
            </button>
          </div>
        </header>

        {/* Nội dung chính các trang Admin */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1600px]">
          {children}
        </main>

        {/* Footer Admin chung ở chân trang */}
        <footer className="border-t border-surface-border bg-surface-card px-4 sm:px-8 py-3 text-xs text-bark-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-pine-900">FPETS Admin Portal</span>
            <span className="text-bark-300">•</span>
            <span>Quản trị vận hành & Dịch vụ khách hàng</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-bark-400">
            <span>Múi giờ: Asia/Ho_Chi_Minh (GMT+7)</span>
            <span>Định dạng: dd/MM/yyyy</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
