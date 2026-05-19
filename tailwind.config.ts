import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 1px 2px rgba(0, 0, 0, 0.04), 0 18px 50px rgba(0, 0, 0, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
