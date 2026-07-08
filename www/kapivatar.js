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
    ícone: "groups",
    ações: [
      {
        nome: "Criar perfil",
        url: "/perfis/criar",
        ícone: "add"
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
        grid.classList.add("perfis-grid")
        conteudo.appendChild(grid)

        for (const hash_perfil of lista.perfis) {
          const arquivo_perfil = await ler_arquivo(diretorio, hash_perfil)
          if (!arquivo_perfil) continue
          const dados = JSON.parse(await arquivo_perfil.text())

          const card = document.createElement("div")
          card.classList.add("perfil-card")

          if (dados.capa) {
            const img_capa = document.createElement("img")
            const arquivo_capa = await ler_arquivo(diretorio, dados.capa)
            if (arquivo_capa) img_capa.src = URL.createObjectURL(arquivo_capa)
            img_capa.classList.add("perfil-capa")
            card.appendChild(img_capa)
          }

          const info = document.createElement("div")
          info.classList.add("perfil-info")

          if (dados.foto) {
            const img_foto = document.createElement("img")
            const arquivo_foto = await ler_arquivo(diretorio, dados.foto)
            if (arquivo_foto) img_foto.src = URL.createObjectURL(arquivo_foto)
            img_foto.classList.add("perfil-foto")
            if (dados.capa) img_foto.classList.add("com-capa")
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

      // Histórico
      const secao_historico = document.createElement("div")
      secao_historico.classList.add("historico-secao")
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
      form.classList.add("form-padrao")

      const criar_campo = (label, tipo, id, attributes = {}) => {
        const div = document.createElement("div")
        div.classList.add("campo-form")
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
      botao.appendChild(criar_ícone("save"))
      botao.appendChild(document.createTextNode("Salvar Perfil"))
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
    ícone: "person",
    render: (conteudo) => {
      const p = document.createElement("p")
      p.textContent = "Sua lista de contatos aparecerá aqui."
      conteudo.appendChild(p)
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
  history.pushState({}, "", url)
  rotear()
}

const esta_autenticado = async () => {
  const dir = await obter_diretorio()
  return dir !== undefined && dir !== null
}

const criar_ícone = (nome) => {
  const i = document.createElement("span")
  i.classList.add("material-symbols-outlined")
  i.textContent = nome
  return i
}

let layout_referencias = null

const carregar_layout_base = () => {
  document.body.innerHTML = ""
  const container = document.createElement("div")
  container.classList.add("app-container")

  const header = document.createElement("header")
  header.classList.add("header")

  const header_esquerda = document.createElement("div")
  header_esquerda.classList.add("header-esquerda")

  const menu_toggle = document.createElement("button")
  menu_toggle.classList.add("menu-toggle")
  menu_toggle.appendChild(criar_ícone("menu"))
  menu_toggle.onclick = () => {
    document.querySelector(".sidebar").classList.toggle("aberto")
  }
  header_esquerda.appendChild(menu_toggle)

  const logo = document.createElement("img")
  logo.src = "kapivatar.svg"
  logo.classList.add("logo")
  header_esquerda.appendChild(logo)

  const titulo_app = document.createElement("div")
  titulo_app.textContent = "Kapivatar"
  titulo_app.classList.add("app-titulo")
  header_esquerda.appendChild(titulo_app)

  const titulo_pagina = document.createElement("h1")
  titulo_pagina.classList.add("pagina-titulo")
  header_esquerda.appendChild(titulo_pagina)

  header.appendChild(header_esquerda)

  const header_direita = document.createElement("div")
  header_direita.classList.add("header-direita")
  const header_acoes = document.createElement("div")
  header_acoes.classList.add("header-acoes")
  header_direita.appendChild(header_acoes)
  header.appendChild(header_direita)

  container.appendChild(header)

  const corpo = document.createElement("div")
  corpo.classList.add("app-corpo")

  const sidebar = document.createElement("aside")
  sidebar.classList.add("sidebar")

  const sidebar_header = document.createElement("div")
  sidebar_header.classList.add("sidebar-header")
  const fechar_menu = document.createElement("button")
  fechar_menu.classList.add("menu-toggle-interno")
  fechar_menu.appendChild(criar_ícone("close"))
  fechar_menu.onclick = () => {
    sidebar.classList.remove("aberto")
  }
  sidebar_header.appendChild(fechar_menu)
  sidebar.appendChild(sidebar_header)

  const menu = document.createElement("nav")
  menu.classList.add("sidebar-menu")
  sidebar.appendChild(menu)

  const sidebar_footer = document.createElement("div")
  sidebar_footer.classList.add("sidebar-footer")
  const link_sair = document.createElement("a")
  link_sair.href = "#"
  link_sair.appendChild(criar_ícone("logout"))
  link_sair.appendChild(document.createTextNode("Sair"))
  link_sair.onclick = async (e) => {
    e.preventDefault()
    const db = await banco_kapivatar
    const transaction = db.transaction("byName", "readwrite")
    const remover_diretório = transaction.objectStore("byName").delete("diretório")
    remover_diretório.onsuccess = () => {
      layout_referencias = null
      navegar("/")
    }
  }
  sidebar_footer.appendChild(link_sair)
  sidebar.appendChild(sidebar_footer)

  corpo.appendChild(sidebar)

  const main = document.createElement("main")
  main.classList.add("main-content")
  corpo.appendChild(main)

  container.appendChild(corpo)
  document.body.appendChild(container)

  layout_referencias = {
    menu: menu,
    titulo: titulo_pagina,
    acoes: header_acoes,
    conteudo: main,
    sidebar: sidebar
  }
}

const carregar_tela_login = async () => {
  document.body.classList.remove("app-logado")
  carregar_layout_base()
  const { menu, titulo, acoes, conteudo, sidebar } = layout_referencias

  sidebar.classList.remove("aberto")
  titulo.textContent = "Entrar"

  conteudo.innerHTML = ""
  conteudo.classList.remove("main-content")
  conteudo.classList.add("login-container")

  const info = document.createElement("div")
  info.classList.add("login-info")
  const h2 = document.createElement("h2")
  h2.textContent = "Sua identidade pertence a você!"
  info.appendChild(h2)
  const img = document.createElement("img")
  img.src = "capivara.jpeg"
  info.appendChild(img)
  const p = document.createElement("p")
  p.textContent = "Não guardamos suas senhas, suas fotos ou suas conversas, porque acreditamos que a internet deve ser descentralizada por padrão. Use o poder do seu próprio navegador para autenticar, navegar e construir uma rede social que é verdadeiramente sua."
  info.appendChild(p)
  conteudo.appendChild(info)

  const card = document.createElement("div")
  card.classList.add("login-card")
  const p2 = document.createElement("p")
  p2.textContent = "Entrar no Kapivatar"
  card.appendChild(p2)
  const botao = document.createElement("button")
  botao.appendChild(criar_ícone("folder_open"))
  botao.appendChild(document.createTextNode("Escolher pasta de dados"))
  botao.onclick = async () => {
    const diretório = await showDirectoryPicker();
    const db = await banco_kapivatar
    const transaction = db.transaction("byName", "readwrite")
    const definir_diretório = transaction.objectStore("byName").put(diretório, "diretório")
    definir_diretório.onsuccess = () => {
      navegar("/")
    }
  }
  card.appendChild(botao)
  conteudo.appendChild(card)
}

const renderizar_página = (página, params) => {
  document.body.classList.add("app-logado")
  const { menu, titulo, acoes, conteudo, sidebar } = layout_referencias

  // Fecha sidebar mobile
  sidebar.classList.remove("aberto")

  // Atualiza Menu
  menu.innerHTML = ""
  páginas.forEach(p => {
    if (p.ocultar_no_menu) return
    const link = document.createElement("a")
    if (p.ícone) link.appendChild(criar_ícone(p.ícone))
    link.appendChild(document.createTextNode(p.nome))
    link.href = p.url
    if (location.pathname === p.url) {
      link.classList.add("ativo")
    }
    menu.appendChild(link)
  })

  // Atualiza Título
  titulo.textContent = página.nome

  // Atualiza Ações
  acoes.innerHTML = ""
  página.ações?.forEach(ação => {
    const botão_ação = document.createElement("button")
    if (ação.ícone) botão_ação.appendChild(criar_ícone(ação.ícone))
    botão_ação.appendChild(document.createTextNode(ação.nome))
    botão_ação.onclick = () => {
      navegar(ação.url)
    }
    acoes.appendChild(botão_ação)
  })

  // Atualiza Conteúdo
  conteudo.classList.add("main-content")
  conteudo.classList.remove("login-container")
  conteudo.innerHTML = ""
  if (página.render) {
    página.render(conteudo, params)
  }
}

const renderizar_404 = () => {
  document.body.classList.add("app-logado")
  const { menu, titulo, acoes, conteudo, sidebar } = layout_referencias
  sidebar.classList.remove("aberto")
  menu.querySelectorAll("a").forEach(a => a.classList.remove("ativo"))
  titulo.textContent = "404"
  acoes.innerHTML = ""
  conteudo.classList.add("main-content")
  conteudo.classList.remove("login-container")
  conteudo.innerHTML = "<p>A página que você procura não existe.</p>"
}

const rotear = async () => {
  const autenticado = await esta_autenticado()

  if (!autenticado) {
    layout_referencias = null
    carregar_tela_login()
    return
  }

  if (!layout_referencias || !document.querySelector(".sidebar")) {
    carregar_layout_base()
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
