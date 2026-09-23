"use client";

import React from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-pine-900 hover:bg-pine-800 text-white font-bold shadow-sm disabled:bg-pine-900/50",
  secondary: "bg-surface-card hover:bg-surface-muted text-bark-800 border border-surface-border font-bold disabled:opacity-50",
  outline: "border border-pine-900 text-pine-900 hover:bg-pine-50 font-bold disabled:opacity-50",
  ghost: "text-bark-700 hover:bg-surface-muted font-medium hover:text-bark-900 disabled:opacity-50",
  danger: "bg-red-50 text-red-700 hover:bg-red-100 font-bold border border-red-200 disabled:opacity-50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5 rounded-box",
  md: "text-xs sm:text-sm px-4 py-2.5 rounded-box",
  lg: "text-sm sm:text-base px-6 py-3.5 rounded-box",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
