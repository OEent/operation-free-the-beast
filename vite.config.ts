import { defineConfig } from "vite";
export default defineConfig({ base: process.env.GITHUB_PAGES === "true" ? "/operation-free-the-beast/" : "/", build: { outDir: "dist", sourcemap: false, target: "es2022" } });
