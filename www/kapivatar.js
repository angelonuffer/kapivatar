import banco from "./banco.js"

const banco_kapivatar = banco({
  objectStores: [
    {
      name: "byName",
    },
    {
      name: "byContent",
    },
  ],
})

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

const obter_diretorio = async () => {
  const db = await banco_kapivatar
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("byName", "readonly")
    const obter_diretório = transaction.objectStore("byName").get("diretório")
    obter_diretório.onsuccess = (event) => {
      let result = event.target.result
      // Re-instancia o mock se necessário (apenas para testes)
      if (result && !result.getFileHandle && window.MockDirectoryHandle) {
        result = Object.assign(new window.MockDirectoryHandle(), result)
      }
      resolve(result)
    }
    obter_diretório.onerror = () => {
      reject(obter_diretório.error)
    }
  })
}

const ler_arquivo = async (diretorio, nome) => {
  try {
    const handle = await diretorio.getFileHandle(nome)
    const file = await handle.getFile()
    return file
  } catch (e) {
    return null
  }
}

const escrever_arquivo = async (diretorio, nome, conteudo) => {
  const handle = await diretorio.getFileHandle(nome, { create: true })
  const writable = await handle.createWritable()
  await writable.write(conteudo)
  await writable.close()
}

window.obter_id_perfil_selecionado = async () => {
  const diretorio = await obter_diretorio()
  const arquivo = await ler_arquivo(diretorio, "perfil_selecionado")
  if (!arquivo) return null
  return await arquivo.text()
}

const definir_id_perfil_selecionado = async (id) => {
  const diretorio = await obter_diretorio()
  await escrever_arquivo(diretorio, "perfil_selecionado", id)
}

const remover_perfil = async (hash_remover) => {
  const diretorio = await obter_diretorio()
  const arquivo_perfis = await ler_arquivo(diretorio, "perfis")
  if (!arquivo_perfis) return

  const hash_lista_atual = await arquivo_perfis.text()
  const arquivo_lista_atual = await ler_arquivo(diretorio, hash_lista_atual)
  if (!arquivo_lista_atual) return

  const lista_atual = JSON.parse(await arquivo_lista_atual.text())
  const nova_lista = {
    perfis: lista_atual.perfis.filter(hash => hash !== hash_remover),
    data: new Date().toISOString(),
    anterior: hash_lista_atual
  }

  const conteudo_lista = JSON.stringify(nova_lista)
  const hash_nova_lista = await gerar_hash(conteudo_lista)
  await escrever_arquivo(diretorio, hash_nova_lista, conteudo_lista)
  await escrever_arquivo(diretorio, "perfis", hash_nova_lista)

  const id_selecionado = await obter_id_perfil_selecionado()
  if (id_selecionado === hash_remover) {
    const handle = await diretorio.getFileHandle("perfil_selecionado")
    await handle.remove()
  }

  rotear()
}

const obter_hash_lista_contatos = async () => {
  const diretorio = await obter_diretorio()
  const arquivo = await ler_arquivo(diretorio, "contatos")
  if (!arquivo) return null
  return await arquivo.text()
}

const definir_hash_lista_contatos = async (hash) => {
  const diretorio = await obter_diretorio()
  await escrever_arquivo(diretorio, "contatos", hash)
}

window.carregar_lista_contatos = async (hash_lista) => {
  const diretorio = await obter_diretorio()
  const hash = hash_lista || (await obter_hash_lista_contatos())
  if (!hash) return { contatos: [], solicitações_enviadas: [], solicitações_recebidas: [], data: new Date().toISOString() }
  const arquivo = await ler_arquivo(diretorio, hash)
  if (!arquivo) return { contatos: [], solicitações_enviadas: [], solicitações_recebidas: [], data: new Date().toISOString() }
  return JSON.parse(await arquivo.text())
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

const enviar_solicitacao_contato = async (id_alvo) => {
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
    await salvar_lista_contatos(lista)
  }
}

const aceitar_solicitacao_contato = async (perfil_solicitante) => {
  const id_meu_perfil = await obter_id_perfil_selecionado()
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

  const lista = await carregar_lista_contatos()
  // Adiciona aos contatos
  if (!lista.contatos.find(c => c.id === perfil_solicitante.id)) {
    lista.contatos.push(perfil_solicitante)
  }
  // Remove das solicitações recebidas
  lista.solicitações_recebidas = lista.solicitações_recebidas.filter(p => p.id !== perfil_solicitante.id)
  await salvar_lista_contatos(lista)
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
                await salvar_lista_contatos(lista_contatos)
                rotear()
              }
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

const páginas = [
  {
    nome: "Início",
    url: "/",
    ícone: "home",
    render: (conteudo) => {
      const p = document.createElement("p")
      p.textContent = "Bem-vindo ao Kapivatar! Escolha uma opção no menu lateral."
      conteudo.appendChild(p)
    }
  },
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
        nome: "Histórico",
        url: "/perfis/histórico",
        ícone: "history",
      },
    ],
    render: async (conteudo, params) => {
      const diretorio = await obter_diretorio()
      const hash_lista_visualizada = params.get("v")
      const hash_lista_atual = hash_lista_visualizada || (await (await ler_arquivo(diretorio, "perfis"))?.text())

      const carregar_lista = async (hash) => {
        if (!hash) return null
        const arquivo = await ler_arquivo(diretorio, hash)
        if (!arquivo) return null
        return JSON.parse(await arquivo.text())
      }

      const lista = await carregar_lista(hash_lista_atual)

      if (!lista || lista.perfis.length === 0) {
        conteudo.innerHTML = "<p>Nenhum perfil encontrado.</p>"
      } else {
        const grid = document.createElement("div")
        grid.classList.add("perfis-grid")
        conteudo.appendChild(grid)

        for (const id_ou_hash_perfil of lista.perfis) {
          let hash_perfil = id_ou_hash_perfil
          let id_perfil = id_ou_hash_perfil

          // Se estamos visualizando a lista atual, os itens são IDs.
          // Se estamos visualizando uma lista histórica, os itens podem ser hashes de versão (comportamento antigo) ou IDs (novo).
          // Para garantir compatibilidade e funcionamento correto:
          if (!hash_lista_visualizada) {
            // Tenta ler como ID (ponteiro)
            const arquivo_id = await ler_arquivo(diretorio, id_perfil)
            if (arquivo_id) {
              const texto_id = await arquivo_id.text()
              // Verifica se o conteúdo do arquivo é um hash SHA-256 (64 hex chars)
              // Se for o próprio JSON (perfil antigo), texto_id começará com '{'
              if (texto_id.length === 64 && /^[a-f0-9]+$/.test(texto_id)) {
                hash_perfil = texto_id
              } else {
                // É um perfil antigo que estava na lista por hash de versão
                id_perfil = null
                hash_perfil = id_ou_hash_perfil
              }
            }
          } else {
             // No histórico, tentamos ver se é um ID
             const arquivo_id = await ler_arquivo(diretorio, id_perfil)
             if (arquivo_id) {
                const texto_id = await arquivo_id.text()
                if (texto_id.length === 64 && /^[a-f0-9]+$/.test(texto_id)) {
                  hash_perfil = texto_id
                } else {
                  id_perfil = null
                  hash_perfil = id_ou_hash_perfil
                }
             } else {
                // É um hash de versão (perfil antigo)
                id_perfil = null
             }
          }

          const arquivo_perfil = await ler_arquivo(diretorio, hash_perfil)
          if (!arquivo_perfil) continue
          const dados = JSON.parse(await arquivo_perfil.text())

          const card = document.createElement("div")
          card.classList.add("perfil-card")
          if (id_perfil) {
            card.onclick = () => navegar(`/perfil/${id_perfil}`)
          }

          // Menu de Ações
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

          const item_selecionar = document.createElement("button")
          item_selecionar.classList.add("perfil-menu-item")
          const icone_selecionar = document.createElement("span")
          icone_selecionar.classList.add("material-symbols-outlined")
          icone_selecionar.textContent = "check_circle"
          item_selecionar.appendChild(icone_selecionar)
          const texto_selecionar = document.createElement("span")
          texto_selecionar.textContent = "Selecionar perfil"
          item_selecionar.appendChild(texto_selecionar)

          item_selecionar.onclick = async (e) => {
            e.stopPropagation()
            await definir_id_perfil_selecionado(id_perfil)
            navegar("/")
          }

          const item_remover = document.createElement("button")
          item_remover.classList.add("perfil-menu-item", "remover")
          const icone_remover = document.createElement("span")
          icone_remover.classList.add("material-symbols-outlined")
          icone_remover.textContent = "delete"
          item_remover.appendChild(icone_remover)
          const texto_remover = document.createElement("span")
          texto_remover.textContent = "Remover perfil"
          item_remover.appendChild(texto_remover)

          item_remover.onclick = async (e) => {
            e.stopPropagation()
            if (confirm(`Tem certeza que deseja remover o perfil de "${dados.nome}"?`)) {
              await remover_perfil(id_perfil)
            }
          }

          dropdown.appendChild(item_selecionar)
          dropdown.appendChild(item_remover)
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

          if (dados.capa) {
            const img_capa = document.createElement("img")
            const arquivo_capa = await ler_arquivo(diretorio, dados.capa)
            if (arquivo_capa) img_capa.src = URL.createObjectURL(arquivo_capa)
            img_capa.classList.add("perfil-capa")
            img_capa.alt = `Capa de ${dados.nome}`
            card.appendChild(img_capa)
          }

          const info = document.createElement("div")
          info.classList.add("perfil-info")

          if (dados.foto) {
            const img_foto = document.createElement("img")
            const arquivo_foto = await ler_arquivo(diretorio, dados.foto)
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
    nome: "Histórico de Perfis",
    url: "/perfis/histórico",
    ícone: "history",
    ocultar_no_menu: true,
    render: async (conteudo) => {
      const diretorio = await obter_diretorio()
      const hash_lista_atual = await (await ler_arquivo(diretorio, "perfis"))?.text()

      const carregar_lista = async (hash) => {
        if (!hash) return null
        const arquivo = await ler_arquivo(diretorio, hash)
        if (!arquivo) return null
        return JSON.parse(await arquivo.text())
      }

      const secao_historico = document.createElement("div")
      secao_historico.classList.add("historico")
      secao_historico.style.marginTop = "0"
      secao_historico.style.borderTop = "none"

      const lista_historico = document.createElement("ul")
      let hash_cursor = hash_lista_atual
      while (hash_cursor) {
        const dados_lista = await carregar_lista(hash_cursor)
        if (!dados_lista) break

        const item = document.createElement("li")
        const link = document.createElement("a")
        const data = dados_lista.data ? new Date(dados_lista.data).toLocaleString() : `Versão: ${hash_cursor}`
        link.textContent = data
        link.href = `/perfis?v=${hash_cursor}`
        item.appendChild(link)
        lista_historico.appendChild(item)

        hash_cursor = dados_lista.anterior
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
    render: async (conteudo, params, route_params) => {
      const id = route_params.id
      const diretorio = await obter_diretorio()

      let hash_perfil = params.get("v")

      if (!hash_perfil) {
        const arquivo_id = await ler_arquivo(diretorio, id)
        if (!arquivo_id) {
          conteudo.innerHTML = "<p>Perfil não encontrado.</p>"
          return
        }
        hash_perfil = await arquivo_id.text()
      }

      const arquivo_perfil = await ler_arquivo(diretorio, hash_perfil)
      if (!arquivo_perfil) {
        conteudo.innerHTML = "<p>Erro ao carregar dados do perfil.</p>"
        return
      }

      const dados = JSON.parse(await arquivo_perfil.text())

      const detalhe = document.createElement("div")
      detalhe.classList.add("perfil-detalhe")

      if (dados.capa) {
        const img_capa = document.createElement("img")
        const arquivo_capa = await ler_arquivo(diretorio, dados.capa)
        if (arquivo_capa) img_capa.src = URL.createObjectURL(arquivo_capa)
        img_capa.classList.add("perfil-capa-detalhe")
        detalhe.appendChild(img_capa)
      }

      const info = document.createElement("div")
      info.classList.add("perfil-info-detalhe")

      if (dados.foto) {
        const img_foto = document.createElement("img")
        const arquivo_foto = await ler_arquivo(diretorio, dados.foto)
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
    render: async (conteudo, params, route_params) => {
      const id = route_params.id
      const diretorio = await obter_diretorio()
      const arquivo_id = await ler_arquivo(diretorio, id)

      if (!arquivo_id) {
        conteudo.innerHTML = "<p>Perfil não encontrado.</p>"
        return
      }

      const hash_perfil_atual = await arquivo_id.text()
      const arquivo_perfil = await ler_arquivo(diretorio, hash_perfil_atual)
      const dados_atuais = JSON.parse(await arquivo_perfil.text())

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
    render: async (conteudo, params, route_params) => {
      const id = route_params.id
      const diretorio = await obter_diretorio()

      const carregar_versao = async (hash) => {
        if (!hash) return null
        const arquivo = await ler_arquivo(diretorio, hash)
        if (!arquivo) return null
        return JSON.parse(await arquivo.text())
      }

      const secao_historico = document.createElement("div")
      secao_historico.classList.add("historico")
      secao_historico.style.marginTop = "0"
      secao_historico.style.borderTop = "none"

      const lista_historico = document.createElement("ul")

      // Começa da versão atual apontada pelo ID
      const arquivo_id = await ler_arquivo(diretorio, id)
      let hash_cursor = arquivo_id ? await arquivo_id.text() : null

      while (hash_cursor) {
        const dados_versao = await carregar_versao(hash_cursor)
        if (!dados_versao) break

        const item = document.createElement("li")
        const link = document.createElement("a")
        const data = dados_versao.data ? new Date(dados_versao.data).toLocaleString() : `Versão: ${hash_cursor}`
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
    render: async (conteudo) => {
      const lista = await carregar_lista_contatos()
      if (lista.contatos.length === 0) {
        conteudo.innerHTML = "<p>Sua lista de contatos está vazia.</p>"
      } else {
        const ul = document.createElement("ul")
        for (const contato of lista.contatos) {
          const li = document.createElement("li")
          li.textContent = contato.nome || contato.id
          ul.appendChild(li)
        }
        conteudo.appendChild(ul)
      }
    }
  },
  {
    nome: "Adicionar Contato",
    url: "/contatos/adicionar",
    ícone: "person_add",
    ocultar_no_menu: true,
    render: async (conteudo) => {
      const id_meu_perfil = await obter_id_perfil_selecionado()
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
      input_meu_id.value = id_meu_perfil
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
    render: async (conteudo) => {
      const lista = await carregar_lista_contatos()

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
          span_id.textContent = id
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
          span_id.textContent = perfil.id
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
    nome: "Conversas",
    url: "/conversas",
    ícone: "chat",
    render: (conteudo) => {
      const p = document.createElement("p")
      p.textContent = "Suas conversas criptografadas."
      conteudo.appendChild(p)
    }
  },
]

const navegar = (url) => {
  fechar_sidebar()
  history.pushState({}, "", url)
  rotear()
}

const abrir_sidebar = () => {
  document.body.classList.add("sidebar-aberta")
}

const fechar_sidebar = () => {
  document.body.classList.remove("sidebar-aberta")
}

const esta_autenticado = async () => {
  return await obter_diretorio() !== undefined
}

const carregar_tela_login = async () => {
  document.body.innerHTML = ""
  const logo = document.createElement("img")
  logo.classList.add("login-logo")
  logo.src = "kapivatar.svg"
  logo.alt = "Kapivatar Logo"
  document.body.appendChild(logo)
  const coluna_1 = document.createElement("div")
  coluna_1.classList.add("coluna", "login-info")
  const h1 = document.createElement("h1")
  h1.textContent = "Sua identidade pertence a você!"
  coluna_1.appendChild(h1)
  const img = document.createElement("img")
  img.src = "capivara.jpeg"
  img.classList.add("login-imagem")
  img.alt = "Mascote Capivara"
  coluna_1.appendChild(img)
  const p_1 = document.createElement("p")
  p_1.classList.add("login-descricao")
  p_1.textContent = "Não guardamos suas senhas, suas fotos ou suas conversas, porque acreditamos que a internet deve ser descentralizada por padrão. Use o poder do seu próprio navegador para autenticar, navegar e construir uma rede social que é verdadeiramente sua."
  coluna_1.appendChild(p_1)
  document.body.appendChild(coluna_1)
  const coluna_2 = document.createElement("div")
  coluna_2.classList.add("coluna", "login-acao")
  const p_2 = document.createElement("p")
  p_2.textContent = "Entrar no Kapivatar"
  coluna_2.appendChild(p_2)
  const botão = document.createElement("button")
  const icone_pasta = document.createElement("span")
  icone_pasta.classList.add("material-symbols-outlined")
  icone_pasta.textContent = "folder_open"
  botão.appendChild(icone_pasta)
  const texto_botão = document.createElement("span")
  texto_botão.textContent = "Escolher pasta de dados"
  botão.appendChild(texto_botão)
  botão.onclick = async () => {
    const diretório = await showDirectoryPicker();
    const definir_diretório = (await banco_kapivatar).transaction("byName", "readwrite").objectStore("byName").put(diretório, "diretório")
    definir_diretório.onsuccess = () => {
      navegar("/")
    }
    definir_diretório.onerror = (event) => {
      console.error("Erro ao salvar diretório:", event.target.error)
    }
  }
  coluna_2.appendChild(botão)
  document.body.appendChild(coluna_2)
}

let layout_referencias = null
let sidebar_objetos_url = []

const carregar_layout = () => {
  document.body.innerHTML = ""
  document.body.classList.add("app-logado")

  const overlay = document.createElement("div")
  overlay.classList.add("overlay")
  overlay.onclick = fechar_sidebar
  document.body.appendChild(overlay)

  const coluna_1 = document.createElement("div")
  coluna_1.classList.add("coluna", "sidebar")

  const sidebar_header = document.createElement("div")
  sidebar_header.classList.add("sidebar-header")

  const link_home = document.createElement("a")
  link_home.href = "/"
  link_home.classList.add("sidebar-brand")
  link_home.onclick = (e) => {
    e.preventDefault()
    navegar("/")
  }

  const logo = document.createElement("img")
  logo.src = "kapivatar.svg"
  logo.alt = "Kapivatar Logo"
  logo.classList.add("sidebar-logo")
  link_home.appendChild(logo)

  const titulo_brand = document.createElement("span")
  titulo_brand.textContent = "Kapivatar"
  titulo_brand.classList.add("sidebar-titulo")
  link_home.appendChild(titulo_brand)

  sidebar_header.appendChild(link_home)

  const botao_fechar = document.createElement("button")
  botao_fechar.classList.add("botao-fechar-sidebar")
  botao_fechar.setAttribute("aria-label", "Fechar menu")
  const icone_fechar = document.createElement("span")
  icone_fechar.classList.add("material-symbols-outlined")
  icone_fechar.textContent = "close"
  botao_fechar.appendChild(icone_fechar)
  botao_fechar.onclick = fechar_sidebar
  sidebar_header.appendChild(botao_fechar)

  coluna_1.appendChild(sidebar_header)

  const coluna_1_1 = document.createElement("div")
  coluna_1_1.classList.add("coluna", "menu")
  coluna_1.appendChild(coluna_1_1)

  const coluna_1_2 = document.createElement("div")
  coluna_1_2.classList.add("coluna", "sidebar-rodape")

  const perfil_selecionado_container = document.createElement("div")
  perfil_selecionado_container.classList.add("perfil-selecionado-sidebar")
  coluna_1_2.appendChild(perfil_selecionado_container)

  const link_sair = document.createElement("a")
  const icone_sair = document.createElement("span")
  icone_sair.classList.add("material-symbols-outlined")
  icone_sair.textContent = "logout"
  link_sair.appendChild(icone_sair)
  const texto_sair = document.createElement("span")
  texto_sair.textContent = "Sair"
  link_sair.appendChild(texto_sair)
  link_sair.href = "#"
  link_sair.onclick = async (e) => {
    e.preventDefault()
    const remover_diretório = (await banco_kapivatar).transaction("byName", "readwrite").objectStore("byName").delete("diretório")
    remover_diretório.onsuccess = () => {
      layout_referencias = null
      document.body.classList.remove("app-logado")
      navegar("/")
    }
    remover_diretório.onerror = (event) => {
      console.error("Erro ao remover diretório:", event.target.error)
    }
  }
  coluna_1_2.appendChild(link_sair)
  coluna_1.appendChild(coluna_1_2)
  document.body.appendChild(coluna_1)

  const coluna_2 = document.createElement("div")
  coluna_2.classList.add("coluna", "conteudo-principal")

  const coluna_2_linha_1 = document.createElement("div")
  coluna_2_linha_1.classList.add("linha", "cabecalho")

  const botao_menu = document.createElement("button")
  botao_menu.classList.add("botao-menu")
  botao_menu.setAttribute("aria-label", "Abrir menu")
  const icone_menu = document.createElement("span")
  icone_menu.classList.add("material-symbols-outlined")
  icone_menu.textContent = "menu"
  botao_menu.appendChild(icone_menu)
  botao_menu.onclick = abrir_sidebar
  coluna_2_linha_1.appendChild(botao_menu)

  const h1 = document.createElement("h1")
  h1.classList.add("titulo-pagina")
  coluna_2_linha_1.appendChild(h1)

  const ações = document.createElement("div")
  ações.classList.add("linha", "acoes")
  coluna_2_linha_1.appendChild(ações)
  coluna_2.appendChild(coluna_2_linha_1)

  const coluna_2_linha_2 = document.createElement("div")
  coluna_2_linha_2.classList.add("linha", "conteudo-pagina")
  coluna_2.appendChild(coluna_2_linha_2)
  document.body.appendChild(coluna_2)

  layout_referencias = {
    menu: coluna_1_1,
    perfil_selecionado: perfil_selecionado_container,
    titulo: h1,
    acoes: ações,
    conteudo: coluna_2_linha_2
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

const renderizar_página = (página, params, route_params) => {
  const { menu, titulo, acoes, conteudo } = layout_referencias

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
  acoes.innerHTML = ""
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
    acoes.appendChild(botão_ação)
  })

  // Atualiza Conteúdo
  conteudo.innerHTML = ""
  if (página.render) {
    página.render(conteudo, params, route_params)
  }
}

const renderizar_404 = () => {
  const { menu, titulo, acoes, conteudo } = layout_referencias

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

  acoes.innerHTML = ""
  conteudo.innerHTML = "<p>A página que você procura não existe.</p>"
}

const rotear = async () => {
  const autenticado = await esta_autenticado()

  if (!autenticado) {
    layout_referencias = null
    carregar_tela_login()
    return
  }

  if (!layout_referencias) {
    carregar_layout()
  }

  const path = decodeURIComponent(location.pathname)
  const params = new URLSearchParams(location.search)

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
    renderizar_página(página, params, route_params)
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
