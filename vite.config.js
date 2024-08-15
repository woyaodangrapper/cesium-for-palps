import { loadEnv, defineConfig } from 'vite';
import copy from 'rollup-plugin-copy';
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
    plugins: [
      copy({
        targets: [
          { src: 'node_modules/cesium/Build/Cesium/Workers', dest: 'dist/static' },
          { src: 'node_modules/cesium/Build/Cesium/ThirdParty', dest: 'dist/static' },
          { src: 'node_modules/cesium/Build/Cesium/Widgets', dest: 'dist/static' },
          { src: 'node_modules/cesium/Build/Cesium/Assets', dest: 'dist/static' },
        ],
        hook: 'buildStart',
        flatten: true,
        verbose: true,
      }),
    ],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      rollupOptions: {
        input: {
          main: 'index.html',
        },
      },
    },
    assetsInclude: ['**/*.jpg'],
    define: {
      CESIUM_BASE_URL: JSON.stringify('dist/static/'),
    },
  };
});
