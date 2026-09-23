"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { UserCheck, Shield, ShoppingBag, LogOut, LogIn } from "lucide-react";

export default function DemoRoleSwitcher() {
  const { isLoggedIn, user, login, logout, toggleRole } = useApp();
  const pathname = usePathname();
  const isAdminPath = pathname.startsWith("/admin");

  return (
    <div className="bg-pine-950 text-pine-100 px-3 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-pine-800/80">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-grass-600 animate-pulse" />
        <span className="font-medium text-white">Chế độ Demo:</span>
        <span className="text-pine-200">
          {isLoggedIn ? (
            <>
              Đăng nhập với <strong className="text-butter-200">{user.name}</strong> ({user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'})
            </>
          ) : (
            <span className="text-bark-500">Khách vãng lai (Chưa đăng nhập)</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Nút đăng nhập/đăng xuất */}
        <button
          onClick={isLoggedIn ? logout : login}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-pine-800 hover:bg-pine-700 text-pine-100 transition-colors"
        >
          {isLoggedIn ? (
            <>
              <LogOut className="w-3 h-3" />
              <span>Đăng xuất</span>
            </>
          ) : (
            <>
              <LogIn className="w-3 h-3 text-butter-200" />
              <span>Đăng nhập mẫu</span>
            </>
          )}
        </button>

        {/* Nút chuyển đổi vai trò */}
        {isLoggedIn && (
          <button
            onClick={toggleRole}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-pine-800 hover:bg-pine-700 text-pine-100 transition-colors"
          >
            <UserCheck className="w-3 h-3 text-butter-200" />
            <span>Đổi sang {user.role === 'admin' ? 'Khách' : 'Admin'}</span>
          </button>
        )}

        {/* Nút nhảy nhanh vào Admin Dashboard */}
        {isAdminPath ? (
          <Link
            href="/"
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-honey-600 hover:bg-honey-500 text-white font-medium transition-colors"
          >
            <ShoppingBag className="w-3 h-3" />
            <span>Xem Cửa hàng Khách</span>
          </Link>
        ) : (
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-pine-800 hover:bg-pine-700 text-butter-200 font-medium transition-colors"
          >
            <Shield className="w-3 h-3" />
            <span>Vào Admin Dashboard</span>
          </Link>
        )}
      </div>
    </div>
  );
}
