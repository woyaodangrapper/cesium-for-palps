import { loadEnv, defineConfig } from 'vite';
import path from 'path';

const CWD = process.cwd();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const { VITE_API_URL_PREFIX } = loadEnv(mode, CWD);

  return {
    base: '',
    // root: path.resolve(__dirname, 'src'),
    server: {
      port: 8080,
      host: '0.0.0.0',
      proxy: {
        [VITE_API_URL_PREFIX]: 'http://127.0.0.1:8000/',
      },
    },
    resolve: {
      alias: {
        '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: '../dist',
    },
    assetsInclude: ['**/*.jpg'],
  };
});
