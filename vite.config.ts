import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
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
  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"],
  },
})
