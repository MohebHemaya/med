import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary colors
        primary: {
          900: '#012A4A', // Darkest blue
          700: '#014F86', // Dark blue
          500: '#2C7DA0', // Medium blue
          300: '#61A5C2', // Light blue
        },
        // Neutral colors
        neutral: {
          950: '#1E1E1E', // Black
          900: '#404040', // Dark grey
          700: '#626262', // Medium dark grey
          500: '#838383', // Medium grey
          300: '#A5A5A5', // Medium light grey
          200: '#C7C7C7', // Light grey
          100: '#E8E8E8', // Very light grey
          50: '#FFFFFF',  // White
        },
        // Semantic colors
        warning: '#D9C80E',  // Yellow
        error: '#C01616',    // Red
        success: '#2CBE36',  // Green
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
