import sqlite3InitModule from "@sqlite.org/sqlite-wasm"

let sqlite3
let sqlite3_promise
let db
let arquivo_selecionado
let fila_gravacao = Promise.resolve()
let fila_abertura = Promise.resolve()

const obter_sqlite = async () => {
  if (!sqlite3_promise) sqlite3_promise = sqlite3InitModule()
  if (!sqlite3) sqlite3 = await sqlite3_promise
  return sqlite3
}

const persistir_banco = async () => {
  const bytes = sqlite3.capi.sqlite3_js_db_export(db)
  const writable = await arquivo_selecionado.createWritable()
  await writable.write(bytes)
  await writable.close()
}

const enfileirar_gravacao = (operacao) => {
  const atual = fila_gravacao.then(operacao)
  fila_gravacao = atual.catch(() => {})
  return atual
}

const abrir_banco_sqlite_interno = async (handle) => {
  if (db && arquivo_selecionado === handle) return
  const sqlite = await obter_sqlite()
  const arquivo = await handle.getFile()
  const novo_db = new sqlite.oo1.DB()

  try {
    if (arquivo.size > 0) {
      const bytes = new Uint8Array(await arquivo.arrayBuffer())
      const ponteiro = sqlite.wasm.allocFromTypedArray(bytes)
      const resultado = sqlite.capi.sqlite3_deserialize(
        novo_db.pointer,
        "main",
        ponteiro,
        bytes.byteLength,
        bytes.byteLength,
        sqlite.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite.capi.SQLITE_DESERIALIZE_RESIZEABLE,
      )
      novo_db.checkRc(resultado)
    }

    novo_db.exec("CREATE TABLE IF NOT EXISTS kapivatar_dados (chave TEXT PRIMARY KEY, tipo TEXT NOT NULL, valor BLOB NOT NULL)")
    const integridade = novo_db.selectValue("PRAGMA integrity_check")
    if (integridade !== "ok") {
      throw new Error("O arquivo SQLite selecionado está corrompido.")
    }
  } catch (erro) {
    novo_db.close()
    throw erro
  }

  if (db) db.close()
  db = novo_db
  arquivo_selecionado = handle
  if (arquivo.size === 0) await persistir_banco()
}

export const abrir_banco_sqlite = (handle) => {
  const atual = fila_abertura.then(() => abrir_banco_sqlite_interno(handle))
  fila_abertura = atual.catch(() => {})
  return atual
}

export const fechar_banco_sqlite = async () => {
  await fila_gravacao
  if (db) db.close()
  db = undefined
  arquivo_selecionado = undefined
}

export const ler_dado_sqlite = async (chave) => {
  if (!db) return undefined
  const tipo = db.selectValue(
    "SELECT tipo FROM kapivatar_dados WHERE chave = ?",
    [chave],
    sqlite3.capi.SQLITE_TEXT,
  )
  if (tipo === undefined) return undefined
  const valor = db.selectValue(
    "SELECT valor FROM kapivatar_dados WHERE chave = ?",
    [chave],
    tipo === "texto" ? sqlite3.capi.SQLITE_TEXT : sqlite3.capi.SQLITE_BLOB,
  )
  if (tipo === "texto") return valor
  if (tipo === "json") return JSON.parse(new TextDecoder().decode(valor))
  return valor
}

export const gravar_dado_sqlite = (chave, valor) => enfileirar_gravacao(async () => {
  if (!db || !arquivo_selecionado) throw new Error("Nenhum banco SQLite está aberto.")

  let tipo
  let conteudo
  if (typeof valor === "string") {
    tipo = "texto"
    conteudo = valor
  } else if (valor instanceof Blob) {
    tipo = "blob"
    conteudo = new Uint8Array(await valor.arrayBuffer())
  } else if (valor instanceof ArrayBuffer) {
    tipo = "blob"
    conteudo = new Uint8Array(valor)
  } else if (ArrayBuffer.isView(valor)) {
    tipo = "blob"
    conteudo = new Uint8Array(valor.buffer, valor.byteOffset, valor.byteLength)
  } else {
    tipo = "json"
    conteudo = new TextEncoder().encode(JSON.stringify(valor))
  }

  db.exec({
    sql: "INSERT INTO kapivatar_dados (chave, tipo, valor) VALUES (?, ?, ?) ON CONFLICT(chave) DO UPDATE SET tipo = excluded.tipo, valor = excluded.valor",
    bind: [chave, tipo, conteudo],
  })
  await persistir_banco()
})

export const remover_dado_sqlite = (chave) => enfileirar_gravacao(async () => {
  if (!db || !arquivo_selecionado) throw new Error("Nenhum banco SQLite está aberto.")
  db.exec({ sql: "DELETE FROM kapivatar_dados WHERE chave = ?", bind: [chave] })
  await persistir_banco()
})

export const existe_dado_sqlite = (chave) => {
  if (!db) return false
  return db.selectValue(
    "SELECT EXISTS(SELECT 1 FROM kapivatar_dados WHERE chave = ?)",
    [chave],
  ) === 1
}
