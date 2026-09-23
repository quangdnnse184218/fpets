"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Heart, Package, RefreshCw, User, LogIn, Lock } from "lucide-react";

export default function MyAccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoggedIn, user, login } = useApp();

  const navTabs = [
    { href: "/my-account/pets", label: "Thú cưng của tôi", icon: Heart },
    { href: "/my-account/orders", label: "Đơn hàng & Tracking", icon: Package },
    { href: "/my-account/subscriptions", label: "Gói định kỳ", icon: RefreshCw },
    { href: "/my-account/profile", label: "Thông tin & Địa chỉ", icon: User },
  ];

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-pine-100 text-pine-900 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-pine-950">Vui lòng đăng nhập</h1>
        <p className="text-xs text-bark-600">
          Bạn cần đăng nhập tài khoản FPETS để quản lý hồ sơ thú cưng, xem lịch sử đơn hàng và gói định kỳ.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Link
            href="/login?redirect=/my-account/pets"
            className="px-5 py-2.5 rounded-xl bg-pine-900 hover:bg-pine-800 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5 text-honey-300" />
            <span>Đăng nhập ngay</span>
          </Link>
          <Link
            href="/register?redirect=/my-account/pets"
            className="px-5 py-2.5 rounded-xl border border-surface-border bg-white hover:bg-surface-muted text-bark-800 text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <span>Đăng ký tài khoản</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header Account */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-container bg-surface-card border border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-pine-900 text-honey-200 flex items-center justify-center font-extrabold text-base">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-pine-950">{user.name}</h1>
            <p className="text-xs text-bark-500">{user.phone} · {user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-tag bg-pine-100 text-pine-800 font-bold">
            Thành viên FPETS
          </span>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex overflow-x-auto gap-2 border-b border-surface-border pb-2 no-scrollbar">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-box whitespace-nowrap transition-colors ${
                active
                  ? "bg-pine-900 text-white"
                  : "bg-surface-card text-bark-700 hover:bg-surface-muted border border-surface-border"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div>{children}</div>
    </div>
  );
}
