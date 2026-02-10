import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// Configuración principal de Astro con React y Tailwind
export default defineConfig({
  integrations: [react(), tailwind()],
});

