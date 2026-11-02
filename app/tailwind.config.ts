import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        care: {
          50: "#eefaf6",
          100: "#d6f3e9",
          200: "#b0e7d6",
          300: "#7bd4bd",
          400: "#45baa0",
          500: "#269f87",
          600: "#1a806e",
          700: "#17665a",
          800: "#175249",
          900: "#15443e",
          950: "#0b2723",
        },
        coral: {
          50: "#fff3f1",
          100: "#ffe3de",
          200: "#ffcbc3",
          300: "#ffa79a",
          400: "#ff7360",
          500: "#f84830",
          600: "#e52d14",
          700: "#c1220d",
          800: "#a02010",
          900: "#842114",
        },
        ink: {
          50: "#f6f8f7",
          100: "#e9eeec",
          200: "#d3ddd9",
          300: "#afc1bb",
          400: "#839e97",
          500: "#64847c",
          600: "#4e6a63",
          700: "#415651",
          800: "#374844",
          900: "#303e3b",
          950: "#182320",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 40, 34, 0.04), 0 12px 32px -16px rgba(16, 40, 34, 0.18)",
        lift: "0 24px 60px -28px rgba(16, 40, 34, 0.35)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
