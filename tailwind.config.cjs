/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      keyframes: {
        slideInUp: {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(10px) scale(0.95)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0) scale(1)' 
          }
        }
      },
      animation: {
        slideInUp: 'slideInUp 0.4s ease-out'
      }
    }
  },
  plugins: []
};

