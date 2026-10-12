/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { mist: '#F2F8F7', ink: '#0F2E2B' },
      borderRadius: { card: '1.25rem' },
    },
  },
  plugins: [],
};
