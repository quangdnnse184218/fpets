"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PackageSearch, ClipboardList, Warehouse, Shield, Store } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    { href: "/admin/dashboard", label: "Tổng quan & Thống kê", icon: LayoutDashboard },
    { href: "/admin/box-curation", label: "Hàng chờ tuyển chọn Box", icon: PackageSearch, highlight: true },
    { href: "/admin/orders", label: "Quản lý Đơn hàng", icon: ClipboardList },
    { href: "/admin/products", label: "Sản phẩm & Tồn kho", icon: Warehouse },
  ];

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col md:flex-row">
      {/* Sidebar Admin Desktop */}
      <aside className="w-full md:w-64 bg-pine-950 text-pine-100 p-4 sm:p-5 flex flex-col justify-between border-r border-pine-900 shrink-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-box bg-pine-900 text-white font-bold flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </span>
              <div>
                <span className="font-extrabold text-base text-white tracking-tight font-display">
                  FPETS ADMIN
                </span>
                <p className="text-[10px] text-pine-400">Hệ thống quản trị vận hành</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1 text-xs">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-box font-medium transition-colors ${
                    active
                      ? "bg-pine-800 text-white font-bold"
                      : "text-pine-300 hover:text-white hover:bg-pine-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && (
                    <span className="w-2 h-2 rounded-full bg-honey-500 animate-ping" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Nút quay về website */}
        <div className="pt-4 border-t border-pine-900 mt-6">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-box bg-pine-900 hover:bg-pine-850 text-pine-200 hover:text-white text-xs font-semibold transition-colors"
          >
            <Store className="w-3.5 h-3.5 text-honey-400" />
            <span>Quay lại giao diện Khách</span>
          </Link>
        </div>
      </aside>

      {/* Nội dung chính các trang Admin */}
      <div className="flex-1 p-4 sm:p-8 max-w-6xl overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
