import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import viteCompression from 'vite-plugin-compression';
// import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const browserBackendUrl = env.UI_BROWSER_BACKEND_URL || env.UI_BACKEND_URL;
  const proxyTarget = env.UI_PROXY_TARGET || env.UI_BACKEND_URL || 'http://localhost:9898';

  return {
    plugins: [
      paraglideVitePlugin({
        project: './project.inlang',
        outdir: './src/paraglide',
        strategy: ['localStorage', 'preferredLanguage', 'baseLocale'],
      }),
      react(),
      tsconfigPaths(),
      viteCompression({ algorithm: 'gzip', ext: '.gz', deleteOriginFile: true }),
      // viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
      // visualizer({
      //   open: false,
      //   gzipSize: true,
      //   // brotliSize: true,
      // }) as PluginOption,
    ],
    base: './',
    build: {
      outDir: 'dist',
      target: 'esnext',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('/recharts/') || id.includes('/d3-') || id.includes('/victory-vendor/'))
              return 'vendor-recharts';
          },
        },
      },
    },
    define: {
      'process.env.UI_OS': JSON.stringify(env.UI_OS),
      'process.env.BACKREST_BUILD_VERSION': JSON.stringify(env.BACKREST_BUILD_VERSION),
      'process.env.UI_BACKEND_URL': JSON.stringify(browserBackendUrl),
      'process.env.UI_FEATURES': JSON.stringify(env.UI_FEATURES),
    },
    server: {
      allowedHosts: ['webui'],
      proxy: {
        '/v1.Backrest': {
          target: proxyTarget,
          secure: false,
        },
        '/v1.Authentication': {
          target: proxyTarget,
          secure: false,
        },
        '/download': {
          target: proxyTarget,
          secure: false,
        },
        '/api/openlist': {
          target: proxyTarget,
          secure: false,
        },
      },
      watch:
        env.UI_USE_POLLING === 'true'
          ? {
              usePolling: true,
              interval: 250,
            }
          : undefined,
    },
  };
});
