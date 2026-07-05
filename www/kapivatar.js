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
  },
  {
    nome: "Contatos",
    url: "/contatos",
  },
  {
    nome: "Conversas",
    url: "/conversas",
  },
]

const carregar_tela_login = async () => {
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
      document.body.innerHTML = ""
      carregar_tela_início()
    }
    definir_diretório.onerror = (event) => {
      console.error("Erro ao salvar diretório:", event.target.error)
    }
  }
  coluna_2.appendChild(botão)
  document.body.appendChild(coluna_2)
}

const carregar_tela_início = async () => {
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
  link_sair.onclick = async () => {
    const remover_diretório = (await banco_kapivatar).transaction("byName", "readwrite").objectStore("byName").delete("diretório")
    remover_diretório.onsuccess = () => {
      document.body.innerHTML = ""
      carregar_tela_login()
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
  coluna_2.appendChild(coluna_2_linha_2)
  document.body.appendChild(coluna_2)
  páginas.forEach(página => {
    const link = document.createElement("a")
    if (location.pathname === página.url) {
      link.style.backgroundColor = "#444"
      h1.textContent = página.nome
      página.ações?.forEach(ação => {
        const botão_ação = document.createElement("button")
        botão_ação.textContent = ação.nome
        botão_ação.onclick = () => {
          location.href = ação.url
        }
        ações.appendChild(botão_ação)
      })
    }
    link.textContent = página.nome
    link.href = página.url
    coluna_1_1.appendChild(link)
  })
}

onload = async () => {
  const db = await banco_kapivatar
  const obter_diretório = db.transaction("byName", "readwrite").objectStore("byName").get("diretório")
  obter_diretório.onsuccess = async (event) => {
    if (event.target.result === undefined) {
      carregar_tela_login()
      return
    }
    carregar_tela_início()
  }
  obter_diretório.onerror = (event) => {
    console.error("Erro ao obter diretório:", event.target.error)
  }
}