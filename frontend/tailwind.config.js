/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}', // Include all JS, JSX, TS, and TSX files in src directory
    './public/index.html',         // Include your index.html file if you use Tailwind classes there
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

