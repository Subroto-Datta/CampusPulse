/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        background: '#09090b', // Zinc 950
        surface: {
          DEFAULT: '#18181b', // Zinc 900
          hover: '#27272a',   // Zinc 800
          border: '#3f3f46',  // Zinc 700
        },
        primary: {
          DEFAULT: '#3b82f6', // Blue 500
          hover: '#2563eb',   // Blue 600
          glow: 'rgba(59, 130, 246, 0.5)',
        },
        text: {
          DEFAULT: '#f4f4f5', // Zinc 50
          muted: '#a1a1aa',   // Zinc 400
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
      }
    },
  },
  plugins: [],
}
