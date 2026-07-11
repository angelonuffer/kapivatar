import { writeFile, mkdir } from "node:fs/promises"
import construir_aplicativo from "./fonte/aplicativo.js"
import { páginas } from "./fonte/páginas.js"

async function build() {
  try {
    const html = await construir_aplicativo(páginas)
    await mkdir("www", { recursive: true })
    await writeFile("www/index.html", html)
    console.log("Build concluído com sucesso: www/index.html gerado.")
  } catch (error) {
    console.error("Erro durante o build:", error)
    process.exit(1)
  }
}

build()
