import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs/promises";
import { defineConfig, Plugin, UserConfig } from "vite";
import solid from "vite-plugin-solid";
import { author, description, license, repository, version } from "./package.json";

const addBanner = (): Plugin => {
  return {
    name: "add-banner",
    async writeBundle(options, bundle) {
      const workletFile = "loudness.worklet.js";
      if (!bundle[workletFile] || !options.dir) {
        return;
      }

      const banner = `
/**
 * ${description}
 *
 * @file ${workletFile}
 * @version ${version}
 * @author ${author}
 * @license ${license}
 * @see ${repository.url}
 * @date ${new Date().toISOString()}
 */
`.trim();

      const filePath = new URL(workletFile, `file://${options.dir}/`);
      try {
        const fileContent = await fs.readFile(filePath, "utf-8");
        await fs.writeFile(filePath, `${banner}\r\n\r\n${fileContent}`, "utf-8");
      } catch (error) {
        console.error("Error adding banner:", error);
      }
    }
  };
};

export default defineConfig(({ mode, command }) => {
  if (mode === "library") {
    return {
      build: {
        lib: {
          entry: "src/index.ts",
          formats: ["es"],
          fileName: "loudness.worklet"
        },
        minify: true,
        sourcemap: false,
        outDir: "dist",
        emptyOutDir: true,
        copyPublicDir: false
      },
      plugins: [addBanner()]
    };
  }

  const appConfig: UserConfig = {
    plugins: [solid(), tailwindcss()],
    root: mode,
    publicDir: "../public",
    server: { host: "127.0.0.1", open: true },
    preview: { host: "127.0.0.1", open: true },
    build: {
      outDir: "../dist",
      emptyOutDir: false
    },
    base: command === "build" ? "/loudness-audio-worklet-processor/" : "/"
  };

  return appConfig;
});
