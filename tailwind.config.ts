import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Sáng / tối: màu là biến CSS (globals.css), lớp "dark" trên <html> đổi bộ giá trị
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Chữ đen cố định, không đổi theo chế độ tối (chữ trên nút vàng)
        ink: "#13110D",
        // Màu theo logo mới (12/10/2026): tên "pine" giữ nguyên để không phải sửa toàn bộ class.
        // Sắc nhạt (50–500) là vàng logo, dùng cho nền ô được chọn và chữ trên nền tối;
        // sắc đậm (700–950) là đen ấm như nét viền logo, dùng cho chữ, nút chính, viền.
        pine: {
          50: "rgb(var(--c-pine-50) / <alpha-value>)",
          100: "rgb(var(--c-pine-100) / <alpha-value>)",
          200: "rgb(var(--c-pine-200) / <alpha-value>)",
          300: "rgb(var(--c-pine-300) / <alpha-value>)",
          400: "rgb(var(--c-pine-400) / <alpha-value>)",
          500: "rgb(var(--c-pine-500) / <alpha-value>)",
          700: "rgb(var(--c-pine-700) / <alpha-value>)",
          800: "rgb(var(--c-pine-800) / <alpha-value>)",
          900: "rgb(var(--c-pine-900) / <alpha-value>)",
          950: "rgb(var(--c-pine-950) / <alpha-value>)",
        },
        // Màu nhấn: vàng của logo
        honey: {
          50: "rgb(var(--c-honey-50) / <alpha-value>)",
          100: "rgb(var(--c-honey-100) / <alpha-value>)",
          200: "rgb(var(--c-honey-200) / <alpha-value>)",
          300: "rgb(var(--c-honey-300) / <alpha-value>)",
          400: "rgb(var(--c-honey-400) / <alpha-value>)",
          500: "rgb(var(--c-honey-500) / <alpha-value>)",
          600: "rgb(var(--c-honey-600) / <alpha-value>)",
          700: "rgb(var(--c-honey-700) / <alpha-value>)",
          800: "rgb(var(--c-honey-800) / <alpha-value>)",
          900: "rgb(var(--c-honey-900) / <alpha-value>)",
        },
        butter: {
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
        },
        // Nền kem như nền logo
        surface: {
          DEFAULT: "rgb(var(--c-surface-DEFAULT) / <alpha-value>)",
          card: "rgb(var(--c-surface-card) / <alpha-value>)",
          muted: "rgb(var(--c-surface-muted) / <alpha-value>)",
          border: "rgb(var(--c-surface-border) / <alpha-value>)",
        },
        // Chữ phụ: bark-500 trở lên đạt tương phản 4.5:1 trên mọi nền sáng của site (trắng, surface, surface-muted).
        // bark-400 chỉ dùng cho icon, trạng thái tắt và giá gạch ngang (3:1), không dùng cho chữ cần đọc.
        bark: {
          100: "rgb(var(--c-bark-100) / <alpha-value>)",
          200: "rgb(var(--c-bark-200) / <alpha-value>)",
          300: "rgb(var(--c-bark-300) / <alpha-value>)",
          400: "rgb(var(--c-bark-400) / <alpha-value>)",
          500: "rgb(var(--c-bark-500) / <alpha-value>)",
          600: "rgb(var(--c-bark-600) / <alpha-value>)",
          700: "rgb(var(--c-bark-700) / <alpha-value>)",
          800: "rgb(var(--c-bark-800) / <alpha-value>)",
          900: "rgb(var(--c-bark-900) / <alpha-value>)",
          950: "rgb(var(--c-bark-950) / <alpha-value>)",
        },
        grass: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532D",
          950: "#052E16",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        badge: "4px",
        box: "12px",
        tag: "9999px",
        container: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
