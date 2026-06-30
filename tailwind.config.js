/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ticano: {
          red: '#CE313C',
          'red-dark': '#a8252f',
          'red-light': '#fce8ea',
          gray: '#808686',
          'gray-dark': '#5f6464',
          'gray-light': '#a6abab',
          charcoal: '#373435',
          navy: '#373435',
          teal: '#CE313C',
          bg: '#F7F7F8',
          'bg-light': '#FFFFFF',
          'text-dark': '#373435',
          'dark-bg': '#1A1A1B',
          'dark-card': '#262627',
        },
        dark: { bg: '#1A1A1B', card: '#262627' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        'spin-settle': {
          '0%':   { transform: 'rotate(-220deg) scale(0.6)', opacity: '0' },
          '60%':  { transform: 'rotate(8deg) scale(1.05)', opacity: '1' },
          '100%': { transform: 'rotate(0deg) scale(1)', opacity: '1' },
        },
        'fade-up': {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-right': {
          '0%':   { transform: 'translateX(30px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%':   { transform: 'translateX(-30px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'scale-in': {
          '0%':   { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(206,49,60,0)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(206,49,60,0.15)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'bounce-in': {
          '0%':   { transform: 'scale(0.3)', opacity: '0' },
          '50%':  { transform: 'scale(1.05)' },
          '70%':  { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-down': {
          '0%':   { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'counter': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'orb-move': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(30px, -20px) scale(1.1)' },
          '66%':      { transform: 'translate(-20px, 15px) scale(0.95)' },
        },
      },
      animation: {
        'spin-settle':    'spin-settle 1s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-up':        'fade-up 0.5s ease-out both',
        'fade-in':        'fade-in 0.4s ease-out both',
        'slide-in-right': 'slide-in-right 0.4s ease-out both',
        'slide-in-left':  'slide-in-left 0.4s ease-out both',
        'scale-in':       'scale-in 0.3s ease-out both',
        'float':          'float 4s ease-in-out infinite',
        'pulse-glow':     'pulse-glow 2s ease-in-out infinite',
        'shimmer':        'shimmer 2s linear infinite',
        'bounce-in':      'bounce-in 0.6s ease-out both',
        'slide-down':     'slide-down 0.3s ease-out both',
        'counter':        'counter 0.5s ease-out both',
        'orb-move':       'orb-move 8s ease-in-out infinite',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
