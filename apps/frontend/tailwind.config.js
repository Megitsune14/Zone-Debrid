/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#050505',
          surface: '#0a0a0a',
          'surface-hover': '#121212',
          primary: '#9B5DF5',
          variant: '#9400D3',
          border: 'rgba(155, 93, 245, 0.25)',
          'border-hover': 'rgba(155, 93, 245, 0.4)',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #9B5DF5 0%, #9400D3 100%)',
        'gradient-brand-hover': 'linear-gradient(135deg, #a870f7 0%, #a020e0 100%)',
      },
      boxShadow: {
        'halo-sm': '0 0 60px -20px rgba(155, 93, 245, 0.15)',
        'halo-md': '0 0 120px -30px rgba(155, 93, 245, 0.12)',
        'halo-lg': '0 0 180px -40px rgba(148, 0, 211, 0.1)',
      },
      keyframes: {
        'glow-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
      },
      animation: {
        'glow-subtle': 'glow-subtle 2.5s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
