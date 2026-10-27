import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        events: resolve(__dirname, 'events.html'),
        news: resolve(__dirname, 'news.html'),
        directory: resolve(__dirname, 'directory.html'),
        adminIndex: resolve(__dirname, 'admin/index.html'),
        adminDashboard: resolve(__dirname, 'admin/dashboard.html'),
        adminEvents: resolve(__dirname, 'admin/events.html'),
        adminNews: resolve(__dirname, 'admin/news.html'),
        adminDirectory: resolve(__dirname, 'admin/directory.html'),
        adminSettings: resolve(__dirname, 'admin/settings.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
