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
    ícone: "account_circle",
    ações: [
      {
        nome: "Criar perfil",
        url: "/perfis/criar",
        ícone: "person_add",
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

      // Histórico
      const secao_historico = document.createElement("div")
      secao_historico.classList.add("historico")
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
    ícone: "person_add",
    ocultar_no_menu: true,
    render: (conteudo) => {
      const form = document.createElement("form")
      form.classList.add("form-perfil")

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
        Object.assign(input, attributes)
        div.appendChild(input)
        return div
      }

      form.appendChild(criar_campo("Capa", "file", "capa", { accept: "image/*" }))
      form.appendChild(criar_campo("Foto de Perfil", "file", "foto", { accept: "image/*" }))
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
      form.appendChild(botao)

        form.onsubmit = async (e) => {
        e.preventDefault()
        botao.disabled = true
        span_texto.textContent = "Salvando..."

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
    ícone: "contacts",
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
  document.body.appendChild(logo)
  const coluna_1 = document.createElement("div")
  coluna_1.classList.add("coluna", "login-info")
  const h1 = document.createElement("h1")
  h1.textContent = "Sua identidade pertence a você!"
  coluna_1.appendChild(h1)
  const img = document.createElement("img")
  img.src = "capivara.jpeg"
  img.classList.add("login-imagem")
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
  logo.classList.add("sidebar-logo")
  link_home.appendChild(logo)

  const titulo_brand = document.createElement("span")
  titulo_brand.textContent = "Kapivatar"
  titulo_brand.classList.add("sidebar-titulo")
  link_home.appendChild(titulo_brand)

  sidebar_header.appendChild(link_home)

  const botao_fechar = document.createElement("button")
  botao_fechar.classList.add("botao-fechar-sidebar")
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
