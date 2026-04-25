// Autor: Miembro 5
// MaderaControl v1.0 - Configuracion de TailwindCSS

export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1e3a5f',
        'primary-dark': '#152a47',
        secondary: '#64748b',
        alerta: '#f97316',
        ok: '#16a34a',
        critico: '#dc2626'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
