import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        panel: "#111317",
        panelSoft: "#171a20",
        borderStrong: "#2b3038",
        profit: "#39d98a",
        loss: "#ff5c7a",
        accent: "#5ed4ff",
        caution: "#f6c75c"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(94,212,255,0.08), 0 18px 60px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};

export default config;

