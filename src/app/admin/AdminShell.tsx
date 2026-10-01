"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
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
  ShieldCheck,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";

interface SubMenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: string;
}

interface NavGroupItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SubMenuItem[];
}

type NavEntry =
  | { type: "link"; href: string; label: string; icon: React.ComponentType<{ className?: string }>; badgeKey?: string }
  | { type: "group"; group: NavGroupItem };

const navEntries: NavEntry[] = [
  {
    type: "link",
    href: "/admin/dashboard",
    label: "Tổng quan Dashboard",
    icon: LayoutDashboard,
  },
  {
    type: "group",
    group: {
      id: "orders",
      label: "Đơn hàng & Tuyển chọn",
      icon: ClipboardList,
      items: [
        { href: "/admin/orders", label: "Quản lý Đơn hàng", icon: ClipboardList },
        { href: "/admin/box-curation", label: "Hàng chờ tuyển chọn Box", icon: PackageSearch, badgeKey: "curation" },
        { href: "/admin/subscriptions", label: "Quản lý Subscription", icon: Calendar },
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "inventory",
      label: "Kho & Sản phẩm",
      icon: Warehouse,
      items: [
        { href: "/admin/products", label: "Sản phẩm & Tồn kho", icon: Warehouse },
        { href: "/admin/inventory", label: "Lịch sử Nhập / Xuất kho", icon: History },
        { href: "/admin/box-types", label: "Cấu hình Mystery Box", icon: Gift },
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "customers",
      label: "Khách hàng & Thú cưng",
      icon: Users,
      items: [
        { href: "/admin/customers", label: "Quản lý Khách hàng", icon: Users },
        { href: "/admin/pets", label: "Hồ sơ Pet Profile", icon: PawPrint },
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "marketing",
      label: "Đánh giá & Khuyến mãi",
      icon: Star,
      items: [
        { href: "/admin/reviews", label: "Đánh giá & Feedback", icon: Star, badgeKey: "feedback" },
        { href: "/admin/vouchers", label: "Quản lý Voucher", icon: Tag },
      ],
    },
  },
  {
    type: "link",
    href: "/admin/analytics",
    label: "Báo cáo & Thống kê",
    icon: BarChart3,
  },
];

// Danh sách phẳng để tìm tiêu đề trang
const allNavItems: SubMenuItem[] = navEntries.flatMap((entry) =>
  entry.type === "link"
    ? [{ href: entry.href, label: entry.label, icon: entry.icon, badgeKey: entry.badgeKey }]
    : entry.group.items
);

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useApp();

  // Tiêu đề trang hiện tại
  const currentPage = allNavItems.find((m) => m.href === pathname);
  const pageTitle = currentPage ? currentPage.label : "Quản trị hệ thống";

  // Số việc đang chờ: hộp chờ tuyển chọn, góp ý chưa xử lý (cập nhật khi chuyển trang)
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  // Nhóm dropdown đang mở (mặc định mở nhóm chứa trang hiện tại)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navEntries.forEach((entry) => {
      if (entry.type === "group" && entry.group.items.some((item) => item.href === pathname)) {
        initial[entry.group.id] = true;
      }
    });
    return initial;
  });

  // Tự động mở nhóm khi chuyển trang tới mục bên trong
  useEffect(() => {
    navEntries.forEach((entry) => {
      if (entry.type === "group" && entry.group.items.some((item) => item.href === pathname)) {
        setOpenGroups((prev) => ({ ...prev, [entry.group.id]: true }));
      }
    });
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("box_curations").select("id", { count: "exact", head: true }).eq("status", "pending_curation"),
      supabase.from("feedback_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
    ]).then(([curation, feedback]) => setBadges({ curation: curation.count || 0, feedback: feedback.count || 0 }));
  }, [pathname]);

  // Đóng mobile drawer và admin menu khi đổi trang
  useEffect(() => {
    setMobileMenuOpen(false);
    setAdminMenuOpen(false);
  }, [pathname]);

  // Đóng admin menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Khóa scroll body khi mở mobile drawer
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
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
      {/* Sidebar Admin Desktop: Cố định h-screen, chỉ hiện từ breakpoint md trở lên */}
      <aside className="hidden md:flex md:w-64 bg-pine-950 text-pine-100 p-4 sm:p-5 flex-col justify-between border-r border-pine-900 shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto select-none">
        <div className="flex flex-col min-h-0">
          {/* Logo Admin */}
          <div className="pb-3 border-b border-pine-900/80 mb-3">
            <BrandLogo variant="dark" size="sm" showText={true} />
            <p className="text-[10px] text-pine-400 mt-1 pl-8 font-medium">Hệ thống quản trị vận hành</p>
          </div>

          {/* Nhóm Quản trị hệ thống */}
          <div className="space-y-1">
            <div className="px-3 mb-1">
              <span className="text-[10px] font-semibold text-pine-400/80 uppercase tracking-wider">Danh mục quản lý</span>
            </div>

            <AdminNavList
              pathname={pathname}
              badges={badges}
              openGroups={openGroups}
              toggleGroup={toggleGroup}
            />
          </div>
        </div>

        {/* Footer Admin Sidebar */}
        <div className="pt-3 border-t border-pine-900/80 mt-auto space-y-2.5">
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
        </div>
      </aside>

      {/* Mobile Drawer Backdrop & Sheet (Chỉ hiển thị trên điện thoại / tablet nhỏ) */}
      {mobileMenuOpen && (
        <div
          role="presentation"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden transition-opacity duration-200"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-pine-950 text-pine-100 p-4 flex flex-col justify-between shadow-2xl transition-transform duration-200 ease-in-out md:hidden select-none ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Header Mobile Drawer */}
          <div className="pb-3 border-b border-pine-900/80 mb-3 flex items-center justify-between">
            <div>
              <BrandLogo variant="dark" size="sm" showText={true} />
              <p className="text-[10px] text-pine-400 mt-1 pl-8 font-medium">Quản trị vận hành</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-pine-400 hover:text-white hover:bg-pine-900/80 transition-colors"
              aria-label="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Danh mục menu cuộn được trên mobile */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-1">
            <div className="px-3 mb-1">
              <span className="text-[10px] font-semibold text-pine-400/80 uppercase tracking-wider">Danh mục quản lý</span>
            </div>

            <AdminNavList
              pathname={pathname}
              badges={badges}
              openGroups={openGroups}
              toggleGroup={toggleGroup}
              onItemClick={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>

        {/* Footer Drawer trên mobile: Liên kết nhanh & Đăng xuất */}
        <div className="pt-3 border-t border-pine-900/80 mt-auto space-y-2 shrink-0">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="group flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-pine-900/90 to-pine-850/90 hover:from-pine-850 hover:to-pine-800 border border-pine-800/80 text-pine-100 text-xs font-semibold shadow-sm transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-honey-500/15 text-honey-400 flex items-center justify-center">
                <Store className="w-3.5 h-3.5" />
              </div>
              <span className="text-white leading-tight font-medium">Xem cửa hàng khách</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-pine-400" />
          </Link>

          <button
            type="button"
            onClick={handleLogoutAdmin}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-pine-900/50 hover:bg-pine-900 text-pine-300 hover:text-white border border-pine-800/50 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất Admin</span>
          </button>
        </div>
      </aside>

      {/* Khu vực nội dung Admin có Top Bar tối giản */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar cho Admin */}
        <header className="h-14 bg-surface-card border-b border-surface-border px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Nút Hamburger menu trên mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 rounded-box text-bark-700 hover:text-pine-950 hover:bg-surface-muted md:hidden transition-colors"
              aria-label="Mở menu quản trị"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="text-xs font-semibold text-bark-400 hidden sm:inline">Quản trị</span>
              <span className="text-xs text-bark-300 hidden sm:inline">/</span>
              <h2 className="text-xs sm:text-sm font-bold text-pine-950 truncate max-w-[170px] sm:max-w-none">{pageTitle}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Lối tắt Xem Shop khách */}
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-box bg-surface-muted hover:bg-surface-border text-bark-800 hover:text-pine-950 text-xs font-semibold border border-surface-border transition-colors shadow-2xs"
            >
              <Store className="w-3.5 h-3.5 text-pine-700" />
              <span>Xem Shop</span>
              <ExternalLink className="w-3 h-3 text-bark-400" />
            </Link>

            {/* Menu Profile Quản trị viên */}
            <div className="relative" ref={adminMenuRef}>
              <button
                type="button"
                onClick={() => setAdminMenuOpen((v) => !v)}
                className={`flex items-center gap-2 h-9 pl-1 pr-2 rounded-box border border-surface-border hover:bg-surface-muted transition-colors ${
                  adminMenuOpen ? "bg-pine-50 border-pine-300" : ""
                }`}
              >
                <span className="w-7 h-7 rounded-full bg-pine-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                </span>
                <span className="text-left hidden md:block max-w-[120px]">
                  <span className="block text-xs font-semibold text-pine-950 truncate leading-tight">
                    {user?.name || "admin"}
                  </span>
                  <span className="block text-[10px] text-grass-700 font-medium truncate">
                    Quản trị viên
                  </span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-bark-400" />
              </button>

              {adminMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-surface-card rounded-container border border-surface-border shadow-xl py-2 z-50 text-xs">
                  <div className="px-4 py-2.5 border-b border-surface-border">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-pine-950 truncate">{user?.name || "admin"}</p>
                      <span className="px-2 py-0.5 rounded-full bg-pine-900 text-white text-[10px] font-bold shrink-0">
                        Quản trị viên
                      </span>
                    </div>
                    <p className="text-[11px] text-bark-500 truncate mt-0.5">{user?.email || "admin@fpets.vn"}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setAdminMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-2 text-bark-700 hover:text-pine-950 hover:bg-surface-muted transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-pine-700" />
                        <span>Xem Cửa hàng khách (Shop)</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-bark-400" />
                    </Link>
                    <Link
                      href="/my-account/profile"
                      onClick={() => setAdminMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-bark-700 hover:text-pine-950 hover:bg-surface-muted transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-pine-700" />
                      <span>Thông tin tài khoản</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-surface-border">
                    <button
                      type="button"
                      onClick={handleLogoutAdmin}
                      className="w-full flex items-center gap-2 px-4 py-2 text-red-700 hover:bg-red-50 font-medium transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất Admin</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Nội dung chính các trang Admin */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 w-full max-w-[1600px] overflow-x-hidden">
          {children}
        </main>

        {/* Footer Admin gọn gàng, tinh tế */}
        <footer className="border-t border-surface-border bg-surface-card px-4 sm:px-8 py-4 text-xs text-bark-500 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-surface-border/60">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-pine-950 text-xs">FPETS Admin Portal</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-grass-50 border border-grass-200 text-grass-700 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-grass-600 animate-pulse" />
                <span>Hệ thống trực tuyến</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-bark-400 hidden sm:inline">Cổng vận hành nội bộ</span>
              <span className="text-bark-300 hidden sm:inline">·</span>
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-pine-900 hover:text-pine-700 hover:underline"
              >
                <span>Xem Shop</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-bark-400">
            <div>
              © 2026 FPETS Vietnam. Mọi quyền được bảo lưu.
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-muted text-bark-600 font-medium whitespace-nowrap border border-surface-border/50">
                Múi giờ: <strong className="text-pine-950 font-semibold">GMT+7 (Asia/Ho_Chi_Minh)</strong>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-muted text-bark-600 font-medium whitespace-nowrap border border-surface-border/50">
                Định dạng: <strong className="text-pine-950 font-semibold">dd/MM/yyyy</strong>
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Component Render Danh sách Menu Accordion có thể sổ xuống */
function AdminNavList({
  pathname,
  badges,
  openGroups,
  toggleGroup,
  onItemClick,
}: {
  pathname: string;
  badges: Record<string, number>;
  openGroups: Record<string, boolean>;
  toggleGroup: (id: string) => void;
  onItemClick?: () => void;
}) {
  return (
    <nav className="space-y-1 text-xs">
      {navEntries.map((entry) => {
        if (entry.type === "link") {
          const Icon = entry.icon;
          const active = pathname === entry.href;
          const badgeCount = entry.badgeKey ? badges[entry.badgeKey] || 0 : 0;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              onClick={() => onItemClick?.()}
              className={`flex items-center justify-between px-3 py-2 rounded-box font-medium transition-all duration-150 ${
                active
                  ? "bg-pine-800 text-white font-semibold shadow-sm shadow-pine-950/50 translate-x-0.5"
                  : "text-pine-300 hover:text-white hover:bg-pine-900/70"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? "text-honey-400" : "text-pine-400"}`} />
                <span className="truncate">{entry.label}</span>
              </div>
              {badgeCount > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-honey-500 text-pine-950 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        }

        const { group } = entry;
        const Icon = group.icon;
        const isOpen = !!openGroups[group.id];
        const isChildActive = group.items.some((item) => item.href === pathname);
        const groupBadgeCount = group.items.reduce(
          (sum, item) => sum + (item.badgeKey ? badges[item.badgeKey] || 0 : 0),
          0
        );

        return (
          <div key={group.id} className="space-y-0.5">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-box font-medium transition-all duration-150 text-left ${
                isChildActive
                  ? "text-white font-semibold bg-pine-900/60"
                  : "text-pine-300 hover:text-white hover:bg-pine-900/40"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isChildActive ? "text-honey-400" : "text-pine-400"}`} />
                <span className="truncate">{group.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!isOpen && groupBadgeCount > 0 && (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-honey-500 text-pine-950 text-[9px] font-extrabold flex items-center justify-center shrink-0">
                    {groupBadgeCount}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-pine-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-white" : ""
                  }`}
                />
              </div>
            </button>

            {isOpen && (
              <div className="ml-4 pl-3 border-l border-pine-800/80 space-y-0.5 py-0.5 transition-all">
                {group.items.map((sub) => {
                  const SubIcon = sub.icon;
                  const active = pathname === sub.href;
                  const badgeCount = sub.badgeKey ? badges[sub.badgeKey] || 0 : 0;
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => onItemClick?.()}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-box text-xs font-medium transition-colors ${
                        active
                          ? "bg-pine-800 text-white font-semibold shadow-xs"
                          : "text-pine-300 hover:text-white hover:bg-pine-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SubIcon
                          className={`w-3.5 h-3.5 shrink-0 ${active ? "text-honey-400" : "text-pine-400"}`}
                        />
                        <span className="truncate">{sub.label}</span>
                      </div>
                      {badgeCount > 0 && (
                        <span className="min-w-4 h-4 px-1 rounded-full bg-honey-500 text-pine-950 text-[9px] font-extrabold flex items-center justify-center shrink-0">
                          {badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
