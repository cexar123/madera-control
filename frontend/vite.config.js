// Autor: Miembro 5
// MaderaControl v1.0 - Configuracion de Vite

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  }
});
