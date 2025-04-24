import { defineConfig, UserConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';

const mode = process.env.VITE_MODE as 'lib' | 'demo' | 'playground';

let config: UserConfig;

if (mode === 'lib') {
  config = defineConfig({
    build: {
      lib: {
        entry: 'lib/index.ts',
        formats: ['es'],
        fileName: 'loudness.worklet',
      },
      minify: true,
      sourcemap: false,
      outDir: 'dist/lib',
      emptyOutDir: true,
      copyPublicDir: false,
    },
  });
} else {
  config = defineConfig({
    plugins: [solid(), tailwindcss()],
    server: { host: true },
    root: mode,
    publicDir: '../public',
    build: { outDir: `dist/${mode}`, emptyOutDir: true },
  });
}

export default config;
