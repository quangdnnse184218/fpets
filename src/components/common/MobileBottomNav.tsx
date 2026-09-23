"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Home, Gift, ShoppingBag, ShoppingCart, User } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { cart } = useApp();
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Không hiện bottom bar nếu đang ở màn hình admin để tránh che khuất thao tác
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const navItems = [
    { href: "/", label: "Trang chủ", icon: Home },
    { href: "/boxes", label: "Mystery Box", icon: Gift },
    { href: "/shop", label: "Shop lẻ", icon: ShoppingBag },
    { href: "/cart", label: "Giỏ hàng", icon: ShoppingCart, badge: totalCartItems },
    { href: "/my-account/pets", label: "Tài khoản", icon: User },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-surface-card border-t border-surface-border md:hidden safe-area-bottom shadow-lg">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center relative transition-colors ${
                active ? "text-pine-950 font-bold" : "text-bark-500 hover:text-bark-900"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-honey-600 text-white text-[9px] font-extrabold flex items-center justify-center leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-[56px] text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
