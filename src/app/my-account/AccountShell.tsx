"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LayoutGrid, Lock, LogIn, LogOut, Package, PawPrint, RefreshCw, User } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";

type TabKey = "overview" | "pets" | "orders" | "subscriptions" | "notifications" | "profile";

// Mỗi mục có tiêu đề và mô tả riêng; khung này hiển thị tiêu đề nên các trang con không lặp lại
const ACCOUNT_TABS: { key: TabKey; href: string; label: string; title: string; description: string; icon: typeof User }[] = [
  { key: "overview", href: "/my-account", label: "Tổng quan", title: "Tổng quan", description: "Hộp sắp giao, đơn gần đây và hồ sơ của các bé.", icon: LayoutGrid },
  { key: "pets", href: "/my-account/pets", label: "Thú cưng", title: "Thú cưng của tôi", description: "Hồ sơ của bé giúp FPETS chọn đúng món và tránh thành phần bé dị ứng.", icon: PawPrint },
  { key: "orders", href: "/my-account/orders", label: "Đơn hàng", title: "Đơn hàng", description: "Theo dõi trạng thái giao hàng, đánh giá và yêu cầu đổi trả.", icon: Package },
  { key: "subscriptions", href: "/my-account/subscriptions", label: "Gói định kỳ", title: "Gói định kỳ", description: "Lịch giao từng kỳ, tạm dừng, đổi địa chỉ hoặc gia hạn gói.", icon: RefreshCw },
  { key: "notifications", href: "/my-account/notifications", label: "Thông báo", title: "Thông báo", description: "Cập nhật về đơn hàng và gói định kỳ của bạn.", icon: Bell },
  { key: "profile", href: "/my-account/profile", label: "Thông tin & địa chỉ", title: "Thông tin & địa chỉ", description: "Thông tin tài khoản, sổ địa chỉ nhận hàng và mật khẩu.", icon: User },
];

export default function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, isLoadingAuth, user, pets, logout } = useApp();
  const [counts, setCounts] = useState<Partial<Record<TabKey, number>>>({});
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Số đếm cạnh mục: đơn đang xử lý, gói đang chạy, thông báo chưa đọc
  useEffect(() => {
    if (!user.id) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("status", ["cho_thanh_toan", "da_xac_nhan", "dang_chuan_bi", "dang_giao"]).neq("order_type", "subscription_renewal"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("status", ["dang_hoat_dong", "tam_dung", "qua_han"]),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
    ]).then(([orders, subs, notifications]) =>
      setCounts({ orders: orders.count || 0, subscriptions: subs.count || 0, notifications: notifications.count || 0 })
    );
  }, [user.id, pathname]);

  if (isLoadingAuth) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4" aria-busy="true">
        <div className="h-16 rounded-container bg-surface-muted animate-pulse" />
        <div className="h-72 rounded-container bg-surface-muted animate-pulse" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-pine-100 text-pine-900 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-pine-950">Vui lòng đăng nhập</h1>
        <p className="text-sm text-bark-600">Đăng nhập để quản lý hồ sơ thú cưng, đơn hàng và gói định kỳ.</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <ButtonLink href={`/login?redirect=${encodeURIComponent(pathname)}`}>
            <LogIn className="w-4 h-4" /> Đăng nhập
          </ButtonLink>
          <ButtonLink href={`/register?redirect=${encodeURIComponent(pathname)}`} variant="secondary">
            Đăng ký tài khoản
          </ButtonLink>
        </div>
      </div>
    );
  }

  const isActive = (tab: (typeof ACCOUNT_TABS)[number]) => (tab.key === "overview" ? pathname === "/my-account" : pathname.startsWith(tab.href));
  const active = ACCOUNT_TABS.find(isActive) || ACCOUNT_TABS[0];
  const badge = (key: TabKey) => (key === "pets" ? pets.length : counts[key] || 0);
  // Trang chi tiết đơn có tiêu đề riêng (mã đơn), không dùng tiêu đề chung của mục
  const isDetailPage = /^\/my-account\/orders\/.+/.test(pathname);
  const displayName = user.name || "Khách hàng FPETS";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
      <div className="lg:grid lg:grid-cols-[236px_1fr] lg:gap-8 lg:items-start">
        <aside className="lg:sticky lg:top-20">
          <div className="flex items-center gap-3 lg:p-4 lg:rounded-t-container lg:bg-surface-card lg:border lg:border-b-0 lg:border-surface-border">
            <span className="w-11 h-11 rounded-full bg-pine-900 text-white flex items-center justify-center font-extrabold shrink-0" aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-pine-950 truncate">{displayName}</p>
              <p className="text-xs text-bark-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* Desktop: danh sách dọc; mobile: thanh tab cuộn ngang dính dưới header */}
          <nav
            aria-label="Tài khoản"
            className="sticky top-16 z-30 -mx-4 px-4 mt-3 bg-surface/95 backdrop-blur-sm border-b border-surface-border flex gap-1 overflow-x-auto no-scrollbar lg:static lg:mx-0 lg:mt-0 lg:p-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:bg-surface-card lg:border lg:border-surface-border lg:rounded-b-container"
          >
            {ACCOUNT_TABS.map((tab) => {
              const Icon = tab.icon;
              const on = isActive(tab);
              const n = badge(tab.key);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={on ? "page" : undefined}
                  className={`relative flex items-center gap-2.5 min-h-11 px-3 text-sm whitespace-nowrap transition-colors lg:rounded-box ${
                    on
                      ? "font-bold text-pine-950 lg:bg-pine-50 after:absolute after:left-2 after:right-2 after:bottom-0 after:h-0.5 after:bg-pine-900 lg:after:hidden"
                      : "font-medium text-bark-600 hover:text-pine-950 lg:hover:bg-surface-muted"
                  }`}
                >
                  <Icon className={`hidden lg:block w-4 h-4 shrink-0 ${on ? "text-pine-900" : "text-bark-400"}`} />
                  <span className="lg:flex-1">{tab.label}</span>
                  {n > 0 && (
                    <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${tab.key === "notifications" ? "bg-honey-600 text-white" : "bg-surface-muted text-bark-700"}`}>
                      {n}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              className="hidden lg:flex items-center gap-2.5 min-h-11 px-3 mt-1 pt-1 border-t border-surface-border text-sm font-medium text-bark-600 hover:text-red-700 text-left"
            >
              <LogOut className="w-4 h-4 text-bark-400" /> Đăng xuất
            </button>
          </nav>
        </aside>

        <div className="mt-5 lg:mt-0 min-w-0 space-y-5">
          {!isDetailPage && (
            <header className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-pine-950 font-display">{active.title}</h1>
              <p className="text-sm text-bark-600">{active.description}</p>
            </header>
          )}
          {children}
          <div className="lg:hidden pt-4 border-t border-surface-border">
            <button type="button" onClick={() => setConfirmLogout(true)} className="flex items-center gap-2 min-h-11 text-sm font-semibold text-red-700">
              <LogOut className="w-4 h-4" /> Đăng xuất
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Đăng xuất?"
        message="Bạn sẽ cần đăng nhập lại để xem đơn hàng và gói định kỳ."
        confirmLabel="Đăng xuất"
        onConfirm={async () => {
          setConfirmLogout(false);
          await logout();
          router.push("/");
        }}
        onClose={() => setConfirmLogout(false)}
      />
    </div>
  );
}
