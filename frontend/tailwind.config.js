/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"IBM Plex Sans Arabic"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Calm clinical teal used for primary actions and accents
        brand: {
          50: '#effaf8',
          100: '#d6f2ec',
          200: '#ade4d9',
          300: '#7bcfc1',
          400: '#4bb4a6',
          500: '#2f998c',
          600: '#237b72',
          700: '#1f635d',
          800: '#1d504c',
          900: '#1b4340',
        },
        canvas: '#f6f8f7',
      },
      boxShadow: {
        card: '0 1px 2px rgb(16 40 36 / 0.04), 0 4px 16px -4px rgb(16 40 36 / 0.08)',
        lift: '0 2px 4px rgb(16 40 36 / 0.06), 0 12px 32px -8px rgb(16 40 36 / 0.16)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
