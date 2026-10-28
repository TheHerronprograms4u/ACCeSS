import { resolve } from 'path';
import { defineConfig, Plugin } from 'vite';

function adminRewritePlugin(): Plugin {
  return {
    name: 'admin-rewrite-plugin',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/admin' || req.url === '/admin/') {
          req.url = '/admin/index.html';
        } else if (req.url === '/dashboard' || req.url === '/dashboard/') {
          req.url = '/admin/dashboard.html';
        } else if (req.url === '/register' || req.url === '/register/') {
          req.url = '/register.html';
        }
        next();
      });
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [adminRewritePlugin()],
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        events: resolve(__dirname, 'events.html'),
        news: resolve(__dirname, 'news.html'),
        directory: resolve(__dirname, 'directory.html'),
        register: resolve(__dirname, 'register.html'),
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
