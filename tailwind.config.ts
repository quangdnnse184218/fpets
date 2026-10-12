import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Màu theo logo mới (12/10/2026): tên "pine" giữ nguyên để không phải sửa toàn bộ class.
        // Sắc nhạt (50–500) là vàng logo, dùng cho nền ô được chọn và chữ trên nền tối;
        // sắc đậm (700–950) là đen ấm như nét viền logo, dùng cho chữ, nút chính, viền.
        pine: {
          50: "#FFF8E6",
          100: "#FEF1CB",
          200: "#FCE29A",
          300: "#F9D06A",
          400: "#F6BB39",
          500: "#C2860D",
          700: "#4A4134",
          800: "#2E2920",
          900: "#1E1B15",
          950: "#13110D",
        },
        // Màu nhấn: vàng của logo
        honey: {
          50: "#FFFAEB",
          100: "#FEF1CB",
          200: "#FCE29A",
          300: "#F9D06A",
          400: "#F6BB39",
          500: "#E5A520",
          600: "#C2860D",
          700: "#96660A",
          800: "#6E4A08",
          900: "#4D3406",
        },
        butter: {
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
        },
        // Nền kem như nền logo
        surface: {
          DEFAULT: "#F8F5EA",
          card: "#FFFFFF",
          muted: "#F2EDDC",
          border: "#E7DFC8",
        },
        // Chữ phụ: bark-500 trở lên đạt tương phản 4.5:1 trên mọi nền sáng của site (trắng, surface, surface-muted).
        // bark-400 chỉ dùng cho icon, trạng thái tắt và giá gạch ngang (3:1), không dùng cho chữ cần đọc.
        bark: {
          100: "#F5F5F4",
          200: "#E7E5E4",
          300: "#D6D3D1",
          400: "#8C857F",
          500: "#6E6762",
          600: "#57534E",
          700: "#44403C",
          800: "#292524",
          900: "#1C1917",
          950: "#0C0A09",
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
