import tailwindcss from '@tailwindcss/vite';
import { defineConfig, UserConfig } from 'vite';
import solid from 'vite-plugin-solid';

const mode = process.env.VITE_MODE as 'demo' | 'playground';
const isDev = (process.env.NODE_ENV as 'development' | 'production') === 'development';

let config: UserConfig;

if (mode) {
  config = defineConfig({
    plugins: [solid(), tailwindcss()],
    server: { host: '127.0.0.1', open: true },
    preview: { host: '127.0.0.1', open: true },
    root: mode,
    publicDir: '../public',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
    },
    base: isDev ? undefined : '/loudness-audio-worklet-processor/',
  });
} else {
  config = defineConfig({
    build: {
      lib: {
        entry: 'src/index.ts',
        formats: ['es'],
        fileName: 'loudness.worklet',
      },
      minify: true,
      sourcemap: false,
      outDir: 'dist',
      emptyOutDir: false,
      copyPublicDir: false,
    },
  });
}

export default config;
