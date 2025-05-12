module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        darkGray: "#1a1a1a",
        purple: "#6a0dad",
        orange: "#ff4500",
      },
      fontFamily: {
        sans: ["CustomFont", "sans-serif"],
      },
    },
  },
  plugins: [],
};
