/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0a7ea4',
          50: '#e6f3f7',
          100: '#cce7ef',
          200: '#99cfdf',
          300: '#66b7cf',
          400: '#339fbf',
          500: '#0a7ea4',
          600: '#086583',
          700: '#064c62',
          800: '#043242',
          900: '#021921',
        },
        secondary: {
          DEFAULT: '#6c757d',
          50: '#f2f3f4',
          100: '#e6e7e9',
          200: '#cccfd3',
          300: '#b3b7bd',
          400: '#999fa7',
          500: '#6c757d',
          600: '#565e64',
          700: '#41464b',
          800: '#2b2f32',
          900: '#161719',
        },
        success: {
          DEFAULT: '#198754',
          light: '#d1e7dd'
        },
        info: {
          DEFAULT: '#0dcaf0',
          light: '#cff4fc'
        },
        warning: {
          DEFAULT: '#ffc107',
          light: '#fff3cd'
        },
        danger: {
          DEFAULT: '#dc3545',
          light: '#f8d7da'
        }
      }
    },
  },
  plugins: [],
}