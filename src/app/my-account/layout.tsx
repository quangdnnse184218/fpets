"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { Heart, Package, RefreshCw, User, Bell, LogIn, Lock } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

const ACCOUNT_TABS = [
  { href: "/my-account/pets", label: "Thú cưng của tôi", icon: Heart },
  { href: "/my-account/orders", label: "Đơn hàng & Vận chuyển", icon: Package },
  { href: "/my-account/subscriptions", label: "Gói định kỳ", icon: RefreshCw },
  { href: "/my-account/notifications", label: "Thông báo", icon: Bell },
  { href: "/my-account/profile", label: "Thông tin & Địa chỉ", icon: User },
];

export default function MyAccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoggedIn, isLoadingAuth, user, pets } = useApp();
  const [stats, setStats] = useState({ activeSubs: 0, shipping: 0 });

  const activeTab = ACCOUNT_TABS.find((t) => pathname.startsWith(t.href));

  // Trang là client component nên đặt tiêu đề tab trình duyệt ở đây
  useEffect(() => {
    document.title = `Tài khoản – ${activeTab?.label || "FPETS"} | FPETS`;
  }, [activeTab]);

  useEffect(() => {
    if (!user.id) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["dang_hoat_dong", "tam_dung", "qua_han"]),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "dang_giao"),
    ]).then(([subs, orders]) => setStats({ activeSubs: subs.count || 0, shipping: orders.count || 0 }));
  }, [user.id, pathname]);

  if (isLoadingAuth) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4" aria-busy="true">
        <div className="h-20 rounded-container bg-surface-muted animate-pulse" />
        <div className="h-72 rounded-container bg-surface-muted animate-pulse" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-pine-100 text-pine-900 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-pine-950">Vui lòng đăng nhập</h1>
        <p className="text-xs text-bark-600">Đăng nhập để quản lý hồ sơ thú cưng, đơn hàng và gói định kỳ.</p>
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

  const quickStats = [
    { label: "bé", value: pets.length, href: "/my-account/pets" },
    { label: "gói đang chạy", value: stats.activeSubs, href: "/my-account/subscriptions" },
    { label: "đơn đang giao", value: stats.shipping, href: "/my-account/orders" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8 lg:items-start">
        {/* Desktop: thanh bên cố định; mobile: thẻ gọn + tab cuộn ngang dính trên cùng */}
        <aside className="lg:sticky lg:top-28 space-y-4">
          <div className="p-4 rounded-container bg-surface-card border border-surface-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-pine-900 text-white flex items-center justify-center font-extrabold shrink-0">
                {(user.name || user.email || "F").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-pine-950 truncate">{user.name || "Khách hàng FPETS"}</p>
                <p className="text-[11px] text-bark-500 truncate">Thành viên FPETS · {user.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {quickStats.map((s) => (
                <Link key={s.label} href={s.href} className="p-2 rounded-box bg-surface-muted hover:bg-pine-50 transition-colors">
                  <span className="block text-base font-extrabold text-pine-950">{s.value}</span>
                  <span className="block text-[10px] text-bark-500 leading-tight">{s.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <nav
            aria-label="Tài khoản"
            className="sticky top-24 z-30 -mx-4 px-4 py-2 bg-surface/95 backdrop-blur-sm flex gap-2 overflow-x-auto no-scrollbar lg:static lg:mx-0 lg:p-2 lg:flex-col lg:gap-1 lg:rounded-container lg:bg-surface-card lg:border lg:border-surface-border"
          >
            {ACCOUNT_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 min-h-11 px-3.5 text-xs font-bold rounded-box whitespace-nowrap transition-colors ${
                    active ? "bg-pine-900 text-white" : "bg-surface-card text-bark-700 hover:bg-surface-muted border border-surface-border lg:border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="mt-4 lg:mt-0 min-w-0">{children}</div>
      </div>
    </div>
  );
}
