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
        ink: "#0E255B",
        bus: "#F5861F",
        fjord: "#29B5B3",
        leaf: "#F5861F",
        cream: "#FFF8EF",
        brown: "#2A0908",
        softGrey: "#D9D9D6"
      }
    }
  },
  plugins: []
};

export default config;
