import sqlite3InitModule from "@sqlite.org/sqlite-wasm"

let sqlite3
let sqlite3_promise
let db
let arquivo_selecionado
let fila_gravacao = Promise.resolve()
let fila_abertura = Promise.resolve()

const PREFIXO_JSON = new Uint8Array([0x6b, 0x61, 0x70, 0x69, 0x6a, 0x73, 0x6f, 0x6e])

const codificar_json = (valor) => {
  const conteudo = new TextEncoder().encode(JSON.stringify(valor))
  const codificado = new Uint8Array(PREFIXO_JSON.length + conteudo.length)
  codificado.set(PREFIXO_JSON)
  codificado.set(conteudo, PREFIXO_JSON.length)
  return codificado
}

const decodificar_json = (valor) => {
  const bytes = valor instanceof Uint8Array ? valor : new Uint8Array(valor)
  if (bytes.length < PREFIXO_JSON.length) return undefined
  for (let indice = 0; indice < PREFIXO_JSON.length; indice++) {
    if (bytes[indice] !== PREFIXO_JSON[indice]) return undefined
  }
  return JSON.parse(new TextDecoder().decode(bytes.slice(PREFIXO_JSON.length)))
}

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

const validar_formato_sqlite = (novo_db) => {
  const colunas = []
  novo_db.exec({
    sql: "PRAGMA table_info(kapivatar_dados)",
    rowMode: "array",
    resultRows: colunas,
  })
  const esquema_novo = colunas.length === 2 &&
    colunas[0][1] === "chave" &&
    colunas[0][2]?.toLowerCase() === "text" &&
    colunas[0][5] === 1 &&
    colunas[1][1] === "valor" &&
    colunas[1][3] === 1
  if (!esquema_novo) {
    throw new Error("Formato de arquivo de perfil não suportado.")
  }
  const tabelas = novo_db.selectValue(
    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  )
  const tabelas_conhecidas = novo_db.selectValue(
    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('kapivatar_dados')",
  )
  if (tabelas !== 1 || tabelas_conhecidas !== 0) {
    throw new Error("Formato de arquivo de perfil não suportado.")
  }
  const dados_invalidos = novo_db.selectValue(
    "SELECT EXISTS(SELECT 1 FROM kapivatar_dados WHERE chave IS NULL OR valor IS NULL)",
  )
  if (dados_invalidos) throw new Error("Formato de arquivo de perfil não suportado.")
}

const abrir_banco_sqlite_interno = async (handle, { criar = false } = {}) => {
  if (db && arquivo_selecionado === handle) return
  const sqlite = await obter_sqlite()
  const arquivo = await handle.getFile()
  const novo_db = new sqlite.oo1.DB()
  let banco_novo = false

  try {
    if (arquivo.size === 0) {
      if (!criar) throw new Error("Formato de arquivo de perfil não suportado.")
      novo_db.exec("CREATE TABLE kapivatar_dados (chave TEXT PRIMARY KEY, valor BLOB NOT NULL)")
      banco_novo = true
    } else {
      if (criar) throw new Error("Escolha um arquivo novo para criar o perfil.")
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
      const integridade = novo_db.selectValue("PRAGMA integrity_check")
      if (integridade !== "ok") {
        throw new Error("O arquivo SQLite selecionado está corrompido.")
      }
      validar_formato_sqlite(novo_db)
      const tem_nome_legado = novo_db.selectValue(
        "SELECT EXISTS(SELECT 1 FROM kapivatar_dados WHERE chave = 'kapivatar.dispositivo.nome')",
      ) === 1
      if (tem_nome_legado) {
        novo_db.exec("DELETE FROM kapivatar_dados WHERE chave = 'kapivatar.dispositivo.nome'")
        banco_novo = true
      }
    }
  } catch (erro) {
    novo_db.close()
    throw erro
  }

  if (db) db.close()
  db = novo_db
  arquivo_selecionado = handle
  if (banco_novo) await persistir_banco()
}

export const abrir_banco_sqlite = (handle, opcoes) => {
  const atual = fila_abertura.then(() => abrir_banco_sqlite_interno(handle, opcoes))
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
  const valor = db.selectValue(
    "SELECT valor FROM kapivatar_dados WHERE chave = ?",
    [chave],
  )
  if (valor === undefined) return undefined
  if (typeof valor === "string") {
    if (chave === "perfil") {
      try {
        return JSON.parse(valor)
      } catch {
        return undefined
      }
    }
    return valor
  }
  const bytes = valor instanceof Uint8Array ? valor : new Uint8Array(valor)
  const json = decodificar_json(bytes)
  if (json !== undefined) return json
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

export const gravar_dado_sqlite = (chave, valor) => enfileirar_gravacao(async () => {
  if (!db || !arquivo_selecionado) throw new Error("Nenhum banco SQLite está aberto.")

  let conteudo
  if (chave === "perfil") {
    if (typeof valor === "string") {
      try {
        valor = JSON.parse(valor)
      } catch {
        throw new Error("O perfil deve ser um objeto JSON.")
      }
    }
    if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
      throw new Error("O perfil deve ser um objeto JSON.")
    }
    conteudo = JSON.stringify(valor)
  } else if (typeof valor === "string") {
    conteudo = valor
  } else if (valor instanceof Blob) {
    conteudo = new Uint8Array(await valor.arrayBuffer())
  } else if (valor instanceof ArrayBuffer) {
    conteudo = new Uint8Array(valor)
  } else if (ArrayBuffer.isView(valor)) {
    conteudo = new Uint8Array(valor.buffer, valor.byteOffset, valor.byteLength)
  } else {
    conteudo = codificar_json(valor)
  }

  db.exec({
    sql: "INSERT INTO kapivatar_dados (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor",
    bind: [chave, conteudo],
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

export const listar_referencias_texto_sqlite = async () => {
  await fila_gravacao
  if (!db) return []

  const linhas = []
  db.exec({
    sql: `SELECT origem.chave, destino.valor
      FROM kapivatar_dados AS origem
      JOIN kapivatar_dados AS destino ON destino.chave = origem.valor
      WHERE typeof(origem.valor) = 'text' AND typeof(destino.valor) = 'text'
        AND length(origem.chave) = 64 AND origem.chave NOT GLOB '*[^a-f0-9]*'
        AND length(origem.valor) = 64 AND origem.valor NOT GLOB '*[^a-f0-9]*'`,
    rowMode: "array",
    resultRows: linhas,
  })
  return linhas
}

export const listar_dados_sqlite = async () => {
  await fila_gravacao
  if (!db) return []

  const linhas = []
  db.exec({
    sql: "SELECT chave, valor FROM kapivatar_dados WHERE chave NOT IN (?, ?)",
    bind: ["arquivo_sqlite", "kapivatar.dispositivo.nome"],
    rowMode: "array",
    resultRows: linhas,
  })

  return linhas.map(([chave, valor]) => {
    if (typeof valor === "string") return [chave, valor]
    const bytes = valor instanceof Uint8Array ? valor : new Uint8Array(valor)
    const json = decodificar_json(bytes)
    if (json !== undefined) return [chave, json]
    return [chave, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)]
  })
}

