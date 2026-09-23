"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
  children: React.ReactNode;
}

/**
 * Card: Chỉ dùng cho 1 đơn vị độc lập có thể thao tác riêng
 * (VD: card chọn pet, card sản phẩm trong danh sách, card tùy chọn thanh toán)
 */
export function Card({
  interactive = false,
  selected = false,
  className = "",
  children,
  ...props
}: CardProps) {
  const base = "rounded-box border transition-all";
  const stateStyle = selected
    ? "border-pine-900 bg-pine-50/40 ring-2 ring-pine-900/10 shadow-xs"
    : interactive
    ? "border-surface-border bg-surface-card hover:border-pine-800/40 hover:bg-surface-muted/60 shadow-xs cursor-pointer"
    : "border-surface-border bg-surface-card shadow-xs";

  return (
    <div className={`${base} ${stateStyle} ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "plain" | "divided" | "tinted";
  children: React.ReactNode;
}

/**
 * Section: Dành cho các khối tóm tắt, feature liệt kê, banner thông tin
 * Dùng khoảng cách, đường kẻ mảnh hoặc nền màu nhạt để phân vùng, không lặp lại công thức card.
 */
export function Section({
  variant = "plain",
  className = "",
  children,
  ...props
}: SectionProps) {
  const variantStyles = {
    plain: "space-y-4",
    divided: "space-y-4 pb-6 border-b border-surface-border",
    tinted: "p-4 sm:p-5 rounded-container bg-surface-muted/50 border border-surface-border/60 space-y-3",
  };

  return (
    <section className={`${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </section>
  );
}

export default Card;
