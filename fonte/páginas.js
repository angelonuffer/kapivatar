export const páginas = [
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
      {
        nome: "Histórico",
        url: "/perfis/histórico",
        ícone: "history",
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

      if (!lista || lista.perfis.length === 0) {
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

          const item_remover = document.createElement("button")
          item_remover.classList.add("perfil-menu-item", "remover")
          const icone_remover = document.createElement("span")
          icone_remover.classList.add("material-symbols-outlined")
          icone_remover.textContent = "delete"
          item_remover.appendChild(icone_remover)
          const texto_remover = document.createElement("span")
          texto_remover.textContent = "Remover perfil"
          item_remover.appendChild(texto_remover)

          item_remover.onclick = async () => {
            if (confirm(`Tem certeza que deseja remover o perfil de "${dados.nome}"?`)) {
              await remover_perfil(hash_perfil)
            }
          }

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
          perfis: [hash_perfil],
          data: new Date().toISOString()
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
