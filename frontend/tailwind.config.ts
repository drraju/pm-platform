import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        brand: "#0f766e",
        surface: "#f7f8fb",
        ui: {
          border: "#e2e8f0",
          canvas: "#f7f8fb",
          ink: "#17202a",
          muted: "#64748b",
          surface: "#ffffff",
        },
        status: {
          danger: {
            DEFAULT: "#b91c1c",
            border: "#fecaca",
            indicator: "#ef4444",
            surface: "#fef2f2",
          },
          success: {
            DEFAULT: "#047857",
            border: "#a7f3d0",
            indicator: "#10b981",
            strong: "#065f46",
            surface: "#ecfdf5",
          },
          warning: {
            DEFAULT: "#b45309",
            border: "#fde68a",
            indicator: "#f59e0b",
            strong: "#92400e",
            surface: "#fffbeb",
          },
        },
      },
      borderRadius: {
        ui: "0.375rem",
        "ui-lg": "0.5rem",
      },
      spacing: {
        ui: "1.25rem",
      },
      boxShadow: {
        soft: "0 12px 30px rgba(15, 23, 42, 0.08)",
        ui: "0 12px 30px rgba(15, 23, 42, 0.08)",
        "ui-subtle": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      fontSize: {
        "ui-section": [
          "1.125rem",
          { fontWeight: "600", lineHeight: "1.75rem" },
        ],
      },
      transitionDuration: {
        ui: "150ms",
      },
    },
  },
  plugins: [],
};

export default config;
