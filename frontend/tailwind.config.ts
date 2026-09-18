import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: "#0f2942",
          "navy-dark": "#091a2b",
          "navy-light": "#1c385c",
          blue: "#0284c7",
          "blue-dark": "#0369a1",
          "blue-light": "#f0f9ff",
          "blue-hover": "#0277b5",
        },
      },
    },
  },
  plugins: [],
};
export default config;
