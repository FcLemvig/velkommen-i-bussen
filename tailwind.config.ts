import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#284532",
        bus: "#FFD13B",
        fjord: "#5E9F44",
        leaf: "#3F7D35",
        cream: "#FFF9DE"
      }
    }
  },
  plugins: []
};

export default config;
