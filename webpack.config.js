import react from '@vitejs/plugin-react'

export default {
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src', // if you're using path aliases
    },
  },
  server: {
    fs: {
      allow: ['.'], // this is important if Vite is being weird
    },
  },
}
