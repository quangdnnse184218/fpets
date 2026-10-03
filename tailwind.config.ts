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
        pine: {
          50: "#F2F7F5",
          100: "#E1EDE8",
          200: "#C2DBD2",
          300: "#9CC4B6",
          400: "#7DB3A2",
          500: "#2D6A5B",
          700: "#235347",
          800: "#1E4239",
          900: "#17342C",
          950: "#0C1E19",
        },
        honey: {
          50: "#FFFDF7",
          100: "#FEF7E6",
          200: "#FDECC4",
          300: "#FAD893",
          400: "#F0A04B",
          500: "#E67E22",
          600: "#C86218",
          700: "#A3470D",
          800: "#7C350A",
          900: "#5C2707",
        },
        butter: {
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
        },
        surface: {
          DEFAULT: "#FAF9F6",
          card: "#FFFFFF",
          muted: "#F3F1EC",
          border: "#E7E3DA",
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
