import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#151515",
        paper: "#f7f5f0",
        line: "#dedbd2",
        accent: "#d95f35",
        moss: "#486456"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(34, 31, 28, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
