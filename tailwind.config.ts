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
          500: "#E67E22",
          600: "#C86218",
          700: "#A3470D",
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
        bark: {
          500: "#78716C",
          700: "#44403C",
          800: "#292524",
          900: "#1C1917",
        },
        grass: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          600: "#16A34A",
          700: "#15803D",
        },
      },
      fontFamily: {
        sans: ["var(--font-vietnam)", "system-ui", "sans-serif"],
        display: ["var(--font-vietnam)", "system-ui", "sans-serif"],
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
