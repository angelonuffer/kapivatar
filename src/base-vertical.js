export const criar_base_vertical = ({ navegar, sair, abrir_sidebar }) => {
  const conteudo_principal = document.createElement("div")
  conteudo_principal.classList.add("coluna", "conteudo-principal")

  const cabecalho = document.createElement("div")
  cabecalho.classList.add("linha", "cabecalho")

  const botao_menu = document.createElement("button")
  botao_menu.classList.add("botao-menu")
  botao_menu.setAttribute("aria-label", "Abrir menu")
  const icone_menu = document.createElement("span")
  icone_menu.classList.add("material-symbols-outlined")
  icone_menu.textContent = "menu"
  botao_menu.appendChild(icone_menu)
  botao_menu.onclick = abrir_sidebar
  cabecalho.appendChild(botao_menu)

  const titulo = document.createElement("h1")
  titulo.classList.add("titulo-pagina")
  cabecalho.appendChild(titulo)

  const acoes = document.createElement("div")
  acoes.classList.add("linha", "acoes")
  cabecalho.appendChild(acoes)
  conteudo_principal.appendChild(cabecalho)

  const conteudo = document.createElement("div")
  conteudo.classList.add("linha", "conteudo-pagina")
  conteudo_principal.appendChild(conteudo)

  const navegacao_inferior = document.createElement("nav")
  navegacao_inferior.classList.add("navegacao-inferior")
  navegacao_inferior.setAttribute("aria-label", "Navegação principal")
  const itens_navegacao = [
    { nome: "Início", url: "/", ícone: "home" },
    { nome: "Perfis", url: "/perfis", ícone: "account_circle" },
    { nome: "Contatos", url: "/contatos", ícone: "contacts" },
  ]
  const botoes_navegacao = itens_navegacao.map((item) => {
    const botão = document.createElement("button")
    botão.type = "button"
    botão.classList.add("navegacao-inferior-item")
    botão.setAttribute("aria-label", item.nome)
    botão.dataset.url = item.url
    botão.onclick = () => navegar(item.url)

    const ícone = document.createElement("span")
    ícone.classList.add("material-symbols-outlined")
    ícone.setAttribute("aria-hidden", "true")
    ícone.textContent = item.ícone
    botão.appendChild(ícone)

    const texto = document.createElement("span")
    texto.textContent = item.nome
    botão.appendChild(texto)
    navegacao_inferior.appendChild(botão)
    return botão
  })

  const botão_sair = document.createElement("button")
  botão_sair.type = "button"
  botão_sair.classList.add("navegacao-inferior-item")
  botão_sair.setAttribute("aria-label", "Sair")
  botão_sair.onclick = sair
  const ícone_sair = document.createElement("span")
  ícone_sair.classList.add("material-symbols-outlined")
  ícone_sair.setAttribute("aria-hidden", "true")
  ícone_sair.textContent = "logout"
  botão_sair.appendChild(ícone_sair)
  const texto_sair = document.createElement("span")
  texto_sair.textContent = "Sair"
  botão_sair.appendChild(texto_sair)
  navegacao_inferior.appendChild(botão_sair)
  conteudo_principal.appendChild(navegacao_inferior)

  return { container: conteudo_principal, titulo, acoes, conteudo, botoes_navegacao }
}
