/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./events.html",
    "./news.html",
    "./directory.html",
    "./admin/**/*.html",
    "./src/**/*.{ts,js,html}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0a0e18',
          lowest: '#060910',
          low: '#0f131d',
          mid: '#171b26',
          high: '#1b1f2a',
          highest: '#262a35',
          bright: '#313540',
        },
        primary: {
          DEFAULT: '#b5c4ff',
          container: '#f5c518',
          hover: '#ffd545',
          dim: '#f0c110',
          dark: '#c9960a',
        },
        secondary: {
          DEFAULT: '#00dbe9',
          container: '#00a0aa',
          light: '#7df4ff',
          dim: '#00b4c0',
        },
        navy: {
          DEFAULT: '#0a2463',
          deep: '#061539',
          mid: '#1b4fd8',
          light: '#4a7fe5',
          pale: '#ebf1fc',
        },
        'on-surface': '#dfe2f1',
        'on-surface-variant': '#94a3b8',
      },
      fontFamily: {
        headline: ['"Sora"', '"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['"Space Grotesk"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        serif: ['"Fraunces"', 'Georgia', 'serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        glow: '0 0 24px rgba(245, 197, 24, 0.32)',
        'glow-cyan': '0 0 24px rgba(0, 219, 233, 0.32)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        pulseSlow: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
};
