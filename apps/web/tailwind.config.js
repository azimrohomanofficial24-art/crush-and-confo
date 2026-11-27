/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F7F5FF',
        surface: '#FFFFFF',
        pink: { DEFAULT: '#F52D91', soft: '#FDE7F2' },
        purple: { DEFAULT: '#873BFA', soft: '#E9DFFF' },
        lavender: '#E9DFFF',
        navy: '#17142C',
        ink: '#211B3B',
        muted: '#77728C',
        success: '#20B981',
        warning: '#F5A623',
        error: '#E84B65',
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(23, 20, 44, 0.08)',
        soft: '0 4px 20px rgba(23, 20, 44, 0.06)',
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
}
