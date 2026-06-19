import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: "#4f46e5",
          dark: "#4338ca",
        },
        amber: {
          brand: "#f59e0b",
        },
        saffron: "#fb923c",
      },
    },
  },
  plugins: [],
};

export default config;
