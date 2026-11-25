/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        statePrimary: '#1e4b7a',
        partyPrimary: '#b91c1c',
      },
      fontFamily: {
        times: ['"Times New Roman"', 'Times', 'serif'],
      }
    },
  },
  plugins: [],
}
