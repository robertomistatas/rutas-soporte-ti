/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'pastel-blue': '#b3c7f7',
        'pastel-navy': '#a7b8c9',
        'pastel-green': '#b7f7c0',
        'pastel-yellow': '#fff6b3',
        'pastel-red': '#f7b3b3',
      },
    },
  },
  plugins: [],
}
