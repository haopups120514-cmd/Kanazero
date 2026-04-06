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
        bg: {
          DEFAULT: "rgb(var(--bg) / <alpha-value>)",
          card:    "rgb(var(--bg-card) / <alpha-value>)",
          hover:   "rgb(var(--bg-hover) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          dim:     "rgb(var(--accent-dim) / <alpha-value>)",
          glow:    "rgb(var(--accent-glow) / <alpha-value>)",
        },
        success:    "rgb(var(--success) / <alpha-value>)",
        error:      "rgb(var(--error) / <alpha-value>)",
        muted:      "rgb(var(--muted) / <alpha-value>)",
        surface:    "rgb(var(--surface) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "monospace"],
        jp:   ["var(--font-jp)", "Noto Sans JP", "sans-serif"],
        sans: ["var(--font-jp)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.15s ease-in-out",
        "slide-up": "slideUp 0.2s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
