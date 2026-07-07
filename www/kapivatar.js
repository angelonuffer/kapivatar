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
    render: (conteudo) => {
      const p = document.createElement("p")
      p.textContent = "Aqui você pode gerenciar seus perfis."
      conteudo.appendChild(p)
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
  const db = await banco_kapivatar
  return new Promise((resolve) => {
    const transaction = db.transaction("byName", "readonly")
    const obter_diretório = transaction.objectStore("byName").get("diretório")
    obter_diretório.onsuccess = (event) => {
      resolve(event.target.result !== undefined)
    }
    obter_diretório.onerror = () => {
      resolve(false)
    }
  })
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

const renderizar_página = (página) => {
  const { menu, titulo, acoes, conteudo } = layout_referencias

  // Atualiza Menu
  menu.innerHTML = ""
  páginas.forEach(p => {
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
    página.render(conteudo)
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
  const página = páginas.find(p => p.url === path)

  if (página) {
    renderizar_página(página)
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
