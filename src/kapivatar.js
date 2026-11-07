import banco from "./banco.js"
import {
  abrir_banco_sqlite,
  fechar_banco_sqlite,
  ler_dado_sqlite,
  gravar_dado_sqlite,
  remover_dado_sqlite,
  existe_dado_sqlite,
} from "./sqlite.js"
import { mount, unmount } from "svelte"
import TelaInicial from "./início.svelte"
import BaseHorizontal from "./base-horizontal.svelte"
import BaseVertical from "./base-vertical.svelte"

const url_logo = new URL("./kapivatar.svg", import.meta.url).href
const url_capivara = new URL("./capivara.jpeg", import.meta.url).href

const página_inicial = {
  nome: "Início",
  url: "/",
  ícone: "home",
  render: (conteudo) => {
    const p = document.createElement("p")
    p.textContent = "Bem-vindo ao Kapivatar! Escolha uma opção no menu lateral."
    conteudo.appendChild(p)
  }
}

const aguardar_rota = (promessa, sinal) => {
  if (!sinal) return Promise.resolve(promessa)
  if (sinal.aborted) return Promise.reject(sinal.reason)

  return new Promise((resolve, reject) => {
    const limpar = () => sinal.removeEventListener("abort", cancelar)
    const cancelar = () => {
      limpar()
      reject(sinal.reason)
    }

    sinal.addEventListener("abort", cancelar, { once: true })
    Promise.resolve(promessa).then(
      valor => {
        limpar()
        resolve(valor)
      },
      erro => {
        limpar()
        reject(erro)
      },
    )
  })
}

let tela_inicial_montada
let base_horizontal_montada
let base_vertical_montada
const renderizar_tela_inicial = (props) => {
  if (tela_inicial_montada) {
    unmount(tela_inicial_montada)
  }
  if (base_horizontal_montada) {
    unmount(base_horizontal_montada)
    base_horizontal_montada = null
  }
  if (base_vertical_montada) {
    unmount(base_vertical_montada)
    base_vertical_montada = null
  }
  document.body.replaceChildren()
  tela_inicial_montada = mount(TelaInicial, { target: document.body, props })
}

const banco_kapivatar = banco({
  objectStores: [
    {
      name: "byName",
    },
  ],
})

let diretorio_selecionado = null

const gerar_hash = async (conteudo) => {
  const buffer = typeof conteudo === "string" ? new TextEncoder().encode(conteudo) : conteudo
  const hash_buffer = await crypto.subtle.digest("SHA-256", buffer)
  return Array.from(new Uint8Array(hash_buffer)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

const gerar_chaves = async () => {
  return await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  )
}

const exportar_chave = async (chave) => {
  return await crypto.subtle.exportKey("jwk", chave)
}

const importar_chave_publica = async (jwk) => {
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  )
}

const importar_chave_privada = async (jwk) => {
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  )
}

const criptografar = async (chave_publica, dados) => {
  const encoder = new TextEncoder()
  const buffer_dados = encoder.encode(JSON.stringify(dados))

  // 1. Gerar chave AES
  const chave_aes = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  )

  // 2. Exportar e criptografar a chave AES com RSA
  const chave_aes_raw = await crypto.subtle.exportKey("raw", chave_aes)
  const chave_aes_criptografada = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    chave_publica,
    chave_aes_raw
  )

  // 3. Criptografar dados com AES
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const dados_criptografados = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    chave_aes,
    buffer_dados
  )

  // 4. Combinar: chave_aes_criptografada (256 bytes para RSA 2048) + iv (12 bytes) + dados_criptografados
  const resultado = new Uint8Array(chave_aes_criptografada.byteLength + iv.byteLength + dados_criptografados.byteLength)
  resultado.set(new Uint8Array(chave_aes_criptografada), 0)
  resultado.set(iv, chave_aes_criptografada.byteLength)
  resultado.set(new Uint8Array(dados_criptografados), chave_aes_criptografada.byteLength + iv.byteLength)

  return resultado.buffer
}

const descriptografar = async (chave_privada, buffer) => {
  const bytes = new Uint8Array(buffer)

  // 1. Separar as partes (RSA 2048 produz 256 bytes de ciphertext)
  const chave_aes_criptografada = bytes.slice(0, 256)
  const iv = bytes.slice(256, 256 + 12)
  const dados_criptografados = bytes.slice(256 + 12)

  // 2. Descriptografar a chave AES com RSA
  const chave_aes_raw = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    chave_privada,
    chave_aes_criptografada
  )

  const chave_aes = await crypto.subtle.importKey(
    "raw",
    chave_aes_raw,
    "AES-GCM",
    false,
    ["decrypt"]
  )

  // 3. Descriptografar dados com AES
  const buffer_dados = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    chave_aes,
    dados_criptografados
  )

  const decoder = new TextDecoder()
  return JSON.parse(decoder.decode(buffer_dados))
}

const gerar_id_perfil = async (chave_publica) => {
  const spki = await crypto.subtle.exportKey("spki", chave_publica)
  return await gerar_hash(spki)
}

const obter_handle_salvo = async () => {
  const db = await banco_kapivatar
  return new Promise((resolve, reject) => {
    const request = db.transaction("byName", "readonly").objectStore("byName").get("arquivo_sqlite")
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const gravar_handle_salvo = async (handle) => {
  const db = await banco_kapivatar
  return new Promise((resolve, reject) => {
    const request = db.transaction("byName", "readwrite").objectStore("byName").put(handle, "arquivo_sqlite")
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

const remover_handle_salvo = async () => {
  const db = await banco_kapivatar
  return new Promise((resolve, reject) => {
    const request = db.transaction("byName", "readwrite").objectStore("byName").delete("arquivo_sqlite")
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

const obter_diretorio_selecionado = async () => {
  if (diretorio_selecionado) return diretorio_selecionado
  const handle = await obter_handle_salvo()
  if (handle && handle.kind === "file" && typeof handle.getFile === "function") {
    diretorio_selecionado = handle
    return handle
  }
  return null
}

const vfs_obter = async (key) => await ler_dado_sqlite(key)

const vfs_salvar = async (key, value) => {
  await gravar_dado_sqlite(key, value)
}

const vfs_remover = async (key) => {
  if (key === "arquivo_sqlite") {
    await remover_handle_salvo()
    diretorio_selecionado = null
    fechar_banco_sqlite()
    return
  }
  await remover_dado_sqlite(key)
}

const vfs_existe = async (key) => {
  return existe_dado_sqlite(key)
}

class VirtualWritableStream {
  constructor(key) {
    this.name = key
  }

  async write(content) {
    await vfs_salvar(this.name, content)
  }

  async close() {}
}

class VirtualFileHandle {
  constructor(key) {
    this.name = key
    this.kind = "file"
  }

  async getFile() {
    let content = await vfs_obter(this.name)
    if (content === undefined) {
      const error = new Error("File not found")
      error.name = "NotFoundError"
      throw error
    }
    if (content instanceof Blob) return content
    const blob = new Blob([content])
    blob.text = async () => {
      if (typeof content === "string") return content
      if (content instanceof ArrayBuffer) return new TextDecoder().decode(content)
      if (ArrayBuffer.isView(content)) return new TextDecoder().decode(content)
      return ""
    }
    return blob
  }

  async createWritable() {
    return new VirtualWritableStream(this.name)
  }

  async remove() {
    await vfs_remover(this.name)
  }
}

class VirtualDirectoryHandle {
  constructor(name = "root", prefix = "", nativeHandle = null) {
    this.kind = "directory"
    this.name = name
    this.prefix = prefix
    this.nativeHandle = nativeHandle
  }

  async queryPermission(descriptor) {
    if (this.nativeHandle) return await this.nativeHandle.queryPermission(descriptor)
    return sessionStorage.getItem("_permissionState") || "granted"
  }

  async requestPermission(descriptor) {
    if (this.nativeHandle) return await this.nativeHandle.requestPermission(descriptor)
    sessionStorage.setItem("_permissionState", "granted")
    return "granted"
  }

  async getFileHandle(name, options = {}) {
    const key = this.prefix + name
    const existe = await vfs_existe(key)
    if (!existe && !options.create) {
      const error = new Error(`File not found: ${key}`)
      error.name = "NotFoundError"
      throw error
    }
    if (!existe && options.create) {
      await vfs_salvar(key, "")
    }
    return new VirtualFileHandle(key)
  }

  async getDirectoryHandle(name, options = {}) {
    const key = "dir:" + this.prefix + name
    const existe = await vfs_existe(key)
    if (!existe && !options.create) {
      const error = new Error(`Directory not found: ${key}`)
      error.name = "NotFoundError"
      throw error
    }
    if (!existe && options.create) {
      await vfs_salvar(key, { name, prefix: this.prefix + name + "/" })
    }
    return new VirtualDirectoryHandle(name, this.prefix + name + "/", this.nativeHandle)
  }
}

const obter_diretorio = async (sinal_rota) => {
  const handle = await aguardar_rota(obter_diretorio_selecionado(), sinal_rota)
  if (!handle) return null
  if (await handle.queryPermission({ mode: "readwrite" }) === "granted") {
    await abrir_banco_sqlite(handle)
  }
  return new VirtualDirectoryHandle(handle.name, "", handle)
}

const validar_arquivo_sqlite = (handle) => {
  if (handle.name !== "kapivatar.sqlite") {
    throw new Error("O arquivo do banco de dados precisa se chamar kapivatar.sqlite.")
  }
}

const opcoes_selecao_sqlite = {
  types: [{ description: "Banco de dados SQLite", accept: { "application/vnd.sqlite3": [".sqlite"] } }],
}

const abrir_arquivo_sqlite = async () => {
  if (typeof window.showOpenFilePicker !== "function") {
    throw new Error("Este navegador não oferece suporte à seleção de arquivos.")
  }
  const [handle] = await window.showOpenFilePicker({
    ...opcoes_selecao_sqlite,
    multiple: false,
  })
  validar_arquivo_sqlite(handle)
  await abrir_banco_sqlite(handle)
  await gravar_handle_salvo(handle)
  diretorio_selecionado = handle
}

const criar_arquivo_sqlite = async () => {
  if (typeof window.showSaveFilePicker !== "function") {
    throw new Error("Este navegador não oferece suporte à criação de arquivos.")
  }
  const handle = await window.showSaveFilePicker({
    suggestedName: "kapivatar.sqlite",
    ...opcoes_selecao_sqlite,
  })
  validar_arquivo_sqlite(handle)
  await abrir_banco_sqlite(handle)
  await gravar_handle_salvo(handle)
  diretorio_selecionado = handle
}

const ler_arquivo = async (diretorio, nome) => {
  if (!diretorio) return null
  try {
    const handle = await diretorio.getFileHandle(nome)
    const file = await handle.getFile()
    return file
  } catch (erro) {
    if (erro.name === "NotFoundError") return null
    throw erro
  }
}

const escrever_arquivo = async (diretorio, nome, conteudo) => {
  const handle = await diretorio.getFileHandle(nome, { create: true })
  const writable = await handle.createWritable()
  await writable.write(conteudo)
  await writable.close()
}

window.obter_id_perfil_selecionado = async (sinal_rota) => {
  const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)
  const arquivo = await aguardar_rota(ler_arquivo(diretorio, "perfil_selecionado"), sinal_rota)
  if (!arquivo) return null
  return await aguardar_rota(arquivo.text(), sinal_rota)
}

const definir_id_perfil_selecionado = async (id) => {
  const diretorio = await obter_diretorio()
  await escrever_arquivo(diretorio, "perfil_selecionado", id)
}

const carregar_lista_perfis = async (diretorio, chave) => {
  const arquivo_lista = await ler_arquivo(diretorio, chave)
  if (!arquivo_lista) return { perfis: [], data: new Date().toISOString() }

  const hash_lista = await arquivo_lista.text()
  const arquivo_conteudo = await ler_arquivo(diretorio, hash_lista)
  if (!arquivo_conteudo) throw new Error(`Lista de perfis ausente: ${chave}`)
  return JSON.parse(await arquivo_conteudo.text())
}

const salvar_lista_perfis = async (diretorio, chave, perfis) => {
  const arquivo_lista = await ler_arquivo(diretorio, chave)
  const hash_lista_anterior = arquivo_lista ? await arquivo_lista.text() : null
  const nova_lista = {
    perfis,
    data: new Date().toISOString(),
    ...(hash_lista_anterior ? { anterior: hash_lista_anterior } : {})
  }
  const conteudo_lista = JSON.stringify(nova_lista)
  const hash_nova_lista = await gerar_hash(conteudo_lista)
  await escrever_arquivo(diretorio, hash_nova_lista, conteudo_lista)
  await escrever_arquivo(diretorio, chave, hash_nova_lista)
}

const arquivar_perfil = async (id_arquivar) => {
  const diretorio = await obter_diretorio()
  const lista_ativa = await carregar_lista_perfis(diretorio, "perfis")
  const lista_arquivada = await carregar_lista_perfis(diretorio, "perfis_arquivados")
  if (!lista_ativa.perfis.includes(id_arquivar)) return

  await salvar_lista_perfis(
    diretorio,
    "perfis_arquivados",
    [...new Set([...lista_arquivada.perfis, id_arquivar])]
  )
  await salvar_lista_perfis(
    diretorio,
    "perfis",
    lista_ativa.perfis.filter(id => id !== id_arquivar)
  )

  const id_selecionado = await obter_id_perfil_selecionado()
  if (id_selecionado === id_arquivar) {
    const arquivo_selecionado = await ler_arquivo(diretorio, "perfil_selecionado")
    if (arquivo_selecionado) {
      const handle = await diretorio.getFileHandle("perfil_selecionado")
      await handle.remove()
    }
  }

  rotear()
}

const restaurar_perfil = async (id_restaurar) => {
  const diretorio = await obter_diretorio()
  const lista_ativa = await carregar_lista_perfis(diretorio, "perfis")
  const lista_arquivada = await carregar_lista_perfis(diretorio, "perfis_arquivados")
  if (!lista_arquivada.perfis.includes(id_restaurar)) return

  await salvar_lista_perfis(
    diretorio,
    "perfis",
    [...new Set([...lista_ativa.perfis, id_restaurar])]
  )
  await salvar_lista_perfis(
    diretorio,
    "perfis_arquivados",
    lista_arquivada.perfis.filter(id => id !== id_restaurar)
  )
  rotear()
}

const verificar_retentativas = async () => {
  const id_meu_perfil = await obter_id_perfil_selecionado()
  if (!id_meu_perfil) return

  const lista_contatos = await carregar_lista_contatos()
  const agora = new Date().getTime()

  // 1. Retentativas de solicitações de contato
  if (lista_contatos.solicitações_enviadas && lista_contatos.solicitações_enviadas.length > 0) {
    const datas = lista_contatos.solicitações_enviadas_datas || {}
    for (const id_alvo of lista_contatos.solicitações_enviadas) {
      const data_envio_str = datas[id_alvo] || lista_contatos.data || new Date().toISOString()
      const data_envio = new Date(data_envio_str).getTime()
      const tempo_passado = agora - data_envio
      if (tempo_passado > 10000 && tempo_passado < 120000) {
        console.log("Reenviando solicitação de contato para:", id_alvo)
        await enviar_solicitacao_contato(id_alvo, true)
      }
    }
  }

  // 2. Retentativas de mensagens do chat
  for (const contato of lista_contatos.contatos) {
    const conversa = await carregar_conversa(id_meu_perfil, contato.id)
    let houve_reenvio = false

    for (const msg of conversa.mensagens) {
      if (msg.id_remetente === id_meu_perfil && !msg.recebida) {
        const data_msg = new Date(msg.data).getTime()
        const tempo_passado = agora - data_msg
        // Reenviar se a mensagem tiver mais de 10 segundos e menos de 2 minutos (limite de retentativas)
        if (tempo_passado > 10000 && tempo_passado < 120000) {
          console.log("Reenviando mensagem:", msg.id)
          await enviar_mensagem_chat(contato.id, msg.texto, msg.id)
          houve_reenvio = true
        }
      }
    }
  }
}

window.verificar_retentativas = verificar_retentativas
setInterval(verificar_retentativas, 15000)

const obter_hash_lista_contatos = async (sinal_rota) => {
  const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)
  const arquivo = await aguardar_rota(ler_arquivo(diretorio, "contatos"), sinal_rota)
  if (!arquivo) return null
  return await aguardar_rota(arquivo.text(), sinal_rota)
}

const definir_hash_lista_contatos = async (hash) => {
  const diretorio = await obter_diretorio()
  await escrever_arquivo(diretorio, "contatos", hash)
}

window.carregar_lista_contatos = async (hash_lista, sinal_rota) => {
  const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)
  const hash = hash_lista || (await aguardar_rota(obter_hash_lista_contatos(sinal_rota), sinal_rota))
  if (!hash) return { contatos: [], solicitações_enviadas: [], solicitações_recebidas: [], data: new Date().toISOString() }
  const arquivo = await aguardar_rota(ler_arquivo(diretorio, hash), sinal_rota)
  if (!arquivo) return { contatos: [], solicitações_enviadas: [], solicitações_recebidas: [], data: new Date().toISOString() }
  return JSON.parse(await aguardar_rota(arquivo.text(), sinal_rota))
}

window.salvar_lista_contatos = async (nova_lista) => {
  const diretorio = await obter_diretorio()
  const hash_anterior = await obter_hash_lista_contatos()
  nova_lista.data = new Date().toISOString()
  if (hash_anterior) nova_lista.anterior = hash_anterior
  const conteudo = JSON.stringify(nova_lista)
  const hash = await gerar_hash(conteudo)
  await escrever_arquivo(diretorio, hash, conteudo)
  await definir_hash_lista_contatos(hash)
}

const obter_hash_conversa = async (meu_id, contato_id, sinal_rota) => {
  const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)
  const arquivo = await aguardar_rota(ler_arquivo(diretorio, `chat_${meu_id}_${contato_id}`), sinal_rota)
  if (!arquivo) return null
  return await aguardar_rota(arquivo.text(), sinal_rota)
}

const definir_hash_conversa = async (meu_id, contato_id, hash) => {
  const diretorio = await obter_diretorio()
  await escrever_arquivo(diretorio, `chat_${meu_id}_${contato_id}`, hash)
}

window.carregar_conversa = async (meu_id, contato_id, sinal_rota) => {
  const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)
  const hash = await aguardar_rota(obter_hash_conversa(meu_id, contato_id, sinal_rota), sinal_rota)
  if (!hash) return { mensagens: [], data: new Date().toISOString() }
  const arquivo = await aguardar_rota(ler_arquivo(diretorio, hash), sinal_rota)
  if (!arquivo) return { mensagens: [], data: new Date().toISOString() }
  return JSON.parse(await aguardar_rota(arquivo.text(), sinal_rota))
}

window.salvar_conversa = async (meu_id, contato_id, nova_conversa) => {
  const diretorio = await obter_diretorio()
  const hash_anterior = await obter_hash_conversa(meu_id, contato_id)
  nova_conversa.data = new Date().toISOString()
  if (hash_anterior) nova_conversa.anterior = hash_anterior
  const conteudo = JSON.stringify(nova_conversa)
  const hash = await gerar_hash(conteudo)
  await escrever_arquivo(diretorio, hash, conteudo)
  await definir_hash_conversa(meu_id, contato_id, hash)
}

const buffer_para_base64 = (buffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const base64_para_buffer = (base64) => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

const enviar_solicitacao_contato = async (id_alvo, eh_retentativa = false) => {
  const id_meu_perfil = await obter_id_perfil_selecionado()
  const diretorio = await obter_diretorio()
  const arquivo_id = await ler_arquivo(diretorio, id_meu_perfil)
  const hash_perfil = await arquivo_id.text()
  const arquivo_perfil = await ler_arquivo(diretorio, hash_perfil)
  const meu_perfil = JSON.parse(await arquivo_perfil.text())

  // Remover chave privada antes de enviar
  const { chave_privada, ...meu_perfil_publico } = meu_perfil
  meu_perfil_publico.id = id_meu_perfil

  const mensagem = {
    adicionar_contato_id: id_alvo,
    meu_perfil: meu_perfil_publico
  }

  cliente_mqtt.publish("kapivatar.net", JSON.stringify(mensagem))

  const lista = await carregar_lista_contatos()
  if (!lista.solicitações_enviadas.includes(id_alvo)) {
    lista.solicitações_enviadas.push(id_alvo)
  }
  if (!lista.solicitações_enviadas_datas) {
    lista.solicitações_enviadas_datas = {}
  }
  if (!eh_retentativa || !lista.solicitações_enviadas_datas[id_alvo]) {
    lista.solicitações_enviadas_datas[id_alvo] = new Date().toISOString()
  }
  await salvar_lista_contatos(lista)
}

const enviar_confirmacao_aceite = async (id_meu_perfil, perfil_solicitante) => {
  const diretorio = await obter_diretorio()
  const arquivo_id = await ler_arquivo(diretorio, id_meu_perfil)
  const hash_perfil = await arquivo_id.text()
  const arquivo_perfil = await ler_arquivo(diretorio, hash_perfil)
  const meu_perfil = JSON.parse(await arquivo_perfil.text())

  // Remover chave privada antes de enviar
  const { chave_privada, ...meu_perfil_publico } = meu_perfil
  meu_perfil_publico.id = id_meu_perfil

  const conteudo_aceito = {
    solicitação_aceita: true,
    meu_perfil: meu_perfil_publico
  }

  const chave_publica_solicitante = await importar_chave_publica(perfil_solicitante.chave_publica)
  const buffer_criptografado = await criptografar(chave_publica_solicitante, conteudo_aceito)

  // Converter buffer para string base64 para envio via JSON
  const mensagem_criptografada = buffer_para_base64(buffer_criptografado)

  const mensagem = {
    id_destino: perfil_solicitante.id,
    mensagem_criptografada: mensagem_criptografada
  }

  cliente_mqtt.publish("kapivatar.net", JSON.stringify(mensagem))
}

const aceitar_solicitacao_contato = async (perfil_solicitante) => {
  const id_meu_perfil = await obter_id_perfil_selecionado()
  await enviar_confirmacao_aceite(id_meu_perfil, perfil_solicitante)

  const lista = await carregar_lista_contatos()
  // Adiciona aos contatos
  if (!lista.contatos.find(c => c.id === perfil_solicitante.id)) {
    lista.contatos.push(perfil_solicitante)
  }
  // Remove das solicitações recebidas
  lista.solicitações_recebidas = lista.solicitações_recebidas.filter(p => p.id !== perfil_solicitante.id)
  await salvar_lista_contatos(lista)
}

const enviar_ack = async (id_contato, id_mensagem) => {
  const id_meu_perfil = await obter_id_perfil_selecionado()
  const lista_contatos = await carregar_lista_contatos()
  const contato = lista_contatos.contatos.find(c => c.id === id_contato)

  if (!contato) {
    console.error("Contato não encontrado para enviar ACK")
    return
  }

  const conteudo_ack = {
    chat_ack: id_mensagem,
    id_remetente: id_meu_perfil
  }

  const chave_publica_contato = await importar_chave_publica(contato.chave_publica)
  const buffer_criptografado = await criptografar(chave_publica_contato, conteudo_ack)
  const mensagem_criptografada = buffer_para_base64(buffer_criptografado)

  const mensagem = {
    id_destino: id_contato,
    mensagem_criptografada: mensagem_criptografada
  }

  cliente_mqtt.publish("kapivatar.net", JSON.stringify(mensagem))
}

const enviar_mensagem_chat = async (id_contato, texto, id_mensagem = null) => {
  const id_meu_perfil = await obter_id_perfil_selecionado()
  const diretorio = await obter_diretorio()
  const arquivo_id = await ler_arquivo(diretorio, id_meu_perfil)
  const hash_perfil = await arquivo_id.text()
  const arquivo_perfil = await ler_arquivo(diretorio, hash_perfil)
  const meu_perfil = JSON.parse(await arquivo_perfil.text())

  const lista_contatos = await carregar_lista_contatos()
  const contato = lista_contatos.contatos.find(c => c.id === id_contato)

  if (!contato) {
    console.error("Contato não encontrado para enviar mensagem")
    return
  }

  const id_msg = id_mensagem || crypto.randomUUID()

  const conteudo_mensagem = {
    chat_mensagem: texto,
    id_mensagem: id_msg,
    id_remetente: id_meu_perfil
  }

  const chave_publica_contato = await importar_chave_publica(contato.chave_publica)
  const buffer_criptografado = await criptografar(chave_publica_contato, conteudo_mensagem)
  const mensagem_criptografada = buffer_para_base64(buffer_criptografado)

  const mensagem = {
    id_destino: id_contato,
    mensagem_criptografada: mensagem_criptografada
  }

  cliente_mqtt.publish("kapivatar.net", JSON.stringify(mensagem))

  if (!id_mensagem) {
    const conversa = await carregar_conversa(id_meu_perfil, id_contato)
    conversa.mensagens.push({
      id: id_msg,
      id_remetente: id_meu_perfil,
      texto: texto,
      data: new Date().toISOString(),
      recebida: false
    })
    await salvar_conversa(id_meu_perfil, id_contato, conversa)
    rotear()
  }
}

window.processar_mensagem_mqtt = async (dados) => {
  console.log("Mensagem MQTT recebida:", dados)

  const diretorio = await obter_diretorio()
  if (!diretorio) return

  const arquivo_perfis = await ler_arquivo(diretorio, "perfis")
  if (!arquivo_perfis) return

  const hash_lista_perfis = await arquivo_perfis.text()
  const arquivo_lista_perfis = await ler_arquivo(diretorio, hash_lista_perfis)
  const lista_perfis = JSON.parse(await arquivo_lista_perfis.text())

  // 1. Verificar se é uma solicitação para um dos meus perfis
  if (dados.adicionar_contato_id && dados.meu_perfil) {
    if (lista_perfis.perfis.includes(dados.adicionar_contato_id)) {
      // Verificar se o id corresponde à chave pública
      const id_verificado = await gerar_id_perfil(await importar_chave_publica(dados.meu_perfil.chave_publica))
      if (id_verificado === dados.meu_perfil.id) {
        const lista_contatos = await carregar_lista_contatos()
        if (!lista_contatos.solicitações_recebidas.find(p => p.id === dados.meu_perfil.id) &&
            !lista_contatos.contatos.find(p => p.id === dados.meu_perfil.id)) {
          lista_contatos.solicitações_recebidas.push(dados.meu_perfil)
          await salvar_lista_contatos(lista_contatos)
          rotear()
        } else if (lista_contatos.contatos.find(p => p.id === dados.meu_perfil.id)) {
          // Se já está na lista de contatos, confirmar o aceite para quem solicitou
          await enviar_confirmacao_aceite(dados.adicionar_contato_id, dados.meu_perfil)
        }
      }
    }
  }

  // 2. Verificar se é uma resposta para mim
  if (dados.id_destino && dados.mensagem_criptografada) {
    if (lista_perfis.perfis.includes(dados.id_destino)) {
      // Tentar descriptografar com a chave privada de cada um dos meus perfis (ou apenas do id_destino)
      const arquivo_id = await ler_arquivo(diretorio, dados.id_destino)
      if (arquivo_id) {
        const hash_perfil = await arquivo_id.text()
        const arquivo_perfil = await ler_arquivo(diretorio, hash_perfil)
        const meu_perfil = JSON.parse(await arquivo_perfil.text())

        try {
          const chave_privada = await importar_chave_privada(meu_perfil.chave_privada)
          const buffer = base64_para_buffer(dados.mensagem_criptografada)
          const conteudo = await descriptografar(chave_privada, buffer)

          if (conteudo.solicitação_aceita && conteudo.meu_perfil) {
            // Verificar id
            const id_verificado = await gerar_id_perfil(await importar_chave_publica(conteudo.meu_perfil.chave_publica))
            if (id_verificado === conteudo.meu_perfil.id) {
              const lista_contatos = await carregar_lista_contatos()
              if (!lista_contatos.contatos.find(p => p.id === conteudo.meu_perfil.id)) {
                lista_contatos.contatos.push(conteudo.meu_perfil)
                // Remove das enviadas
                lista_contatos.solicitações_enviadas = lista_contatos.solicitações_enviadas.filter(id => id !== conteudo.meu_perfil.id)
                if (lista_contatos.solicitações_enviadas_datas) {
                  delete lista_contatos.solicitações_enviadas_datas[conteudo.meu_perfil.id]
                }
                await salvar_lista_contatos(lista_contatos)
                rotear()
              }
            }
          }

          if (conteudo.chat_mensagem && conteudo.id_remetente) {
            const conversa = await carregar_conversa(dados.id_destino, conteudo.id_remetente)
            if (!conversa.mensagens.find(m => m.id === conteudo.id_mensagem)) {
              conversa.mensagens.push({
                id: conteudo.id_mensagem,
                id_remetente: conteudo.id_remetente,
                texto: conteudo.chat_mensagem,
                data: new Date().toISOString()
              })
              await salvar_conversa(dados.id_destino, conteudo.id_remetente, conversa)
              rotear()
            }
            await enviar_ack(conteudo.id_remetente, conteudo.id_mensagem)
          }

          if (conteudo.chat_ack && conteudo.id_remetente) {
            const conversa = await carregar_conversa(dados.id_destino, conteudo.id_remetente)
            const msg = conversa.mensagens.find(m => m.id === conteudo.chat_ack)
            if (msg && !msg.recebida) {
              msg.recebida = true
              await salvar_conversa(dados.id_destino, conteudo.id_remetente, conversa)
              rotear()
            }
          }
        } catch (e) {
          // Provavelmente não era para este perfil ou erro na descriptografia
          console.log("Falha ao descriptografar mensagem para", dados.id_destino, e)
        }
      }
    }
  }
}

window.cliente_mqtt = mqtt.connect("wss://broker.hivemq.com:8884/mqtt")
const cliente_mqtt = window.cliente_mqtt

cliente_mqtt.on("connect", () => {
  console.log("Conectado ao MQTT")
  cliente_mqtt.subscribe("kapivatar.net")
})

cliente_mqtt.on("message", (topico, mensagem) => {
  if (topico === "kapivatar.net") {
    try {
      const dados = JSON.parse(mensagem.toString())
      processar_mensagem_mqtt(dados)
    } catch (e) {
      console.error("Erro ao processar mensagem MQTT:", e)
    }
  }
})

const renderizar_lista_perfis = async (conteudo, chave_lista, somente_leitura, sinal_rota, hash_lista_forcado = null) => {
  const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)
  const arquivo_lista = hash_lista_forcado
    ? null
    : await aguardar_rota(ler_arquivo(diretorio, chave_lista), sinal_rota)
  const hash_lista = hash_lista_forcado || await aguardar_rota(arquivo_lista?.text(), sinal_rota)
  const arquivo_conteudo = hash_lista
    ? await aguardar_rota(ler_arquivo(diretorio, hash_lista), sinal_rota)
    : null
  const lista = arquivo_conteudo
    ? JSON.parse(await aguardar_rota(arquivo_conteudo.text(), sinal_rota))
    : { perfis: [] }

  if (!lista.perfis.length) {
    conteudo.innerHTML = chave_lista === "perfis_arquivados"
      ? "<p>Nenhum perfil arquivado.</p>"
      : "<p>Nenhum perfil encontrado.</p>"
    return
  }

  const grid = document.createElement("div")
  grid.classList.add("perfis-grid")
  conteudo.appendChild(grid)

  for (const id_ou_hash_perfil of lista.perfis) {
    let hash_perfil = id_ou_hash_perfil
    let id_perfil = id_ou_hash_perfil

    const arquivo_id = await aguardar_rota(ler_arquivo(diretorio, id_perfil), sinal_rota)
    if (arquivo_id) {
      const texto_id = await aguardar_rota(arquivo_id.text(), sinal_rota)
      if (texto_id.length === 64 && /^[a-f0-9]+$/.test(texto_id)) {
        hash_perfil = texto_id
      } else {
        id_perfil = null
      }
    } else {
      id_perfil = null
    }

    const arquivo_perfil = await aguardar_rota(ler_arquivo(diretorio, hash_perfil), sinal_rota)
    if (!arquivo_perfil) continue
    const dados = JSON.parse(await aguardar_rota(arquivo_perfil.text(), sinal_rota))

    const card = document.createElement("div")
    card.classList.add("perfil-card")
    if (id_perfil) card.onclick = () => navegar(`/perfil/${id_perfil}`)

    if (id_perfil && !somente_leitura) {
      const menu_container = document.createElement("div")
      menu_container.classList.add("perfil-menu-container")

      const botao_menu = document.createElement("button")
      botao_menu.classList.add("perfil-menu-botao")
      botao_menu.setAttribute("aria-label", `Ações para ${dados.nome}`)
      const icone_menu = document.createElement("span")
      icone_menu.classList.add("material-symbols-outlined")
      icone_menu.textContent = "more_vert"
      botao_menu.appendChild(icone_menu)

      const dropdown = document.createElement("div")
      dropdown.classList.add("perfil-menu-dropdown")

      const criar_acao_menu = (nome, icone, executar) => {
        const item = document.createElement("button")
        item.classList.add("perfil-menu-item")
        const simbolo = document.createElement("span")
        simbolo.classList.add("material-symbols-outlined")
        simbolo.textContent = icone
        item.appendChild(simbolo)
        const texto = document.createElement("span")
        texto.textContent = nome
        item.appendChild(texto)
        item.onclick = async (e) => {
          e.stopPropagation()
          await executar()
        }
        dropdown.appendChild(item)
      }

      if (chave_lista === "perfis_arquivados") {
        criar_acao_menu("Restaurar perfil", "unarchive", () => restaurar_perfil(id_perfil))
      } else {
        criar_acao_menu("Selecionar perfil", "check_circle", async () => {
          await definir_id_perfil_selecionado(id_perfil)
          navegar("/")
        })
        criar_acao_menu("Arquivar perfil", "archive", async () => {
          if (confirm(`Tem certeza que deseja arquivar o perfil de "${dados.nome}"?`)) {
            await arquivar_perfil(id_perfil)
          }
        })
      }

      menu_container.appendChild(botao_menu)
      menu_container.appendChild(dropdown)
      card.appendChild(menu_container)

      botao_menu.onclick = (e) => {
        e.stopPropagation()
        const ja_aberto = dropdown.classList.contains("aberto")
        document.querySelectorAll(".perfil-menu-dropdown.aberto").forEach(d => d.classList.remove("aberto"))
        if (!ja_aberto) {
          dropdown.classList.add("aberto")
          const fechar = () => {
            dropdown.classList.remove("aberto")
            document.removeEventListener("click", fechar)
          }
          setTimeout(() => document.addEventListener("click", fechar), 0)
        }
      }
    }

    if (dados.capa) {
      const img_capa = document.createElement("img")
      const arquivo_capa = await aguardar_rota(ler_arquivo(diretorio, dados.capa), sinal_rota)
      if (arquivo_capa) img_capa.src = URL.createObjectURL(arquivo_capa)
      img_capa.classList.add("perfil-capa")
      img_capa.alt = `Capa de ${dados.nome}`
      card.appendChild(img_capa)
    }

    const info = document.createElement("div")
    info.classList.add("perfil-info")

    if (dados.foto) {
      const img_foto = document.createElement("img")
      const arquivo_foto = await aguardar_rota(ler_arquivo(diretorio, dados.foto), sinal_rota)
      if (arquivo_foto) img_foto.src = URL.createObjectURL(arquivo_foto)
      img_foto.classList.add("perfil-foto")
      img_foto.alt = `Foto de ${dados.nome}`
      img_foto.style.marginTop = dados.capa ? "-35px" : "0"
      info.appendChild(img_foto)
    }

    const nome = document.createElement("h3")
    nome.textContent = dados.nome
    nome.classList.add("perfil-nome")
    info.appendChild(nome)

    const bio = document.createElement("p")
    bio.textContent = dados.bio
    bio.classList.add("perfil-bio")
    info.appendChild(bio)

    card.appendChild(info)
    grid.appendChild(card)
  }
}

const carregar_lista_assobios = async (diretorio, chave) => {
  const arquivo_lista = await ler_arquivo(diretorio, chave)
  if (!arquivo_lista) return { assobios: [] }
  const hash_lista = await arquivo_lista.text()
  const arquivo_conteudo = await ler_arquivo(diretorio, hash_lista)
  if (!arquivo_conteudo) throw new Error(`Lista de assobios ausente: ${chave}`)
  return JSON.parse(await arquivo_conteudo.text())
}

const salvar_lista_assobios = async (diretorio, chave, assobios) => {
  const arquivo_lista = await ler_arquivo(diretorio, chave)
  const anterior = arquivo_lista ? await arquivo_lista.text() : null
  const dados = { assobios, data: new Date().toISOString(), ...(anterior ? { anterior } : {}) }
  const conteudo = JSON.stringify(dados)
  const hash = await gerar_hash(conteudo)
  await escrever_arquivo(diretorio, hash, conteudo)
  await escrever_arquivo(diretorio, chave, hash)
}

const carregar_dados_assobio = async (diretorio, id) => {
  const arquivo_id = await ler_arquivo(diretorio, id)
  if (!arquivo_id) return null
  const hash = await arquivo_id.text()
  const arquivo = await ler_arquivo(diretorio, hash)
  return arquivo ? { hash, dados: JSON.parse(await arquivo.text()) } : null
}

const salvar_assobio = async (diretorio, id, dados, hash_anterior = null) => {
  const versão = { ...dados, data_modificacao: new Date().toISOString(), ...(hash_anterior ? { anterior: hash_anterior } : {}) }
  const conteudo = JSON.stringify(versão)
  const hash = await gerar_hash(conteudo)
  await escrever_arquivo(diretorio, hash, conteudo)
  await escrever_arquivo(diretorio, id, hash)
  return versão
}

const arquivar_assobio = async (id, arquivar) => {
  const diretorio = await obter_diretorio()
  const ativos = await carregar_lista_assobios(diretorio, "assobios")
  const arquivados = await carregar_lista_assobios(diretorio, "assobios_arquivados")
  if (arquivar) {
    if (!ativos.assobios.includes(id)) return
    await salvar_lista_assobios(diretorio, "assobios_arquivados", [...new Set([...arquivados.assobios, id])])
    await salvar_lista_assobios(diretorio, "assobios", ativos.assobios.filter(item => item !== id))
  } else {
    if (!arquivados.assobios.includes(id)) return
    await salvar_lista_assobios(diretorio, "assobios", [...new Set([...ativos.assobios, id])])
    await salvar_lista_assobios(diretorio, "assobios_arquivados", arquivados.assobios.filter(item => item !== id))
  }
  rotear()
}

const renderizar_lista_assobios = async (conteudo, chave_lista, sinal_rota) => {
  const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)
  const lista = await carregar_lista_assobios(diretorio, chave_lista)
  if (!lista.assobios.length) {
    conteudo.innerHTML = chave_lista === "assobios_arquivados" ? "<p>Nenhum assobio arquivado.</p>" : "<p>Nenhum assobio encontrado.</p>"
    return
  }
  const ul = document.createElement("ul")
  for (const id of lista.assobios) {
    const item = document.createElement("li")
    const registro = await carregar_dados_assobio(diretorio, id)
    if (!registro) continue
    const link = document.createElement("a")
    link.href = `/assobio/${id}`
    link.textContent = `${registro.dados.perfil_nome} — ${registro.dados.data}`
    item.appendChild(link)
    const nota = document.createElement("p")
    nota.textContent = registro.dados.nota
    item.appendChild(nota)
    const acao = document.createElement("button")
    acao.type = "button"
    acao.textContent = chave_lista === "assobios_arquivados" ? "Restaurar" : "Arquivar"
    acao.onclick = async () => await arquivar_assobio(id, chave_lista !== "assobios_arquivados")
    item.appendChild(acao)
    ul.appendChild(item)
  }
  conteudo.appendChild(ul)
}

const criar_formulario_assobio = async (conteudo, registro, sinal_rota) => {
  const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)
  const perfis = await carregar_lista_perfis(diretorio, "perfis")
  const form = document.createElement("form")
  form.classList.add("form-perfil")

  const campo_perfil = document.createElement("div")
  campo_perfil.classList.add("form-campo")
  const label_perfil = document.createElement("label")
  label_perfil.textContent = "Perfil"
  label_perfil.htmlFor = "perfil"
  const select = document.createElement("select")
  select.id = "perfil"
  select.name = "perfil"
  select.required = true
  for (const id of perfis.perfis) {
    const arquivo_id = await aguardar_rota(ler_arquivo(diretorio, id), sinal_rota)
    if (!arquivo_id) continue
    const arquivo_perfil = await aguardar_rota(ler_arquivo(diretorio, await arquivo_id.text()), sinal_rota)
    if (!arquivo_perfil) continue
    const dados_perfil = JSON.parse(await aguardar_rota(arquivo_perfil.text(), sinal_rota))
    const option = document.createElement("option")
    option.value = id
    option.textContent = dados_perfil.nome
    option.selected = registro?.dados.perfil === id
    select.appendChild(option)
  }
  if (!registro && select.options.length) {
    const selecionado = await aguardar_rota(obter_id_perfil_selecionado(sinal_rota), sinal_rota)
    const option = Array.from(select.options).find(item => item.value === selecionado)
    if (option) option.selected = true
  }
  campo_perfil.append(label_perfil, select)
  form.appendChild(campo_perfil)
  const criar_campo = (nome, tipo, valor = "") => {
    const campo = document.createElement("div")
    campo.classList.add("form-campo")
    const label = document.createElement("label")
    label.textContent = nome
    label.htmlFor = nome.toLowerCase()
    const input = document.createElement(tipo === "textarea" ? "textarea" : "input")
    if (tipo !== "textarea") input.type = tipo
    input.id = nome.toLowerCase()
    input.name = nome.toLowerCase()
    input.value = valor
    input.required = true
    campo.append(label, input)
    return campo
  }
  form.appendChild(criar_campo("Data", "date", registro?.dados.data || new Date().toISOString().slice(0, 10)))
  form.appendChild(criar_campo("Nota", "textarea", registro?.dados.nota || ""))
  const botao = document.createElement("button")
  botao.type = "submit"
  botao.textContent = "Salvar Assobio"
  form.appendChild(botao)
  form.onsubmit = async (evento) => {
    evento.preventDefault()
    botao.disabled = true
    try {
      const option = select.selectedOptions[0]
      const dados = {
        perfil: select.value,
        perfil_nome: option.textContent,
        data: form.elements.namedItem("data").value,
        nota: form.elements.namedItem("nota").value,
      }
      const id = registro?.id || crypto.randomUUID()
      await salvar_assobio(diretorio, id, dados, registro?.hash)
      if (!registro) {
        const ativos = await carregar_lista_assobios(diretorio, "assobios")
        await salvar_lista_assobios(diretorio, "assobios", [...ativos.assobios, id])
      }
      navegar(`/assobio/${id}`)
    } catch (erro) {
      console.error("Erro ao salvar assobio:", erro)
      botao.disabled = false
    }
  }
  conteudo.appendChild(form)
}

const páginas = [
  página_inicial,
  {
    nome: "Perfis",
    url: "/perfis",
    ícone: "account_circle",
    ocultar_no_menu: true,
    ações: [
      {
        nome: "Criar perfil",
        url: "/perfis/criar",
        ícone: "person_add",
      },
      {
        nome: "Arquivo",
        url: "/perfis/arquivo",
        ícone: "archive",
      },
    ],
    render: async (conteudo, params, route_params, sinal_rota) => {
      await renderizar_lista_perfis(conteudo, "perfis", Boolean(params.get("v")), sinal_rota, params.get("v"))
    }
  },
  {
    nome: "Criar Perfil",
    url: "/perfis/criar",
    ícone: "person_add",
    ocultar_no_menu: true,
    render: (conteudo) => {
      const form = document.createElement("form")
      form.classList.add("form-perfil")

      const criar_campo_arquivo = (label, id) => {
        const div = document.createElement("div")
        div.classList.add("form-campo")
        const l = document.createElement("label")
        l.textContent = label
        l.htmlFor = id
        div.appendChild(l)

        const container = document.createElement("div")
        container.classList.add("input-arquivo-container")

        const input = document.createElement("input")
        input.type = "file"
        input.id = id
        input.name = id
        input.accept = "image/*"
        input.style.display = "none"

        const botao_upload = document.createElement("button")
        botao_upload.type = "button"
        const icone = document.createElement("span")
        icone.classList.add("material-symbols-outlined")
        icone.textContent = "upload_file"
        botao_upload.appendChild(icone)
        const texto = document.createElement("span")
        texto.textContent = "Escolher imagem"
        botao_upload.appendChild(texto)

        botao_upload.onclick = () => input.click()

        const preview_container = document.createElement("div")
        preview_container.classList.add("preview-container")
        preview_container.style.display = "none"

        const preview_img = document.createElement("img")
        preview_img.classList.add("preview-imagem")
        preview_container.appendChild(preview_img)

        const nome_arquivo = document.createElement("span")
        nome_arquivo.classList.add("nome-arquivo")
        preview_container.appendChild(nome_arquivo)

        input.onchange = () => {
          if (input.files.length > 0) {
            const file = input.files[0]
            nome_arquivo.textContent = file.name
            preview_img.src = URL.createObjectURL(file)
            preview_container.style.display = "flex"
          } else {
            preview_container.style.display = "none"
          }
        }

        container.appendChild(input)
        container.appendChild(botao_upload)
        container.appendChild(preview_container)
        div.appendChild(container)
        return div
      }

      const criar_campo = (label, tipo, id, attributes = {}) => {
        const div = document.createElement("div")
        div.classList.add("form-campo")
        const l = document.createElement("label")
        l.textContent = label
        l.htmlFor = id
        div.appendChild(l)
        let input
        if (tipo === "textarea") {
          input = document.createElement("textarea")
        } else {
          input = document.createElement("input")
          input.type = tipo
        }
        input.id = id
        input.name = id
        Object.assign(input, attributes)
        div.appendChild(input)
        return div
      }

      form.appendChild(criar_campo_arquivo("Capa", "capa"))
      form.appendChild(criar_campo_arquivo("Foto de Perfil", "foto"))
      form.appendChild(criar_campo("Nome", "text", "nome", { required: true }))
      form.appendChild(criar_campo("Bio", "textarea", "bio"))

      const botao = document.createElement("button")
      const span_ícone = document.createElement("span")
      span_ícone.classList.add("material-symbols-outlined")
      span_ícone.textContent = "save"
      botao.appendChild(span_ícone)
      const span_texto = document.createElement("span")
      span_texto.textContent = "Salvar Perfil"
      botao.appendChild(span_texto)
      botao.type = "submit"
      botao.setAttribute("aria-live", "polite")
      form.appendChild(botao)

        form.onsubmit = async (e) => {
        e.preventDefault()
        botao.disabled = true
        span_texto.textContent = "Salvando..."

        try {
          const diretorio = await obter_diretorio()

          // Gerar chaves para o novo perfil
          const chaves = await gerar_chaves()
          const chave_privada_jwk = await exportar_chave(chaves.privateKey)
          const chave_publica_jwk = await exportar_chave(chaves.publicKey)
          const id_perfil = await gerar_id_perfil(chaves.publicKey)

        const dados = {
          nome: form.nome.value,
          bio: form.bio.value,
          id: id_perfil,
          chave_privada: chave_privada_jwk,
          chave_publica: chave_publica_jwk,
        }

        const salvar_imagem = async (input) => {
          if (input.files.length > 0) {
            const file = input.files[0]
            const buffer = await file.arrayBuffer()
            const hash = await gerar_hash(buffer)
            await escrever_arquivo(diretorio, hash, buffer)
            return hash
          }
          return null
        }

        const hash_capa = await salvar_imagem(form.capa)
        if (hash_capa) dados.capa = hash_capa

        const hash_foto = await salvar_imagem(form.foto)
        if (hash_foto) dados.foto = hash_foto

        const conteudo_perfil = JSON.stringify(dados)
        const hash_perfil = await gerar_hash(conteudo_perfil)
        await escrever_arquivo(diretorio, hash_perfil, conteudo_perfil)

        // Aponta o ID do perfil para a versão mais recente
        await escrever_arquivo(diretorio, id_perfil, hash_perfil)

        // Atualizar lista de perfis
        const arquivo_perfis = await ler_arquivo(diretorio, "perfis")
        const hash_lista_anterior = arquivo_perfis ? await arquivo_perfis.text() : null

        let nova_lista = {
          perfis: [id_perfil],
          data: new Date().toISOString()
        }

        if (hash_lista_anterior) {
          const arquivo_lista_anterior = await ler_arquivo(diretorio, hash_lista_anterior)
          if (arquivo_lista_anterior) {
            const lista_anterior = JSON.parse(await arquivo_lista_anterior.text())
            nova_lista.perfis = [...lista_anterior.perfis, id_perfil]
            nova_lista.anterior = hash_lista_anterior
          }
        }

        const conteudo_lista = JSON.stringify(nova_lista)
        const hash_nova_lista = await gerar_hash(conteudo_lista)
        await escrever_arquivo(diretorio, hash_nova_lista, conteudo_lista)
        await escrever_arquivo(diretorio, "perfis", hash_nova_lista)

        navegar("/perfis")
        } catch (err) {
          console.error("Erro ao salvar perfil:", err)
        }
      }

      conteudo.appendChild(form)
    }
  },
  {
    nome: "Arquivo",
    url: "/perfis/arquivo",
    ícone: "archive",
    ocultar_no_menu: true,
    ações: [
      { nome: "Voltar aos perfis", url: "/perfis", ícone: "account_circle" },
    ],
    render: async (conteudo, params, route_params, sinal_rota) => {
      await renderizar_lista_perfis(conteudo, "perfis_arquivados", false, sinal_rota)
    }
  },
  {
    nome: "Perfil",
    url: "/perfil/:id",
    ícone: "account_circle",
    ocultar_no_menu: true,
    ações: [
      {
        nome: "Editar",
        ícone: "edit",
        url_dinamica: (route_params) => `/perfil/${route_params.id}/editar`,
      },
      {
        nome: "Histórico",
        ícone: "history",
        url_dinamica: (route_params) => `/perfil/${route_params.id}/histórico`,
      },
    ],
    render: async (conteudo, params, route_params, sinal_rota) => {
      const id = route_params.id
      const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)

      let hash_perfil = params.get("v")

      if (!hash_perfil) {
        const arquivo_id = await aguardar_rota(ler_arquivo(diretorio, id), sinal_rota)
        if (!arquivo_id) {
          conteudo.innerHTML = "<p>Perfil não encontrado.</p>"
          return
        }
        hash_perfil = await aguardar_rota(arquivo_id.text(), sinal_rota)
      }

      const arquivo_perfil = await aguardar_rota(ler_arquivo(diretorio, hash_perfil), sinal_rota)
      if (!arquivo_perfil) {
        conteudo.innerHTML = "<p>Erro ao carregar dados do perfil.</p>"
        return
      }

      const dados = JSON.parse(await aguardar_rota(arquivo_perfil.text(), sinal_rota))

      const detalhe = document.createElement("div")
      detalhe.classList.add("perfil-detalhe")

      if (dados.capa) {
        const img_capa = document.createElement("img")
        const arquivo_capa = await aguardar_rota(ler_arquivo(diretorio, dados.capa), sinal_rota)
        if (arquivo_capa) img_capa.src = URL.createObjectURL(arquivo_capa)
        img_capa.classList.add("perfil-capa-detalhe")
        detalhe.appendChild(img_capa)
      }

      const info = document.createElement("div")
      info.classList.add("perfil-info-detalhe")

      if (dados.foto) {
        const img_foto = document.createElement("img")
        const arquivo_foto = await aguardar_rota(ler_arquivo(diretorio, dados.foto), sinal_rota)
        if (arquivo_foto) img_foto.src = URL.createObjectURL(arquivo_foto)
        img_foto.classList.add("perfil-foto-detalhe")
        img_foto.style.marginTop = dados.capa ? "-50px" : "0"
        info.appendChild(img_foto)
      }

      const nome = document.createElement("h2")
      nome.textContent = dados.nome
      info.appendChild(nome)

      const bio = document.createElement("p")
      bio.textContent = dados.bio
      info.appendChild(bio)

      detalhe.appendChild(info)
      conteudo.appendChild(detalhe)
    }
  },
  {
    nome: "Editar Perfil",
    url: "/perfil/:id/editar",
    ícone: "edit",
    ocultar_no_menu: true,
    render: async (conteudo, params, route_params, sinal_rota) => {
      const id = route_params.id
      const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)
      const arquivo_id = await aguardar_rota(ler_arquivo(diretorio, id), sinal_rota)

      if (!arquivo_id) {
        conteudo.innerHTML = "<p>Perfil não encontrado.</p>"
        return
      }

      const hash_perfil_atual = await aguardar_rota(arquivo_id.text(), sinal_rota)
      const arquivo_perfil = await aguardar_rota(ler_arquivo(diretorio, hash_perfil_atual), sinal_rota)
      const dados_atuais = JSON.parse(await aguardar_rota(arquivo_perfil.text(), sinal_rota))

      const form = document.createElement("form")
      form.classList.add("form-perfil")

      const criar_campo_arquivo = (label, id_campo, hash_atual) => {
        const div = document.createElement("div")
        div.classList.add("form-campo")
        const l = document.createElement("label")
        l.textContent = label
        l.htmlFor = id_campo
        div.appendChild(l)

        const container = document.createElement("div")
        container.classList.add("input-arquivo-container")

        const input = document.createElement("input")
        input.type = "file"
        input.id = id_campo
        input.name = id_campo
        input.accept = "image/*"
        input.style.display = "none"

        const botao_upload = document.createElement("button")
        botao_upload.type = "button"
        const icone = document.createElement("span")
        icone.classList.add("material-symbols-outlined")
        icone.textContent = "upload_file"
        botao_upload.appendChild(icone)
        const texto = document.createElement("span")
        texto.textContent = "Escolher imagem"
        botao_upload.appendChild(texto)

        botao_upload.onclick = () => input.click()

        const preview_container = document.createElement("div")
        preview_container.classList.add("preview-container")

        const preview_img = document.createElement("img")
        preview_img.classList.add("preview-imagem")
        preview_container.appendChild(preview_img)

        const nome_arquivo = document.createElement("span")
        nome_arquivo.classList.add("nome-arquivo")
        preview_container.appendChild(nome_arquivo)

        if (hash_atual) {
          ler_arquivo(diretorio, hash_atual).then(file => {
            if (file) {
              preview_img.src = URL.createObjectURL(file)
              preview_container.style.display = "flex"
            }
          })
        } else {
          preview_container.style.display = "none"
        }

        input.onchange = () => {
          if (input.files.length > 0) {
            const file = input.files[0]
            nome_arquivo.textContent = file.name
            preview_img.src = URL.createObjectURL(file)
            preview_container.style.display = "flex"
          }
        }

        container.appendChild(input)
        container.appendChild(botao_upload)
        container.appendChild(preview_container)
        div.appendChild(container)
        return div
      }

      const criar_campo = (label, tipo, id_campo, valor, attributes = {}) => {
        const div = document.createElement("div")
        div.classList.add("form-campo")
        const l = document.createElement("label")
        l.textContent = label
        l.htmlFor = id_campo
        div.appendChild(l)
        let input
        if (tipo === "textarea") {
          input = document.createElement("textarea")
          input.textContent = valor || ""
        } else {
          input = document.createElement("input")
          input.type = tipo
          input.value = valor || ""
        }
        input.id = id_campo
        input.name = id_campo
        Object.assign(input, attributes)
        div.appendChild(input)
        return div
      }

      form.appendChild(criar_campo_arquivo("Capa", "capa", dados_atuais.capa))
      form.appendChild(criar_campo_arquivo("Foto de Perfil", "foto", dados_atuais.foto))
      form.appendChild(criar_campo("Nome", "text", "nome", dados_atuais.nome, { required: true }))
      form.appendChild(criar_campo("Bio", "textarea", "bio", dados_atuais.bio))

      const botao = document.createElement("button")
      const span_ícone = document.createElement("span")
      span_ícone.classList.add("material-symbols-outlined")
      span_ícone.textContent = "save"
      botao.appendChild(span_ícone)
      const span_texto = document.createElement("span")
      span_texto.textContent = "Salvar Alterações"
      botao.appendChild(span_texto)
      botao.type = "submit"
      form.appendChild(botao)

      form.onsubmit = async (e) => {
        e.preventDefault()
        botao.disabled = true
        span_texto.textContent = "Salvando..."

        try {
          const dados_novos = {
            ...dados_atuais,
            nome: form.nome.value,
            bio: form.bio.value,
            anterior: hash_perfil_atual,
            data: new Date().toISOString()
          }

          const salvar_imagem = async (input, hash_antigo) => {
            if (input.files.length > 0) {
              const file = input.files[0]
              const buffer = await file.arrayBuffer()
              const hash = await gerar_hash(buffer)
              await escrever_arquivo(diretorio, hash, buffer)
              return hash
            }
            return hash_antigo
          }

          dados_novos.capa = await salvar_imagem(form.capa, dados_atuais.capa)
          dados_novos.foto = await salvar_imagem(form.foto, dados_atuais.foto)

          const conteudo_perfil = JSON.stringify(dados_novos)
          const hash_perfil_novo = await gerar_hash(conteudo_perfil)
          await escrever_arquivo(diretorio, hash_perfil_novo, conteudo_perfil)

          // Atualiza o ponteiro do ID do perfil
          await escrever_arquivo(diretorio, id, hash_perfil_novo)

          navegar(`/perfil/${id}`)
        } catch (err) {
          console.error("Erro ao editar perfil:", err)
          botao.disabled = false
          span_texto.textContent = "Salvar Alterações"
        }
      }

      conteudo.appendChild(form)
    }
  },
  {
    nome: "Histórico do Perfil",
    url: "/perfil/:id/histórico",
    ícone: "history",
    ocultar_no_menu: true,
    render: async (conteudo, params, route_params, sinal_rota) => {
      const id = route_params.id
      const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)

      const carregar_versao = async (hash) => {
        if (!hash) return null
        const arquivo = await aguardar_rota(ler_arquivo(diretorio, hash), sinal_rota)
        if (!arquivo) return null
        return JSON.parse(await aguardar_rota(arquivo.text(), sinal_rota))
      }

      const secao_historico = document.createElement("div")
      secao_historico.classList.add("historico")
      secao_historico.style.marginTop = "0"
      secao_historico.style.borderTop = "none"

      const lista_historico = document.createElement("ul")

      // Começa da versão atual apontada pelo ID
      const arquivo_id = await aguardar_rota(ler_arquivo(diretorio, id), sinal_rota)
      let hash_cursor = arquivo_id ? await aguardar_rota(arquivo_id.text(), sinal_rota) : null

      while (hash_cursor) {
        const dados_versao = await aguardar_rota(carregar_versao(hash_cursor), sinal_rota)
        if (!dados_versao) break

        const item = document.createElement("li")
        const link = document.createElement("a")
        const data = window.isScreenshotTest ? new Date('2026-03-30T12:00:00.000Z').toLocaleString() : (dados_versao.data ? new Date(dados_versao.data).toLocaleString() : `Versão: ${hash_cursor}`)
        link.textContent = data
        link.href = `/perfil/${id}?v=${hash_cursor}`
        item.appendChild(link)
        lista_historico.appendChild(item)

        hash_cursor = dados_versao.anterior
      }

      if (lista_historico.children.length > 0) {
        secao_historico.appendChild(lista_historico)
        conteudo.appendChild(secao_historico)
      } else {
        conteudo.innerHTML = "<p>Nenhum histórico encontrado.</p>"
      }
    }
  },
  {
    nome: "Assobios",
    url: "/assobios",
    ícone: "campaign",
    ações: [
      { nome: "Criar assobio", url: "/assobios/criar", ícone: "add" },
      { nome: "Arquivo", url: "/assobios/arquivo", ícone: "archive" },
    ],
    render: async (conteudo, params, route_params, sinal_rota) => {
      await renderizar_lista_assobios(conteudo, "assobios", sinal_rota)
    }
  },
  {
    nome: "Criar Assobio",
    url: "/assobios/criar",
    ícone: "add",
    ocultar_no_menu: true,
    render: async (conteudo, params, route_params, sinal_rota) => {
      await criar_formulario_assobio(conteudo, null, sinal_rota)
    }
  },
  {
    nome: "Arquivo de Assobios",
    url: "/assobios/arquivo",
    ícone: "archive",
    ocultar_no_menu: true,
    ações: [{ nome: "Voltar aos assobios", url: "/assobios", ícone: "campaign" }],
    render: async (conteudo, params, route_params, sinal_rota) => {
      await renderizar_lista_assobios(conteudo, "assobios_arquivados", sinal_rota)
    }
  },
  {
    nome: "Assobio",
    url: "/assobio/:id",
    ícone: "campaign",
    ocultar_no_menu: true,
    ações: [
      { nome: "Editar", ícone: "edit", url_dinamica: route_params => `/assobio/${route_params.id}/editar` },
      { nome: "Histórico", ícone: "history", url_dinamica: route_params => `/assobio/${route_params.id}/histórico` },
    ],
    render: async (conteudo, params, route_params, sinal_rota) => {
      const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)
      const atual = await carregar_dados_assobio(diretorio, route_params.id)
      const hash = params.get("v") || atual?.hash
      const arquivo = hash ? await aguardar_rota(ler_arquivo(diretorio, hash), sinal_rota) : null
      if (!arquivo) {
        conteudo.innerHTML = "<p>Assobio não encontrado.</p>"
        return
      }
      const dados = JSON.parse(await aguardar_rota(arquivo.text(), sinal_rota))
      const perfil = document.createElement("p")
      perfil.textContent = `Perfil: ${dados.perfil_nome}`
      const data = document.createElement("p")
      data.textContent = `Data: ${dados.data}`
      const nota = document.createElement("p")
      nota.textContent = dados.nota
      conteudo.append(perfil, data, nota)
    }
  },
  {
    nome: "Editar Assobio",
    url: "/assobio/:id/editar",
    ícone: "edit",
    ocultar_no_menu: true,
    render: async (conteudo, params, route_params, sinal_rota) => {
      const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)
      const atual = await carregar_dados_assobio(diretorio, route_params.id)
      if (!atual) {
        conteudo.innerHTML = "<p>Assobio não encontrado.</p>"
        return
      }
      await criar_formulario_assobio(conteudo, { ...atual, id: route_params.id }, sinal_rota)
    }
  },
  {
    nome: "Histórico do Assobio",
    url: "/assobio/:id/histórico",
    ícone: "history",
    ocultar_no_menu: true,
    render: async (conteudo, params, route_params, sinal_rota) => {
      const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)
      const lista = document.createElement("ul")
      const atual = await carregar_dados_assobio(diretorio, route_params.id)
      let hash = atual?.hash
      while (hash) {
        const arquivo = await aguardar_rota(ler_arquivo(diretorio, hash), sinal_rota)
        if (!arquivo) break
        const versão = JSON.parse(await aguardar_rota(arquivo.text(), sinal_rota))
        const item = document.createElement("li")
        const link = document.createElement("a")
        link.href = `/assobio/${route_params.id}?v=${hash}`
        link.textContent = new Date(versão.data_modificacao).toLocaleString()
        item.appendChild(link)
        lista.appendChild(item)
        hash = versão.anterior
      }
      if (lista.children.length) conteudo.appendChild(lista)
      else conteudo.innerHTML = "<p>Nenhum histórico encontrado.</p>"
    }
  },
  {
    nome: "Contatos",
    url: "/contatos",
    ícone: "contacts",
    ações: [
      {
        nome: "Adicionar",
        url: "/contatos/adicionar",
        ícone: "person_add",
      },
      {
        nome: "Solicitações",
        url: "/contatos/solicitações",
        ícone: "group_add",
      },
    ],
    render: async (conteudo, params, route_params, sinal_rota) => {
      const lista = await aguardar_rota(carregar_lista_contatos(undefined, sinal_rota), sinal_rota)
      if (lista.contatos.length === 0) {
        conteudo.innerHTML = "<p>Sua lista de contatos está vazia.</p>"
      } else {
        const grid = document.createElement("div")
        grid.classList.add("perfis-grid")
        conteudo.appendChild(grid)

        const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)

        for (const contato of lista.contatos) {
          const card = document.createElement("div")
          card.classList.add("perfil-card")
          card.onclick = () => navegar(`/contato/${contato.id}`)

          if (contato.capa) {
            const img_capa = document.createElement("img")
            const arquivo_capa = await aguardar_rota(ler_arquivo(diretorio, contato.capa), sinal_rota)
            if (arquivo_capa) img_capa.src = URL.createObjectURL(arquivo_capa)
            img_capa.classList.add("perfil-capa")
            img_capa.alt = `Capa de ${contato.nome}`
            card.appendChild(img_capa)
          }

          const info = document.createElement("div")
          info.classList.add("perfil-info")

          if (contato.foto) {
            const img_foto = document.createElement("img")
            const arquivo_foto = await aguardar_rota(ler_arquivo(diretorio, contato.foto), sinal_rota)
            if (arquivo_foto) img_foto.src = URL.createObjectURL(arquivo_foto)
            img_foto.classList.add("perfil-foto")
            img_foto.alt = `Foto de ${contato.nome}`
            img_foto.style.marginTop = contato.capa ? "-35px" : "0"
            info.appendChild(img_foto)
          }

          const nome = document.createElement("h3")
          nome.textContent = contato.nome
          nome.classList.add("perfil-nome")
          info.appendChild(nome)

          const bio = document.createElement("p")
          bio.textContent = contato.bio
          bio.classList.add("perfil-bio")
          info.appendChild(bio)

          card.appendChild(info)
          grid.appendChild(card)
        }
      }
    }
  },
  {
    nome: "Adicionar Contato",
    url: "/contatos/adicionar",
    ícone: "person_add",
    ocultar_no_menu: true,
    render: async (conteudo, params, route_params, sinal_rota) => {
      const id_meu_perfil = await aguardar_rota(obter_id_perfil_selecionado(sinal_rota), sinal_rota)
      if (!id_meu_perfil) {
        conteudo.innerHTML = "<p>Selecione um perfil primeiro.</p>"
        return
      }

      const div_meu_id = document.createElement("div")
      div_meu_id.classList.add("form-campo")
      const label_meu_id = document.createElement("label")
      label_meu_id.textContent = "Meu ID de Perfil"
      div_meu_id.appendChild(label_meu_id)

      const container_input = document.createElement("div")
      container_input.style.display = "flex"
      container_input.style.gap = "0.5em"

      const input_meu_id = document.createElement("input")
      input_meu_id.type = "text"
      input_meu_id.value = window.isScreenshotTest ? "[MOCKED_ID]" : id_meu_perfil
      input_meu_id.readOnly = true
      input_meu_id.style.flex = "1"
      container_input.appendChild(input_meu_id)

      const botao_copiar = document.createElement("button")
      botao_copiar.type = "button"
      const icone_copiar = document.createElement("span")
      icone_copiar.classList.add("material-symbols-outlined")
      icone_copiar.textContent = "content_copy"
      botao_copiar.appendChild(icone_copiar)
      botao_copiar.onclick = () => {
        navigator.clipboard.writeText(id_meu_perfil)
        alert("ID copiado!")
      }
      container_input.appendChild(botao_copiar)
      div_meu_id.appendChild(container_input)
      conteudo.appendChild(div_meu_id)

      const form = document.createElement("form")
      form.classList.add("form-perfil")
      form.style.marginTop = "2em"

      const div_contato_id = document.createElement("div")
      div_contato_id.classList.add("form-campo")
      const label_contato_id = document.createElement("label")
      label_contato_id.textContent = "ID do Contato para Adicionar"
      label_contato_id.htmlFor = "contato_id"
      div_contato_id.appendChild(label_contato_id)

      const input_contato_id = document.createElement("input")
      input_contato_id.type = "text"
      input_contato_id.id = "contato_id"
      input_contato_id.name = "contato_id"
      input_contato_id.required = true
      div_contato_id.appendChild(input_contato_id)
      form.appendChild(div_contato_id)

      const botao_adicionar = document.createElement("button")
      botao_adicionar.type = "submit"
      const icone_add = document.createElement("span")
      icone_add.classList.add("material-symbols-outlined")
      icone_add.textContent = "person_add"
      botao_adicionar.appendChild(icone_add)
      const texto_add = document.createElement("span")
      texto_add.textContent = "Adicionar Contato"
      botao_adicionar.appendChild(texto_add)
      form.appendChild(botao_adicionar)

      form.onsubmit = async (e) => {
        e.preventDefault()
        const id_alvo = form.contato_id.value
        await enviar_solicitacao_contato(id_alvo)
        navegar("/contatos/solicitações")
      }

      conteudo.appendChild(form)
    }
  },
  {
    nome: "Solicitações de Contato",
    url: "/contatos/solicitações",
    ícone: "group_add",
    ocultar_no_menu: true,
    render: async (conteudo, params, route_params, sinal_rota) => {
      const lista = await aguardar_rota(carregar_lista_contatos(undefined, sinal_rota), sinal_rota)

      const grid = document.createElement("div")
      grid.style.display = "grid"
      grid.style.gridTemplateColumns = "1fr 1fr"
      grid.style.gap = "2em"
      conteudo.appendChild(grid)

      const div_enviadas = document.createElement("div")
      const h3_enviadas = document.createElement("h3")
      h3_enviadas.textContent = "Solicitações Enviadas"
      div_enviadas.appendChild(h3_enviadas)

      if (lista.solicitações_enviadas.length === 0) {
        const p = document.createElement("p")
        p.textContent = "Nenhuma solicitação enviada."
        div_enviadas.appendChild(p)
      } else {
        const ul = document.createElement("ul")
        ul.classList.add("lista-solicitacoes")
        lista.solicitações_enviadas.forEach(id => {
          const li = document.createElement("li")
          li.classList.add("item-solicitacao")

          const info = document.createElement("div")
          info.classList.add("item-solicitacao-info")
          const span_id = document.createElement("span")
          span_id.classList.add("item-solicitacao-id")
          span_id.textContent = window.isScreenshotTest ? "[MOCKED_ID]" : id
          info.appendChild(span_id)

          li.appendChild(info)
          ul.appendChild(li)
        })
        div_enviadas.appendChild(ul)
      }
      grid.appendChild(div_enviadas)

      const div_recebidas = document.createElement("div")
      const h3_recebidas = document.createElement("h3")
      h3_recebidas.textContent = "Solicitações Recebidas"
      div_recebidas.appendChild(h3_recebidas)

      if (lista.solicitações_recebidas.length === 0) {
        const p = document.createElement("p")
        p.textContent = "Nenhuma solicitação recebida."
        div_recebidas.appendChild(p)
      } else {
        const ul = document.createElement("ul")
        ul.classList.add("lista-solicitacoes")
        lista.solicitações_recebidas.forEach(perfil => {
          const li = document.createElement("li")
          li.classList.add("item-solicitacao")

          const info = document.createElement("div")
          info.classList.add("item-solicitacao-info")
          const nome = document.createElement("span")
          nome.textContent = perfil.nome || "Sem nome"
          info.appendChild(nome)
          const span_id = document.createElement("span")
          span_id.classList.add("item-solicitacao-id")
          span_id.textContent = window.isScreenshotTest ? "[MOCKED_ID]" : perfil.id
          info.appendChild(span_id)
          li.appendChild(info)

          const botao_aceitar = document.createElement("button")
          botao_aceitar.textContent = "Aceitar"
          botao_aceitar.onclick = async () => {
            await aceitar_solicitacao_contato(perfil)
            rotear()
          }
          li.appendChild(botao_aceitar)
          ul.appendChild(li)
        })
        div_recebidas.appendChild(ul)
      }
      grid.appendChild(div_recebidas)
    }
  },
  {
    nome: "Contato",
    url: "/contato/:id",
    ícone: "person",
    ocultar_no_menu: true,
    render: async (conteudo, params, route_params, sinal_rota) => {
      const id_contato = route_params.id
      const id_meu_perfil = await aguardar_rota(obter_id_perfil_selecionado(sinal_rota), sinal_rota)
      const diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)

      const lista_contatos = await aguardar_rota(carregar_lista_contatos(undefined, sinal_rota), sinal_rota)
      const dados = lista_contatos.contatos.find(c => c.id === id_contato)

      if (!dados) {
        conteudo.innerHTML = "<p>Contato não encontrado.</p>"
        return
      }

      const detalhe = document.createElement("div")
      detalhe.classList.add("perfil-detalhe")

      if (dados.capa) {
        const img_capa = document.createElement("img")
        const arquivo_capa = await aguardar_rota(ler_arquivo(diretorio, dados.capa), sinal_rota)
        if (arquivo_capa) img_capa.src = URL.createObjectURL(arquivo_capa)
        img_capa.classList.add("perfil-capa-detalhe")
        detalhe.appendChild(img_capa)
      }

      const info = document.createElement("div")
      info.classList.add("perfil-info-detalhe")

      if (dados.foto) {
        const img_foto = document.createElement("img")
        const arquivo_foto = await aguardar_rota(ler_arquivo(diretorio, dados.foto), sinal_rota)
        if (arquivo_foto) img_foto.src = URL.createObjectURL(arquivo_foto)
        img_foto.classList.add("perfil-foto-detalhe")
        img_foto.style.marginTop = dados.capa ? "-50px" : "0"
        info.appendChild(img_foto)
      }

      const nome = document.createElement("h2")
      nome.textContent = dados.nome
      info.appendChild(nome)

      const bio = document.createElement("p")
      bio.textContent = dados.bio
      info.appendChild(bio)

      detalhe.appendChild(info)
      conteudo.appendChild(detalhe)

      // Chat
      const chat_container = document.createElement("div")
      chat_container.classList.add("chat-container")

      const mensagens_div = document.createElement("div")
      mensagens_div.classList.add("chat-mensagens")

      const conversa = await aguardar_rota(carregar_conversa(id_meu_perfil, id_contato, sinal_rota), sinal_rota)
      conversa.mensagens.forEach(msg => {
        const msg_div = document.createElement("div")
        msg_div.classList.add("chat-mensagem")
        msg_div.classList.add(msg.id_remetente === id_meu_perfil ? "minha" : "deles")

        const texto = document.createElement("p")
        texto.textContent = msg.texto
        msg_div.appendChild(texto)

        const rodape_msg = document.createElement("div")
        rodape_msg.classList.add("chat-mensagem-rodape")

        const data = document.createElement("span")
        data.classList.add("chat-mensagem-data")
        data.textContent = window.isScreenshotTest ? "12:34" : new Date(msg.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        rodape_msg.appendChild(data)

        if (msg.id_remetente === id_meu_perfil) {
          const status = document.createElement("span")
          status.classList.add("material-symbols-outlined", "chat-mensagem-status")
          if (msg.recebida) {
            status.textContent = "done_all"
            status.classList.add("recebida")
          } else {
            status.textContent = "done"
          }
          rodape_msg.appendChild(status)
        }

        msg_div.appendChild(rodape_msg)

        mensagens_div.appendChild(msg_div)
      })

      chat_container.appendChild(mensagens_div)

      // Auto scroll para o final
      setTimeout(() => {
        mensagens_div.scrollTop = mensagens_div.scrollHeight
      }, 0)

      const form = document.createElement("form")
      form.classList.add("chat-form")

      const input = document.createElement("input")
      input.type = "text"
      input.placeholder = "Digite uma mensagem..."
      input.required = true
      form.appendChild(input)

      const botao = document.createElement("button")
      botao.type = "submit"
      const icone = document.createElement("span")
      icone.classList.add("material-symbols-outlined")
      icone.textContent = "send"
      botao.appendChild(icone)
      form.appendChild(botao)

      form.onsubmit = async (e) => {
        e.preventDefault()
        const texto = input.value
        input.value = ""
        await enviar_mensagem_chat(id_contato, texto)
      }

      chat_container.appendChild(form)
      conteudo.appendChild(chat_container)
    }
  },
]

let id_rota_atual = 0
let controlador_rota_atual = null

const navegar = (url) => {
  fechar_sidebar()
  history.pushState({}, "", url)
  rotear()
}
window.navegar = navegar

const abrir_sidebar = () => {
  document.body.classList.add("sidebar-aberta")
}

const fechar_sidebar = () => {
  document.body.classList.remove("sidebar-aberta")
}

const sair = async () => {
  await vfs_remover("arquivo_sqlite")
  layout_referencias = null
  document.body.classList.remove("app-logado")
  navegar("/")
}

const esta_autenticado = async () => {
  const diretorio = await obter_diretorio()
  if (!diretorio) return false
  try {
    return await diretorio.queryPermission({ mode: "readwrite" }) === "granted"
  } catch (e) {
    return true
  }
}

const carregar_tela_permissao = async (diretorio) => {
  document.body.innerHTML = ""
  document.body.classList.remove("app-logado")
  const logo = document.createElement("img")
  logo.classList.add("login-logo")
  logo.src = url_logo
  logo.alt = "Kapivatar Logo"
  document.body.appendChild(logo)
  const coluna_1 = document.createElement("div")
  coluna_1.classList.add("coluna", "login-info")
  const h1 = document.createElement("h1")
  h1.textContent = "Permissão Necessária"
  coluna_1.appendChild(h1)
  const img = document.createElement("img")
  img.src = url_capivara
  img.classList.add("login-imagem")
  img.alt = "Mascote Capivara"
  coluna_1.appendChild(img)
  const p_1 = document.createElement("p")
  p_1.classList.add("login-descricao")
  p_1.textContent = "O Kapivatar precisa de permissão para ler e escrever no arquivo de dados selecionado para que você possa acessar seus perfis e mensagens."
  coluna_1.appendChild(p_1)
  document.body.appendChild(coluna_1)
  const coluna_2 = document.createElement("div")
  coluna_2.classList.add("coluna", "login-acao")
  const p_2 = document.createElement("p")
  p_2.textContent = "Reativar acesso"
  coluna_2.appendChild(p_2)
  const botão_permitir = document.createElement("button")
  const icone_permissao = document.createElement("span")
  icone_permissao.classList.add("material-symbols-outlined")
  icone_permissao.textContent = "lock_open"
  botão_permitir.appendChild(icone_permissao)
  const texto_permitir = document.createElement("span")
  texto_permitir.textContent = "Permitir Acesso"
  botão_permitir.appendChild(texto_permitir)
  botão_permitir.onclick = async () => {
    const status = await diretorio.requestPermission({ mode: "readwrite" })
    if (status === "granted") {
      rotear()
    }
  }
  coluna_2.appendChild(botão_permitir)

  const botão_sair = document.createElement("button")
  botão_sair.style.marginTop = "1em"
  botão_sair.style.backgroundColor = "#444"
  const icone_sair = document.createElement("span")
  icone_sair.classList.add("material-symbols-outlined")
  icone_sair.textContent = "logout"
  botão_sair.appendChild(icone_sair)
  const texto_sair = document.createElement("span")
  texto_sair.textContent = "Sair e trocar arquivo"
  botão_sair.appendChild(texto_sair)
  botão_sair.onclick = async () => {
    await vfs_remover("arquivo_sqlite")
    rotear()
  }
  coluna_2.appendChild(botão_sair)
  document.body.appendChild(coluna_2)
}

let layout_referencias = null
let sidebar_objetos_url = []

const carregar_layout = () => {
  document.body.innerHTML = ""
  document.body.classList.add("app-logado")

  base_horizontal_montada = mount(BaseHorizontal, {
    target: document.body,
    props: { url_logo, navegar, fechar_sidebar, sair }
  })
  const base_horizontal = document.body.querySelector(".sidebar")

  base_vertical_montada = mount(BaseVertical, {
    target: document.body,
    props: { navegar, sair, abrir_sidebar }
  })
  const base_vertical = document.body.querySelector(".conteudo-principal")

  layout_referencias = {
    menu: base_horizontal.querySelector(".menu"),
    perfil_selecionado: base_horizontal.querySelector(".perfil-selecionado-sidebar"),
    titulo: base_vertical.querySelector(".titulo-pagina"),
    botao_menu_acoes: base_vertical.querySelector(".botao-mais-acoes"),
    menu_acoes: base_vertical.querySelector(".menu-acoes"),
    conteudo: base_vertical.querySelector(".conteudo-pagina"),
    botoes_navegacao: Array.from(
      base_vertical.querySelectorAll(".navegacao-inferior-item[data-url]")
    )
  }
}

const atualizar_sidebar_perfil_selecionado = async () => {
  const { perfil_selecionado } = layout_referencias
  if (!perfil_selecionado) return

  sidebar_objetos_url.forEach(url => URL.revokeObjectURL(url))
  sidebar_objetos_url = []

  const id_selecionado = await obter_id_perfil_selecionado()
  perfil_selecionado.innerHTML = ""

  if (id_selecionado) {
    const diretorio = await obter_diretorio()
    const arquivo_id = await ler_arquivo(diretorio, id_selecionado)
    if (arquivo_id) {
      const hash_perfil = await arquivo_id.text()
      const arquivo_perfil = await ler_arquivo(diretorio, hash_perfil)
      if (arquivo_perfil) {
        const dados = JSON.parse(await arquivo_perfil.text())

        const container_info = document.createElement("div")
        container_info.classList.add("perfil-sidebar-info")

        if (dados.foto) {
          const img_foto = document.createElement("img")
          const arquivo_foto = await ler_arquivo(diretorio, dados.foto)
          if (arquivo_foto) {
            const url = URL.createObjectURL(arquivo_foto)
            img_foto.src = url
            sidebar_objetos_url.push(url)
          }
          img_foto.classList.add("perfil-sidebar-foto")
          img_foto.alt = `Foto de ${dados.nome}`
          container_info.appendChild(img_foto)
        }

        const nome = document.createElement("span")
        nome.textContent = dados.nome
        nome.classList.add("perfil-sidebar-nome")
        container_info.appendChild(nome)

        perfil_selecionado.appendChild(container_info)

        const botao_trocar = document.createElement("button")
        botao_trocar.classList.add("botao-trocar-perfil")
        botao_trocar.setAttribute("aria-label", "Trocar perfil")
        const icone_trocar = document.createElement("span")
        icone_trocar.classList.add("material-symbols-outlined")
        icone_trocar.textContent = "swap_horiz"
        botao_trocar.appendChild(icone_trocar)
        botao_trocar.onclick = () => navegar("/perfis")
        perfil_selecionado.appendChild(botao_trocar)
      }
    }
  } else {
    const link_selecionar = document.createElement("a")
    link_selecionar.href = "/perfis"
    const icone_add = document.createElement("span")
    icone_add.classList.add("material-symbols-outlined")
    icone_add.textContent = "person_add"
    link_selecionar.appendChild(icone_add)
    const texto_add = document.createElement("span")
    texto_add.textContent = "Selecionar perfil"
    link_selecionar.appendChild(texto_add)
    perfil_selecionado.appendChild(link_selecionar)
  }
}

const renderizar_página = async (página, params, route_params, id_rota, sinal_rota) => {
  const { menu, titulo, botao_menu_acoes, menu_acoes, conteudo, botoes_navegacao } = layout_referencias

  atualizar_sidebar_perfil_selecionado()

  // Atualiza Menu
  menu.innerHTML = ""
  páginas.forEach(p => {
    if (p.ocultar_no_menu || p.url === "/") return
    const link = document.createElement("a")
    if (p.ícone) {
      const span_ícone = document.createElement("span")
      span_ícone.classList.add("material-symbols-outlined")
      span_ícone.textContent = p.ícone
      link.appendChild(span_ícone)
    }
    const span_texto = document.createElement("span")
    span_texto.textContent = p.nome
    link.appendChild(span_texto)
    link.href = p.url
    if (location.pathname === p.url) {
      link.classList.add("ativo")
    }
    menu.appendChild(link)
  })

  botoes_navegacao.forEach((botão) => {
    const ativo = botão.dataset.rotas.split(" ").some((rota) =>
      rota === "/"
        ? página.url === rota
        : página.url === rota || página.url.startsWith(`${rota}/`)
    )
    botão.classList.toggle("ativo", ativo)
    if (ativo) {
      botão.setAttribute("aria-current", "page")
    } else {
      botão.removeAttribute("aria-current")
    }
  })

  // Atualiza Título
  titulo.innerHTML = ""
  if (página.ícone) {
    const span_ícone = document.createElement("span")
    span_ícone.classList.add("material-symbols-outlined")
    span_ícone.textContent = página.ícone
    titulo.appendChild(span_ícone)
  }
  const span_titulo_texto = document.createElement("span")
  span_titulo_texto.textContent = página.nome
  titulo.appendChild(span_titulo_texto)

  // Atualiza Ações
  menu_acoes.innerHTML = ""
  menu_acoes.classList.remove("aberto")
  botao_menu_acoes.setAttribute("aria-expanded", "false")
  botao_menu_acoes.hidden = !página.ações?.length
  página.ações?.forEach(ação => {
    const botão_ação = document.createElement("button")
    if (ação.ícone) {
      const span_ícone = document.createElement("span")
      span_ícone.classList.add("material-symbols-outlined")
      span_ícone.textContent = ação.ícone
      botão_ação.appendChild(span_ícone)
    }
    const span_texto = document.createElement("span")
    span_texto.textContent = ação.nome
    botão_ação.appendChild(span_texto)
    botão_ação.onclick = () => {
      const url = ação.url_dinamica ? ação.url_dinamica(route_params) : ação.url
      navegar(url)
    }
    menu_acoes.appendChild(botão_ação)
  })

  // Atualiza Conteúdo
  conteudo.innerHTML = ""
  if (página.render) {
    const conteudo_renderizado = document.createElement("div")
    try {
      await página.render(conteudo_renderizado, params, route_params, sinal_rota)
    } catch (erro) {
      if (sinal_rota.aborted) return
      throw erro
    }
    if (sinal_rota.aborted) return
    if (id_rota !== id_rota_atual) return
    conteudo.replaceChildren(...conteudo_renderizado.childNodes)
  }
}

const renderizar_404 = () => {
  const { menu, titulo, botao_menu_acoes, menu_acoes, conteudo } = layout_referencias

  // Atualiza Menu (limpa seleção)
  menu.querySelectorAll("a").forEach(a => a.classList.remove("ativo"))

  titulo.innerHTML = ""
  const span_ícone = document.createElement("span")
  span_ícone.classList.add("material-symbols-outlined")
  span_ícone.textContent = "error"
  titulo.appendChild(span_ícone)
  const span_texto = document.createElement("span")
  span_texto.textContent = "404 - Não Encontrado"
  titulo.appendChild(span_texto)

  menu_acoes.innerHTML = ""
  menu_acoes.classList.remove("aberto")
  botao_menu_acoes.setAttribute("aria-expanded", "false")
  botao_menu_acoes.hidden = true
  conteudo.innerHTML = "<p>A página que você procura não existe.</p>"
}

const obter_origem_externa = () => {
  const params = new URLSearchParams(location.search)
  if (params.has("origin")) {
    return params.get("origin")
  }
  if (document.referrer) {
    try {
      return new URL(document.referrer).origin
    } catch (e) {}
  }
  return location.origin
}

const rotear = async () => {
  controlador_rota_atual?.abort()
  controlador_rota_atual = new AbortController()
  const sinal_rota = controlador_rota_atual.signal
  const id_rota = ++id_rota_atual

  if (tela_inicial_montada) {
    unmount(tela_inicial_montada)
    tela_inicial_montada = null
  }

  const path = decodeURIComponent(location.pathname)
  const params = new URLSearchParams(location.search)

  if (path === "/perfil-autenticado") {
    document.body.innerHTML = ""
    document.body.className = "perfil-autenticado-body"

    const container = document.createElement("div")
    container.className = "perfil-autenticado-container"

    const renderizar_generico = () => {
      container.innerHTML = ""
      const icon = document.createElement("span")
      icon.className = "material-symbols-outlined perfil-autenticado-icon"
      icon.textContent = "account_circle"
      container.appendChild(icon)
    }

    renderizar_generico()
    document.body.appendChild(container)

    container.onclick = () => {
      const origem = obter_origem_externa()
      const popup = window.open(`/autenticar`, "kapivatar_autenticar", "width=600,height=600")

      const listener = (event) => {
        if (event.origin !== location.origin) return

        if (event.data && event.data.tipo === "KAPIVATAR_AUTENTICAR_READY") {
          popup.postMessage({ tipo: "KAPIVATAR_ORIGIN", origem }, location.origin)
          window.removeEventListener("message", listener)
        }
      }
      window.addEventListener("message", listener)
    }

    const diretorio = await obter_diretorio()
    if (diretorio) {
      try {
        const permissao = await aguardar_rota(diretorio.queryPermission({ mode: "readwrite" }), sinal_rota)
        if (permissao === "granted") {
          const id_selecionado = await obter_id_perfil_selecionado()
          if (id_selecionado) {
            const origem = obter_origem_externa()
            const hash_origem = await gerar_hash(origem)

            let subdiretorio = null
            try {
              subdiretorio = await diretorio.getDirectoryHandle(hash_origem, { create: false })
            } catch (e) {}

            if (subdiretorio) {
              let foto_exibida = false
              let dados_perfil = null
              const arquivo_id = await ler_arquivo(diretorio, id_selecionado)
              if (arquivo_id) {
                const hash_perfil = await arquivo_id.text()
                const arquivo_perfil = await ler_arquivo(diretorio, hash_perfil)
                if (arquivo_perfil) {
                  const dados = JSON.parse(await arquivo_perfil.text())
                  dados_perfil = dados
                  if (dados.foto) {
                    const arquivo_foto = await ler_arquivo(diretorio, dados.foto)
                    if (arquivo_foto) {
                      container.innerHTML = ""
                      const img = document.createElement("img")
                      img.src = URL.createObjectURL(arquivo_foto)
                      img.className = "perfil-autenticado-foto"
                      img.alt = `Foto de ${dados.nome}`
                      container.appendChild(img)
                      foto_exibida = true
                    }
                  }
                }
              }
              if (!foto_exibida) {
                container.innerHTML = ""
                const icon = document.createElement("span")
                icon.className = "material-symbols-outlined perfil-autenticado-icon autorizado"
                icon.textContent = "account_circle"
                container.appendChild(icon)
              }
              if (dados_perfil) {
                window.parent.postMessage({
                  tipo: "KAPIVATAR_CONECTADO",
                  perfil: {
                    id: id_selecionado,
                    nome: dados_perfil.nome,
                    bio: dados_perfil.bio,
                    chave_publica: dados_perfil.chave_publica
                  }
                }, "*")
              }
            }
          }
        }
      } catch (e) {
        console.error(e)
      }
    }

    const tratar_mensagem = (event) => {
      if (event.origin !== location.origin) return

      if (event.data && event.data.tipo === "KAPIVATAR_AUTORIZADO") {
        window.removeEventListener("message", tratar_mensagem)
        rotear()
      }
    }
    window.addEventListener("message", tratar_mensagem)
    return
  }

  if (path === "/autenticar") {
    const continuarAutenticacao = async (origem) => {
      const diretorio = await obter_diretorio()
      if (!diretorio) {
        layout_referencias = null
        renderizar_tela_inicial({ url_logo, url_capivara, abrir_arquivo_sqlite, criar_arquivo_sqlite, navegar })
        return
      }

      try {
        const permissao = await diretorio.queryPermission({ mode: "readwrite" })
        if (id_rota !== id_rota_atual) return
        if (permissao !== "granted") {
          carregar_tela_permissao(diretorio)
          return
        }
      } catch (e) {
        console.error(e)
      }

      const id_selecionado = await obter_id_perfil_selecionado()
      if (!id_selecionado) {
        document.body.innerHTML = ""
        document.body.className = "autenticar-body"

        const container = document.createElement("div")
        container.className = "autenticar-container"

        const h1 = document.createElement("h1")
        h1.textContent = "Perfil não selecionado"
        container.appendChild(h1)

        const p = document.createElement("p")
        p.textContent = "Você precisa criar e selecionar um perfil no Kapivatar antes de autorizar aplicativos externos."
        container.appendChild(p)

        const botao = document.createElement("button")
        botao.textContent = "Fechar"
        botao.onclick = () => {
          window.close()
        }
        container.appendChild(botao)
        document.body.appendChild(container)
        return
      }

      const arquivo_id = await ler_arquivo(diretorio, id_selecionado)
      let nome_perfil = "Perfil Sem Nome"
      if (arquivo_id) {
        const hash_perfil = await arquivo_id.text()
        const arquivo_perfil = await ler_arquivo(diretorio, hash_perfil)
        if (arquivo_perfil) {
          const dados = JSON.parse(await arquivo_perfil.text())
          nome_perfil = dados.nome
        }
      }

      document.body.innerHTML = ""
      document.body.className = "autenticar-body"

      const container = document.createElement("div")
      container.className = "autenticar-container"

      const logo = document.createElement("img")
      logo.src = url_logo
      logo.alt = "Kapivatar Logo"
      logo.className = "autenticar-logo"
      container.appendChild(logo)

      const h1 = document.createElement("h1")
      h1.textContent = "Autorizar Conexão"
      container.appendChild(h1)

      const p = document.createElement("p")
      p.innerHTML = `O aplicativo <strong id="app-origin"></strong> deseja se conectar ao seu perfil Kapivatar (<strong id="profile-name"></strong>).`
      p.querySelector("#app-origin").textContent = origem
      p.querySelector("#profile-name").textContent = nome_perfil
      container.appendChild(p)

      const botoes_container = document.createElement("div")
      botoes_container.className = "autenticar-botoes"

      const botao_autorizar = document.createElement("button")
      botao_autorizar.textContent = "Autorizar"
      botao_autorizar.onclick = async () => {
        const hash_origem = await gerar_hash(origem)
        const subdiretorio = await diretorio.getDirectoryHandle(hash_origem, { create: true })

        if (window.opener) {
          window.opener.postMessage({ tipo: "KAPIVATAR_AUTORIZADO" }, location.origin)
        }
        window.close()
      }
      botoes_container.appendChild(botao_autorizar)

      const botao_cancelar = document.createElement("button")
      botao_cancelar.textContent = "Cancelar"
      botao_cancelar.style.backgroundColor = "#444"
      botao_cancelar.onclick = () => {
        window.close()
      }
      botoes_container.appendChild(botao_cancelar)

      container.appendChild(botoes_container)
      document.body.appendChild(container)
    }

    const paramOrigem = obter_origem_externa()
    if (paramOrigem && location.search.includes("origin=")) {
      continuarAutenticacao(paramOrigem)
      return
    }

    let resolved = false
    const listener = (event) => {
      if (event.origin !== location.origin) return

      if (event.data && event.data.tipo === "KAPIVATAR_ORIGIN") {
        if (!resolved) {
          resolved = true
          window.removeEventListener("message", listener)
          continuarAutenticacao(event.data.origem)
        }
      }
    }
    window.addEventListener("message", listener)

    if (window.opener) {
      window.opener.postMessage({ tipo: "KAPIVATAR_AUTENTICAR_READY" }, location.origin)
    }

    return
  }

  let diretorio
  try {
    diretorio = await aguardar_rota(obter_diretorio(sinal_rota), sinal_rota)
  } catch (erro) {
    if (sinal_rota.aborted) return
    throw erro
  }
  if (id_rota !== id_rota_atual) return

  if (!diretorio) {
    layout_referencias = null
    renderizar_tela_inicial({ url_logo, url_capivara, abrir_arquivo_sqlite, criar_arquivo_sqlite, navegar })
    return
  }

  try {
    const permissao = await diretorio.queryPermission({ mode: "readwrite" })
    if (permissao !== "granted") {
      carregar_tela_permissao(diretorio)
      return
    }
  } catch (e) {
    if (sinal_rota.aborted) return
    console.error("Erro ao verificar permissão:", e)
  }
  if (id_rota !== id_rota_atual) return

  if (!layout_referencias) {
    carregar_layout()
  }

  let página = null
  let route_params = {}

  for (const p of páginas) {
    const route_parts = p.url.split("/")
    const path_parts = path.split("/")

    if (route_parts.length === path_parts.length) {
      let match = true
      const temp_params = {}

      for (let i = 0; i < route_parts.length; i++) {
        if (route_parts[i].startsWith(":")) {
          temp_params[route_parts[i].substring(1)] = path_parts[i]
        } else if (route_parts[i] !== path_parts[i]) {
          match = false
          break
        }
      }

      if (match) {
        página = p
        route_params = temp_params
        break
      }
    }
  }

  if (página) {
    await renderizar_página(página, params, route_params, id_rota, sinal_rota)
  } else {
    renderizar_404()
  }
}

window.addEventListener("popstate", rotear)

document.addEventListener("click", (e) => {
  const link = e.target.closest("a")
  if (link && link.href && link.href.startsWith(location.origin)) {
    const url = new URL(link.href)
    if (url.hash === "" && !link.onclick) {
      e.preventDefault()
      navegar(url.pathname + url.search)
    }
  }
})

onload = rotear
