/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "noisia-bg": "#050505",
        "noisia-fg": "#f5f5f5",
        "noisia-accent": "#ccff00",
        "noisia-danger": "#ff0044",
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        sans: ["Space Grotesk", "sans-serif"],
      },
    },
  },
  plugins: [],
};
