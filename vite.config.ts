import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs/promises";
import { defineConfig, Plugin } from "vite";
import solid from "vite-plugin-solid";
import { author, description, license, repository, version } from "./package.json";

export default defineConfig((config) => {
  const { command, mode, isPreview } = config;

  if (command === "build") {
    if (mode === "static") {
      return {
        root: "src",
        build: {
          target: "esnext",
          lib: { entry: "index.ts", formats: ["es"], fileName: "loudness.worklet" },
          outDir: "../public",
          emptyOutDir: false
        },
        plugins: [addBanner()]
      };
    }

    if (mode === "lib") {
      return {
        root: "lib",
        worker: { format: "es" },
        build: {
          target: "esnext",
          lib: { entry: "index.ts", formats: ["es"], fileName: "index" },
          outDir: "../dist",
          emptyOutDir: true
        },
        base: "./"
      };
    }

    if (mode === "demo") {
      return {
        plugins: [solid(), tailwindcss()],
        root: "demo",
        publicDir: "../public",
        build: { outDir: "../dist", emptyOutDir: true, target: "esnext" },
        base: "/loudness-audio-worklet-processor/"
      };
    }
  }

  if (command === "serve") {
    if (mode === "demo") {
      return {
        plugins: [solid(), tailwindcss()],
        root: "demo",
        publicDir: "../public",
        server: { host: "127.0.0.1" },
        preview: { host: "127.0.0.1" },
        base: isPreview ? "/loudness-audio-worklet-processor/" : "/"
      };
    }

    if (mode === "dev") {
      return {
        plugins: [solid(), tailwindcss()],
        root: "playground",
        publicDir: "../public",
        server: { host: "127.0.0.1" }
      };
    }
  }

  return {};
});

function addBanner(): Plugin {
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
}
