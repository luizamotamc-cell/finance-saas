/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f4f7f6',   // fundo da página
        ink: '#14232a',     // texto principal
        muted: '#5b6b70',   // texto secundário
        line: '#dbe3e1',    // bordas e divisórias
        income: '#1f8a5b',  // receitas
        expense: '#c0392b', // despesas
        brand: {
          DEFAULT: '#0e5a6b',
          dark: '#0a4350',
          soft: '#e3f0f2',
        },
      },
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};