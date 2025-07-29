import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import { defineConfig, UserConfig } from "vite";
import solid from "vite-plugin-solid";
import { author, description, license, repository, version } from "./package.json";

const mode = process.env.VITE_MODE as "demo" | "playground";
const isDev = (process.env.NODE_ENV as "development" | "production") === "development";

let config: UserConfig;

if (mode) {
  config = defineConfig({
    plugins: [solid(), tailwindcss()],
    server: { host: "127.0.0.1", open: true },
    preview: { host: "127.0.0.1", open: true },
    root: mode,
    publicDir: "../public",
    build: {
      outDir: "../dist",
      emptyOutDir: true
    },
    base: isDev ? undefined : "/loudness-audio-worklet-processor/"
  });
} else {
  config = defineConfig({
    build: {
      lib: {
        entry: "src/index.ts",
        formats: ["es"],
        fileName: "loudness.worklet"
      },
      minify: true,
      sourcemap: false,
      outDir: "dist",
      emptyOutDir: false,
      copyPublicDir: false
    },
    plugins: [
      (() => {
        return {
          name: "add-banner",
          closeBundle: async () => {
            const path = new URL("./dist/loudness.worklet.js", import.meta.url);
            const file = fs.readFileSync(path, { encoding: "utf-8" });
            const banner = `
/**
 * ${description}
 * 
 * @file loudness.worklet.js
 * @version ${version}
 * @author ${author}
 * @license ${license}
 * @see ${repository.url}
 */
`.trim();

            fs.writeFileSync(path, banner + "\r\n\r\n" + file, { encoding: "utf-8" });
          }
        };
      })()
    ]
  });
}

export default config;
