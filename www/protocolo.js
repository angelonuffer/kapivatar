import {
  obter_diretorio,
  ler_arquivo,
  escrever_arquivo,
  obter_id_perfil_selecionado,
  carregar_lista_contatos,
  salvar_lista_contatos,
  carregar_conversa,
  salvar_conversa,
  rotear
} from "./kapivatar.js"

export const gerar_hash = async (conteudo) => {
  const buffer = typeof conteudo === "string" ? new TextEncoder().encode(conteudo) : conteudo
  const hash_buffer = await crypto.subtle.digest("SHA-256", buffer)
  return Array.from(new Uint8Array(hash_buffer)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

export const gerar_chaves = async () => {
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

export const exportar_chave = async (chave) => {
  return await crypto.subtle.exportKey("jwk", chave)
}

export const importar_chave_publica = async (jwk) => {
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

export const importar_chave_privada = async (jwk) => {
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

export const criptografar = async (chave_publica, dados) => {
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

export const descriptografar = async (chave_privada, buffer) => {
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

export const gerar_id_perfil = async (chave_publica) => {
  const spki = await crypto.subtle.exportKey("spki", chave_publica)
  return await gerar_hash(spki)
}

export const buffer_para_base64 = (buffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export const base64_para_buffer = (base64) => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export const verificar_retentativas = async () => {
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

export const enviar_solicitacao_contato = async (id_alvo, eh_retentativa = false) => {
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

export const enviar_confirmacao_aceite = async (id_meu_perfil, perfil_solicitante) => {
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

export const aceitar_solicitacao_contato = async (perfil_solicitante) => {
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

export const enviar_ack = async (id_contato, id_mensagem) => {
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

export const enviar_mensagem_chat = async (id_contato, texto, id_mensagem = null) => {
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

export const processar_mensagem_mqtt = async (dados) => {
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

window.processar_mensagem_mqtt = processar_mensagem_mqtt

window.cliente_mqtt = mqtt.connect("wss://broker.hivemq.com:8884/mqtt")
export const cliente_mqtt = window.cliente_mqtt

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
