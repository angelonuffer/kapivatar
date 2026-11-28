import { sveltekit } from '@sveltejs/kit/vite'
import adapter from '@sveltejs/adapter-static'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter({
        fallback: "index.html",
      }),
      preprocess: {},
    }),
    {
      name: "externalizar-wasm-onnxruntime",
      apply: "build",
      generateBundle(_, bundle) {
        for (const [fileName, output] of Object.entries(bundle)) {
          if (
            output.type === "asset" &&
            fileName.startsWith("assets/ort-wasm-simd-threaded") &&
            fileName.endsWith(".wasm")
          ) {
            delete bundle[fileName]
          }
        }
      },
    },
  ],
  resolve: {
    conditions: ["browser"],
  },
  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"],
  },
  test: {
    environment: "jsdom",
    setupFiles: "./testes/setup.js",
    include: ["testes/**/*.test.js"],
  },
})
