/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Inter for UI text; Source Serif 4 for display elements (wordmark, hero, titles, stat numbers).
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      colors: {
        // Material 3 navy ramp (primary = #032448, primary-container = #1f3a5f).
        navy: {
          50: '#eef2f8',
          100: '#d5e3ff',
          200: '#aec8f4',
          300: '#8ba4cf',
          400: '#5b7aa6',
          500: '#345686',
          600: '#2d476d',
          700: '#1f3a5f',
          800: '#032448',
          900: '#001c3b',
        },
        // Material 3 secondary (links / accent CTAs).
        brand: {
          50: '#eef3ff',
          100: '#dbe1ff',
          200: '#b4c5ff',
          500: '#316bf3',
          600: '#0051d5',
          700: '#003ea8',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 36 67 / 0.04), 0 1px 3px 0 rgb(15 36 67 / 0.06)',
        cardhover: '0 4px 12px -2px rgb(15 36 67 / 0.12)',
      },
    },
  },
  plugins: [],
};
