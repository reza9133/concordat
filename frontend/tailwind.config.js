/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F0EEF8',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#6C47FF',
          dark: '#4F28CC',
        },
        secondary: '#10B981',
        accent: '#F59E0B',
        danger: '#EF4444',
        'text-primary': '#1A1035',
        'text-secondary': '#6B7280',
        border: '#E5E1F8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6C47FF 0%, #A855F7 50%, #EC4899 100%)',
        'gradient-brand-hover': 'linear-gradient(135deg, #4F28CC 0%, #9333EA 50%, #DB2777 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-out-right': 'slideOutRight 0.3s ease-in',
        'count-up': 'countUp 1s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'bounce-dot': 'bounceDot 1.4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0)', opacity: '0.5' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(108, 71, 255, 0.08)',
        'glass-hover': '0 16px 48px rgba(108, 71, 255, 0.16)',
        'card': '0 4px 24px rgba(26, 16, 53, 0.06)',
        'card-hover': '0 8px 40px rgba(26, 16, 53, 0.12)',
        'primary': '0 4px 20px rgba(108, 71, 255, 0.3)',
        'primary-lg': '0 8px 32px rgba(108, 71, 255, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
