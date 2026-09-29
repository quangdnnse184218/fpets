"use client";

import React from "react";
import Link from "next/link";

// Hệ thống nút dùng chung toàn site:
// primary   – 1 hành động chính mỗi màn hình (Đặt hàng, Thêm vào giỏ, Lưu)
// accent    – CHỈ cho Pet Quiz / khuyến mãi
// secondary – Xem thêm, Quay lại, Hủy (đóng modal)
// danger    – Xóa, Hủy gói, Đăng xuất (luôn đi kèm xác nhận)
// link      – điều hướng phụ dạng chữ
export type ButtonVariant = "primary" | "accent" | "secondary" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-pine-900 hover:bg-pine-800 text-white shadow-xs",
  accent: "bg-honey-500 hover:bg-honey-600 text-pine-950 shadow-xs",
  secondary: "bg-white hover:bg-pine-50 text-pine-900 border border-pine-800/40",
  danger: "bg-white hover:bg-red-50 text-red-700 border border-red-300",
  link: "text-pine-900 underline-offset-4 hover:underline px-0",
};

// min-h-11 = 44px: vùng chạm tối thiểu trên mobile
const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-11 md:min-h-9 px-3 text-xs",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-sm",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-box font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  return `${base} ${VARIANT[variant]} ${variant === "link" ? "min-h-11 md:min-h-0 text-sm" : SIZE[size]} ${extra}`.trim();
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText = "Đang xử lý…",
  className = "",
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass(variant, size, className)} {...props}>
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

// Nút chỉ có icon: bắt buộc có nhãn cho trình đọc màn hình và tooltip
export function IconButton({
  label,
  className = "",
  children,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center min-w-11 min-h-11 md:min-w-9 md:min-h-9 rounded-box text-bark-600 hover:bg-surface-muted hover:text-pine-900 transition-colors disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
