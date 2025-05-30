/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Removed custom pastel colors, reverting to default Tailwind palette
    },
  },
  plugins: [],
}
