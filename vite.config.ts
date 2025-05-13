import tailwindcss from '@tailwindcss/vite';
import { defineConfig, UserConfig } from 'vite';
import solid from 'vite-plugin-solid';

const mode = process.env.VITE_MODE as 'demo' | 'playground';

let config: UserConfig;

if (mode) {
  config = defineConfig({
    plugins: [solid(), tailwindcss()],
    server: { host: true },
    root: mode,
    publicDir: '../public',
    build: { outDir: `dist/${mode}`, emptyOutDir: true },
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
      outDir: 'lib',
      emptyOutDir: true,
      copyPublicDir: false,
    },
  });
}

export default config;
