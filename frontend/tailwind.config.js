/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', '"IBM Plex Sans Arabic"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Bio-luminescent medical green
        brand: {
          50: '#eafff6',
          100: '#c9ffe8',
          200: '#97fbd3',
          300: '#5cf2bb',
          400: '#2ee6a6',
          500: '#12c98c',
          600: '#09a473',
          700: '#0a815d',
          800: '#0d664c',
          900: '#0d5441',
        },
        // Deep "operating theatre" night tones
        void: {
          950: '#020a08',
          900: '#04110d',
          800: '#071a15',
          700: '#0b241d',
          600: '#123228',
        },
        pulse: '#38e1ff', // cyan accent for data / telemetry
      },
      boxShadow: {
        card: '0 1px 0 rgb(255 255 255 / 0.04) inset, 0 20px 40px -24px rgb(0 0 0 / 0.8)',
        glow: '0 0 0 1px rgb(46 230 166 / 0.35), 0 0 24px -2px rgb(46 230 166 / 0.45)',
        'glow-lg': '0 0 0 1px rgb(46 230 166 / 0.25), 0 0 60px -10px rgb(46 230 166 / 0.55)',
        lift: '0 1px 0 rgb(255 255 255 / 0.06) inset, 0 30px 60px -30px rgb(0 0 0 / 0.9), 0 0 40px -20px rgb(46 230 166 / 0.35)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.985)', filter: 'blur(6px)' },
          '100%': { opacity: '1', transform: 'none', filter: 'blur(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 1px rgb(46 230 166 / 0.35), 0 0 18px -4px rgb(46 230 166 / 0.5)' },
          '50%': { boxShadow: '0 0 0 1px rgb(46 230 166 / 0.6), 0 0 34px 0 rgb(46 230 166 / 0.7)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(4%, 3%, 0) scale(1.08)' },
        },
        'alert-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '60%': { opacity: '1', transform: 'scale(1.01)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'fade-in': 'fade-in 0.6s ease-out backwards',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        drift: 'drift 18s ease-in-out infinite',
        'alert-in': 'alert-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) backwards',
      },
    },
  },
  plugins: [],
}
