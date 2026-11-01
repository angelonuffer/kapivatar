export const renderizar_tela_inicial = ({ url_logo, url_capivara, vfs_salvar, navegar }) => {
  document.body.innerHTML = ""
  const logo = document.createElement("img")
  logo.classList.add("login-logo")
  logo.src = url_logo
  logo.alt = "Kapivatar Logo"
  document.body.appendChild(logo)
  const coluna_1 = document.createElement("div")
  coluna_1.classList.add("coluna", "login-info")
  const h1 = document.createElement("h1")
  h1.textContent = "Sua identidade pertence a você!"
  coluna_1.appendChild(h1)
  const img = document.createElement("img")
  img.src = url_capivara
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
    await vfs_salvar("diretório", true)
    navegar("/")
  }
  coluna_2.appendChild(botão)
  document.body.appendChild(coluna_2)
}

export default {
  nome: "Início",
  url: "/",
  ícone: "home",
  render: (conteudo) => {
    const p = document.createElement("p")
    p.textContent = "Bem-vindo ao Kapivatar! Escolha uma opção no menu lateral."
    conteudo.appendChild(p)
  }
}
