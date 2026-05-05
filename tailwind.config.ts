import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-light": "var(--color-primary-light)",
        success: "var(--color-success)",
        "success-bg": "var(--color-success-bg)",
        warning: "var(--color-warning)",
        "warning-bg": "var(--color-warning-bg)",
        danger: "var(--color-danger)",
        "danger-bg": "var(--color-danger-bg)",
        ready: "var(--color-ready)",
        purple: "var(--color-purple)",
        "purple-bg": "var(--color-purple-bg)",
        yellow: "var(--color-yellow)",
        "yellow-bg": "var(--color-yellow-bg)",
        "ready-bg": "var(--color-ready-bg)",
        "muted-bg": "var(--color-muted-bg)",
        surface: "var(--color-surface)",
        bg: "var(--color-bg)",
        "surface-secondary": "var(--color-surface-secondary)",
        border: "var(--color-border)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
        "chip-bg": "var(--color-chip-bg)",
        "surface-subtle": "var(--color-surface-subtle)",
      },
    },
  },
  plugins: [],
};
export default config;
