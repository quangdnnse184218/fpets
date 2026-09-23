"use client";

import React from "react";

export type BadgeVariant = "default" | "neutral" | "pine" | "honey" | "success" | "warning" | "danger";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-muted text-bark-700 border border-surface-border",
  neutral: "bg-surface-muted text-bark-700",
  pine: "bg-pine-50 text-pine-900 border border-pine-200/80",
  honey: "bg-honey-50 text-honey-800 border border-honey-200",
  success: "bg-grass-50 text-grass-700 border border-grass-200",
  warning: "bg-amber-50 text-amber-800 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-[11px] px-2 py-0.5 rounded-tag font-medium",
  md: "text-xs px-2.5 py-1 rounded-tag font-semibold",
};

export function Badge({
  variant = "default",
  size = "sm",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 leading-tight select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
