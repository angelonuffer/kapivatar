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

const páginas = [
  {
    nome: "Início",
    url: "/",
    render: (conteudo) => {
      const p = document.createElement("p")
      p.textContent = "Bem-vindo ao Kapivatar! Escolha uma opção no menu lateral."
      conteudo.appendChild(p)
    }
  },
  {
    nome: "Perfis",
    url: "/perfis",
    ações: [
      {
        nome: "Criar perfil",
        url: "/perfis/criar",
      },
    ],
    render: async (conteudo, params) => {
      const diretorio = await obter_diretorio()
      const hash_lista_atual = params.get("v") || (await (await ler_arquivo(diretorio, "perfis"))?.text())

      const carregar_lista = async (hash) => {
        if (!hash) return null
        const arquivo = await ler_arquivo(diretorio, hash)
        if (!arquivo) return null
        return JSON.parse(await arquivo.text())
      }

      const lista = await carregar_lista(hash_lista_atual)

      if (!lista) {
        conteudo.innerHTML = "<p>Nenhum perfil encontrado.</p>"
      } else {
        const grid = document.createElement("div")
        grid.style.display = "grid"
        grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(200px, 1fr))"
        grid.style.gap = "1em"
        conteudo.appendChild(grid)

        for (const hash_perfil of lista.perfis) {
          const arquivo_perfil = await ler_arquivo(diretorio, hash_perfil)
          if (!arquivo_perfil) continue
          const dados = JSON.parse(await arquivo_perfil.text())

          const card = document.createElement("div")
          card.style.backgroundColor = "#333"
          card.style.borderRadius = "0.5em"
          card.style.overflow = "hidden"
          card.style.display = "flex"
          card.style.flexDirection = "column"

          if (dados.capa) {
            const img_capa = document.createElement("img")
            const arquivo_capa = await ler_arquivo(diretorio, dados.capa)
            if (arquivo_capa) img_capa.src = URL.createObjectURL(arquivo_capa)
            img_capa.style.width = "100%"
            img_capa.style.height = "80px"
            img_capa.style.objectFit = "cover"
            card.appendChild(img_capa)
          }

          const info = document.createElement("div")
          info.style.padding = "1em"
          info.style.position = "relative"

          if (dados.foto) {
            const img_foto = document.createElement("img")
            const arquivo_foto = await ler_arquivo(diretorio, dados.foto)
            if (arquivo_foto) img_foto.src = URL.createObjectURL(arquivo_foto)
            img_foto.style.width = "50px"
            img_foto.style.height = "50px"
            img_foto.style.borderRadius = "50%"
            img_foto.style.border = "2px solid #333"
            img_foto.style.marginTop = dados.capa ? "-35px" : "0"
            img_foto.style.objectFit = "cover"
            img_foto.style.backgroundColor = "#222"
            info.appendChild(img_foto)
          }

          const nome = document.createElement("h3")
          nome.textContent = dados.nome
          nome.style.margin = "0.5em 0 0.2em 0"
          info.appendChild(nome)

          const bio = document.createElement("p")
          bio.textContent = dados.bio
          bio.style.fontSize = "0.9em"
          bio.style.color = "#ccc"
          bio.style.margin = "0"
          info.appendChild(bio)

          card.appendChild(info)
          grid.appendChild(card)
        }
      }

      // Histórico
      const secao_historico = document.createElement("div")
      secao_historico.style.marginTop = "2em"
      secao_historico.style.borderTop = "1px solid #444"
      secao_historico.style.paddingTop = "1em"
      const h2 = document.createElement("h2")
      h2.textContent = "Histórico de Versões"
      secao_historico.appendChild(h2)

      const lista_historico = document.createElement("ul")
      let cursor = lista
      while (cursor && cursor.anterior) {
        const item = document.createElement("li")
        const link = document.createElement("a")
        link.textContent = `Versão: ${cursor.anterior}`
        link.href = `/perfis?v=${cursor.anterior}`
        item.appendChild(link)
        lista_historico.appendChild(item)
        cursor = await carregar_lista(cursor.anterior)
      }

      if (lista_historico.children.length > 0) {
        secao_historico.appendChild(lista_historico)
        conteudo.appendChild(secao_historico)
      }
    }
  },
  {
    nome: "Criar Perfil",
    url: "/perfis/criar",
    ocultar_no_menu: true,
    render: (conteudo) => {
      const form = document.createElement("form")
      form.style.display = "flex"
      form.style.flexDirection = "column"
      form.style.gap = "1em"
      form.style.maxWidth = "400px"

      const criar_campo = (label, tipo, id, attributes = {}) => {
        const div = document.createElement("div")
        div.style.display = "flex"
        div.style.flexDirection = "column"
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
        Object.assign(input, attributes)
        div.appendChild(input)
        return div
      }

      form.appendChild(criar_campo("Capa", "file", "capa", { accept: "image/*" }))
      form.appendChild(criar_campo("Foto de Perfil", "file", "foto", { accept: "image/*" }))
      form.appendChild(criar_campo("Nome", "text", "nome", { required: true }))
      form.appendChild(criar_campo("Bio", "textarea", "bio"))

      const botao = document.createElement("button")
      botao.textContent = "Salvar Perfil"
      botao.type = "submit"
      form.appendChild(botao)

      form.onsubmit = async (e) => {
        e.preventDefault()
        botao.disabled = true
        botao.textContent = "Salvando..."

        try {
          const diretorio = await obter_diretorio()
        const dados = {
          nome: form.nome.value,
          bio: form.bio.value
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

        // Atualizar lista de perfis
        const arquivo_perfis = await ler_arquivo(diretorio, "perfis")
        const hash_lista_anterior = arquivo_perfis ? await arquivo_perfis.text() : null

        let nova_lista = {
          perfis: [hash_perfil]
        }

        if (hash_lista_anterior) {
          const arquivo_lista_anterior = await ler_arquivo(diretorio, hash_lista_anterior)
          if (arquivo_lista_anterior) {
            const lista_anterior = JSON.parse(await arquivo_lista_anterior.text())
            nova_lista.perfis = [...lista_anterior.perfis, hash_perfil]
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
    nome: "Contatos",
    url: "/contatos",
    render: (conteudo) => {
      const p = document.createElement("p")
      p.textContent = "Sua lista de contatos aparecerá aqui."
      conteudo.appendChild(p)
    }
  },
  {
    nome: "Conversas",
    url: "/conversas",
    render: (conteudo) => {
      const p = document.createElement("p")
      p.textContent = "Suas conversas criptografadas."
      conteudo.appendChild(p)
    }
  },
]

const navegar = (url) => {
  history.pushState({}, "", url)
  rotear()
}

const esta_autenticado = async () => {
  return await obter_diretorio() !== undefined
}

const carregar_tela_login = async () => {
  document.body.innerHTML = ""
  const logo = document.createElement("img")
  logo.style.width = "6vw"
  logo.style.position = "absolute"
  logo.style.top = "4em"
  logo.style.left = "4em"
  logo.src = "kapivatar.svg"
  document.body.appendChild(logo)
  const coluna_1 = document.createElement("div")
  coluna_1.classList.add("coluna")
  coluna_1.style.flex = 3
  coluna_1.style.alignItems = "center"
  coluna_1.style.justifyContent = "center"
  const h1 = document.createElement("h1")
  h1.textContent = "Sua identidade pertence a você!"
  coluna_1.appendChild(h1)
  const img = document.createElement("img")
  img.src = "capivara.jpeg"
  img.style.width = "50%"
  coluna_1.appendChild(img)
  const p_1 = document.createElement("p")
  p_1.style.width = "60%"
  p_1.style.textAlign = "center"
  p_1.textContent = "Não guardamos suas senhas, suas fotos ou suas conversas, porque acreditamos que a internet deve ser descentralizada por padrão. Use o poder do seu próprio navegador para autenticar, navegar e construir uma rede social que é verdadeiramente sua."
  coluna_1.appendChild(p_1)
  document.body.appendChild(coluna_1)
  const coluna_2 = document.createElement("div")
  coluna_2.classList.add("coluna")
  coluna_2.style.flex = 1
  coluna_2.style.backgroundColor = "#222"
  coluna_2.style.margin = "1em"
  coluna_2.style.borderRadius = "1em"
  coluna_2.style.padding = "4em"
  const p_2 = document.createElement("p")
  p_2.textContent = "Entrar no Kapivatar"
  coluna_2.appendChild(p_2)
  const botão = document.createElement("button")
  botão.textContent = "Escolher pasta de dados" 
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

const carregar_layout = () => {
  document.body.innerHTML = ""
  const coluna_1 = document.createElement("div")
  coluna_1.classList.add("coluna")
  coluna_1.style.flex = 1
  coluna_1.style.padding = 0
  coluna_1.style.justifyContent = "space-between"
  const coluna_1_1 = document.createElement("div")
  coluna_1_1.classList.add("coluna")
  coluna_1_1.style.gap = "1px"
  coluna_1.appendChild(coluna_1_1)
  const coluna_1_2 = document.createElement("div")
  coluna_1_2.classList.add("coluna")
  coluna_1_2.style.gap = "0"
  const link_sair = document.createElement("a")
  link_sair.textContent = "Sair"
  link_sair.href = "#"
  link_sair.onclick = async (e) => {
    e.preventDefault()
    const remover_diretório = (await banco_kapivatar).transaction("byName", "readwrite").objectStore("byName").delete("diretório")
    remover_diretório.onsuccess = () => {
      layout_referencias = null
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
  coluna_2.classList.add("coluna")
  coluna_2.style.margin = "1em 1em 1em 0"
  coluna_2.style.padding = "0"
  coluna_2.style.flex = 3
  const coluna_2_linha_1 = document.createElement("div")
  coluna_2_linha_1.classList.add("linha")
  coluna_2_linha_1.style.justifyContent = "space-between"
  const h1 = document.createElement("h1")
  h1.style.margin = "0"
  coluna_2_linha_1.appendChild(h1)
  const ações = document.createElement("div")
  ações.style.padding = "0"
  ações.classList.add("linha")
  coluna_2_linha_1.appendChild(ações)
  coluna_2.appendChild(coluna_2_linha_1)
  const coluna_2_linha_2 = document.createElement("div")
  coluna_2_linha_2.classList.add("linha")
  coluna_2_linha_2.style.backgroundColor = "#222"
  coluna_2_linha_2.style.borderRadius = "1em"
  coluna_2_linha_2.style.flexGrow = "1"
  coluna_2_linha_2.style.padding = "2em"
  coluna_2.appendChild(coluna_2_linha_2)
  document.body.appendChild(coluna_2)

  layout_referencias = {
    menu: coluna_1_1,
    titulo: h1,
    acoes: ações,
    conteudo: coluna_2_linha_2
  }
}

const renderizar_página = (página, params) => {
  const { menu, titulo, acoes, conteudo } = layout_referencias

  // Atualiza Menu
  menu.innerHTML = ""
  páginas.forEach(p => {
    if (p.ocultar_no_menu) return
    const link = document.createElement("a")
    link.textContent = p.nome
    link.href = p.url
    if (location.pathname === p.url) {
      link.style.backgroundColor = "#444"
    }
    menu.appendChild(link)
  })

  // Atualiza Título
  titulo.textContent = página.nome

  // Atualiza Ações
  acoes.innerHTML = ""
  página.ações?.forEach(ação => {
    const botão_ação = document.createElement("button")
    botão_ação.textContent = ação.nome
    botão_ação.onclick = () => {
      navegar(ação.url)
    }
    acoes.appendChild(botão_ação)
  })

  // Atualiza Conteúdo
  conteudo.innerHTML = ""
  if (página.render) {
    página.render(conteudo, params)
  }
}

const renderizar_404 = () => {
  const { menu, titulo, acoes, conteudo } = layout_referencias

  // Atualiza Menu (limpa seleção)
  menu.querySelectorAll("a").forEach(a => a.style.backgroundColor = "")

  titulo.textContent = "404 - Não Encontrado"
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

  const path = location.pathname
  const params = new URLSearchParams(location.search)
  const página = páginas.find(p => p.url === path)

  if (página) {
    renderizar_página(página, params)
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
      navegar(url.pathname)
    }
  }
})

onload = rotear
