/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      width: {
        'a4-half': '210mm',
      },
      height: {
        'a4-half': '148.5mm',
      }
    },
  },
  plugins: [],
}
