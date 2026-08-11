/** @type {import('tailwindcss').Config} */
// Token-backed colour. Channels come from a CSS variable so the value flips
// with the theme, while <alpha-value> keeps bg-surface/60 working.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Inter for UI text; Source Serif 4 for display elements (wordmark, hero, titles, stat numbers).
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      colors: {
        // --- Semantic roles (theme-aware, see src/index.css) ---
        bg: token('bg'),
        surface: {
          DEFAULT: token('surface'),
          2: token('surface-2'),
          3: token('surface-3'),
        },
        border: {
          DEFAULT: token('border'),
          subtle: token('border-subtle'),
        },
        fg: {
          DEFAULT: token('fg'),
          muted: token('fg-muted'),
          subtle: token('fg-subtle'),
        },
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          fg: token('accent-fg'),
          soft: token('accent-soft'),
          softfg: token('accent-soft-fg'),
        },
        chrome: {
          DEFAULT: token('chrome'),
          fg: token('chrome-fg'),
          muted: token('chrome-muted'),
        },

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
        // KNUST institutional palette. The university's colours are lust (red),
        // black, forest green and yellow; `knust` is a ramp around the official
        // forest green (#228b22), `gold` around the Golden Stool yellow.
        knust: {
          50: '#eef7ee',
          100: '#d6ecd7',
          200: '#a9d8ab',
          300: '#74bd78',
          400: '#44a24b',
          500: '#228b22',
          600: '#1a6f1f',
          700: '#15571a',
          800: '#114516',
          900: '#0b2f0f',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f5b301',
          600: '#d99700',
          700: '#a97300',
        },
        lust: '#e62020',
        // Near-black desaturated green for surfaces that stay dark in both
        // themes: the app header and the auth photo scrim. Deliberately low
        // chroma so a large area of it does not read as "a green block".
        ink: {
          DEFAULT: '#0d2a1c',
          900: '#081a12',
          700: '#154f2f',
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
