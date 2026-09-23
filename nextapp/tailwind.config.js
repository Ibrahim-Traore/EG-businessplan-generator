/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        'eg-dark':  '#455F51',
        'eg-mid':   '#549E39',
        'eg-deep':  '#2D5016',
        'eg-muted': '#3D6B4F',
      },
      fontFamily: {
        sans: ['Calibri', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
