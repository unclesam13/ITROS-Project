/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          base: "#0d0e10",
          sidebar: "#1D1F22",
          card: "#22252a",
          elevated: "#2a2d35",
          border: "#333941",
          hover: "#2c3038",
        },
        accent: {
          DEFAULT: "#0052CC",
          bright: "#0065FF",
          muted: "#1a3a6e",
        },
        brand: {
          50: "#1a2d4d",
          100: "#1e3a5f",
          500: "#3b82f6",
          600: "#0052CC",
          700: "#0047b3",
        },
        chart: {
          blue: "#3B82F6",
          green: "#22c55e",
          orange: "#f59e0b",
          purple: "#a855f7",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
      },
    },
  },
  plugins: [],
};
