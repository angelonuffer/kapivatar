<script>
  import { onDestroy, onMount } from "svelte"
  import Assobios from "./assobios.svelte"

  let {
    modo,
    dados = {},
    imagem_capa = null,
    imagem_foto = null,
    hash_perfil_atual,
    id,
    diretorio,
    gerar_hash,
    escrever_arquivo,
    navegar,
    historico = [],
    registros_assobios = [],
    ao_publicar_assobio,
    ao_arquivar_assobio,
  } = $props()

  let previews = $state({ capa: "", foto: "" })
  let salvando = $state(false)
  let novo_assobio = $state("")
  let atributos_assobio = $state([])
  let arquivo_imagem_assobio = $state(null)
  let preview_imagem_assobio = $state("")
  let menu_adicionar_aberto = $state(false)
  let salvando_assobio = $state(false)
  let erro_assobio = $state("")
  let mensagem_erro = $state("")
  let input_imagem_assobio = $state()
  let container_adicionar_assobio = $state()
  const urls_preview = new Set()

  const criar_preview = (arquivo) => {
    const url = URL.createObjectURL(arquivo)
    urls_preview.add(url)
    return url
  }

  const remover_preview = (url) => {
    if (!url) return
    URL.revokeObjectURL(url)
    urls_preview.delete(url)
  }

  onMount(() => {
    if (imagem_capa) previews.capa = criar_preview(imagem_capa)
    if (imagem_foto) previews.foto = criar_preview(imagem_foto)
    document.addEventListener("pointerdown", fechar_menu_adicionar_assobio)
  })

  onDestroy(() => {
    document.removeEventListener("pointerdown", fechar_menu_adicionar_assobio)
    for (const url of urls_preview) URL.revokeObjectURL(url)
  })

  const fechar_menu_adicionar_assobio = (event) => {
    if (!container_adicionar_assobio?.contains(event.target)) {
      menu_adicionar_aberto = false
    }
  }

  const atualizar_preview = (campo, event) => {
    remover_preview(previews[campo])
    const arquivo = event.currentTarget.files?.[0]
    previews[campo] = arquivo ? criar_preview(arquivo) : ""
  }

  const publicar_assobio = async (event) => {
    event.preventDefault()
    const nota = novo_assobio.trim()
    if (!nota && !arquivo_imagem_assobio && !atributos_assobio.length) return

    salvando_assobio = true
    erro_assobio = ""
    try {
      const atributos = atributos_assobio.map(({ nome, tipo, valor }) => ({
        nome: nome.trim(),
        tipo,
        valor: tipo === "numero" ? Number(valor) : tipo === "logico" ? valor === "true" : valor,
      }))
      await ao_publicar_assobio(nota, arquivo_imagem_assobio, atributos)
      novo_assobio = ""
      atributos_assobio = []
      arquivo_imagem_assobio = null
      remover_preview(preview_imagem_assobio)
      preview_imagem_assobio = ""
      if (input_imagem_assobio) input_imagem_assobio.value = ""
    } catch (erro) {
      console.error("Erro ao publicar assobio:", erro)
      erro_assobio = "Não foi possível publicar o assobio. Tente novamente."
    } finally {
      salvando_assobio = false
    }
  }

  const selecionar_imagem_assobio = (event) => {
    const arquivo = event.currentTarget.files?.[0]
    if (!arquivo) return
    remover_preview(preview_imagem_assobio)
    arquivo_imagem_assobio = arquivo
    preview_imagem_assobio = criar_preview(arquivo)
  }

  const adicionar_atributo_assobio = () => {
    atributos_assobio.push({
      id: crypto.randomUUID(),
      nome: "",
      tipo: "texto",
      valor: "",
    })
    menu_adicionar_aberto = false
  }

  const salvar = async (event) => {
    event.preventDefault()
    salvando = true
    mensagem_erro = ""
    const form_data = new FormData(event.currentTarget)

    try {
      const dados_novos = {
        ...dados,
        nome: form_data.get("nome"),
        bio: form_data.get("bio"),
        anterior: hash_perfil_atual,
        data: new Date().toISOString(),
      }

      const salvar_imagem = async (campo, hash_antigo) => {
        const arquivo = form_data.get(campo)
        if (arquivo instanceof File && arquivo.name) {
          const buffer = await arquivo.arrayBuffer()
          const hash = await gerar_hash(buffer)
          await escrever_arquivo(diretorio, hash, buffer)
          return hash
        }
        return hash_antigo
      }

      dados_novos.capa = await salvar_imagem("capa", dados.capa)
      dados_novos.foto = await salvar_imagem("foto", dados.foto)

      const conteudo_perfil = JSON.stringify(dados_novos)
      const hash_perfil_novo = await gerar_hash(conteudo_perfil)
      await escrever_arquivo(diretorio, hash_perfil_novo, conteudo_perfil)
      await escrever_arquivo(diretorio, id, hash_perfil_novo)

      navegar("/perfil")
    } catch (erro) {
      console.error("Erro ao editar perfil:", erro)
      mensagem_erro = "Não foi possível salvar as alterações do perfil. Tente novamente."
      salvando = false
    }
  }
</script>

{#if modo === "visualizar"}
  <div class="perfil-detalhe">
    {#if previews.capa || imagem_capa}
      <img class="perfil-capa-detalhe" src={previews.capa} alt={`Capa de ${dados.nome}`} />
    {/if}
    <div class="perfil-info-detalhe">
      {#if previews.foto || imagem_foto}
        <img
          class="perfil-foto-detalhe"
          src={previews.foto}
          alt={`Foto de ${dados.nome}`}
          style:margin-top={dados.capa ? "-50px" : "0"}
        />
      {/if}
      <h2>{dados.nome}</h2>
      <p>{dados.bio}</p>
    </div>
  </div>
  <form class="form-perfil form-assobio" onsubmit={publicar_assobio}>
    <div class="form-campo">
      <div class="campo-nota-container">
        <textarea id="novo-assobio" bind:value={novo_assobio}></textarea>
        <div class="adicionar-assobio-container" bind:this={container_adicionar_assobio}>
          <button
            type="button"
            class="botao-adicionar-assobio"
            aria-label="Adicionar ao assobio"
            aria-expanded={menu_adicionar_aberto}
            aria-controls="menu-adicionar-assobio"
            title="Adicionar ao assobio"
            onclick={() => menu_adicionar_aberto = !menu_adicionar_aberto}
          >
            <span class="material-symbols-outlined" aria-hidden="true">add</span>
          </button>
          {#if menu_adicionar_aberto}
            <div class="menu-adicionar-assobio" id="menu-adicionar-assobio">
              <button
                type="button"
                class="item-menu-adicionar-assobio"
                onclick={() => {
                  menu_adicionar_aberto = false
                  input_imagem_assobio.click()
                }}
              >
                <span class="material-symbols-outlined" aria-hidden="true">photo_camera</span>
                <span>Tirar foto</span>
              </button>
              <button
                type="button"
                class="item-menu-adicionar-assobio"
                onclick={adicionar_atributo_assobio}
              >
                <span class="material-symbols-outlined" aria-hidden="true">label</span>
                <span>Atributo</span>
              </button>
            </div>
          {/if}
          <input
            bind:this={input_imagem_assobio}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onchange={selecionar_imagem_assobio}
          />
        </div>
        {#if preview_imagem_assobio}
          <img
            class="preview-imagem-assobio"
            src={preview_imagem_assobio}
            alt="Pré-visualização da foto do assobio"
          />
        {/if}
        <button
          type="submit"
          class="botao-publicar-assobio"
          aria-label="Publicar assobio"
          title="Publicar assobio"
          disabled={salvando_assobio}
        >
          <span class="material-symbols-outlined" aria-hidden="true">send</span>
        </button>
      </div>
      {#if atributos_assobio.length}
        <div class="atributos-assobio">
          {#each atributos_assobio as atributo (atributo.id)}
            <div class="linha-atributo-assobio">
              <input
                type="text"
                aria-label="Nome do atributo"
                placeholder="Nome"
                bind:value={atributo.nome}
                required
              />
              <div class="valor-atributo-assobio">
                {#if atributo.tipo === "logico"}
                  <select aria-label="Valor do atributo" bind:value={atributo.valor} required>
                    <option value="">Selecione</option>
                    <option value="true">Verdadeiro</option>
                    <option value="false">Falso</option>
                  </select>
                {:else}
                  <input
                    type={atributo.tipo === "numero" ? "number" : "text"}
                    aria-label="Valor do atributo"
                    placeholder="Valor"
                    bind:value={atributo.valor}
                    required
                  />
                {/if}
                <select
                  aria-label="Tipo do atributo"
                  bind:value={atributo.tipo}
                  onchange={() => atributo.valor = ""}
                >
                  <option value="texto">Texto</option>
                  <option value="numero">Número</option>
                  <option value="logico">Lógico</option>
                </select>
              </div>
              <button
                type="button"
                class="remover-atributo-assobio"
                aria-label="Remover atributo"
                onclick={() => atributos_assobio = atributos_assobio.filter(item => item.id !== atributo.id)}
              >
                <span class="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    {#if erro_assobio}
      <p role="alert">{erro_assobio}</p>
    {/if}
  </form>
  <Assobios
    registros={registros_assobios}
    somente_arquivados={false}
    ao_arquivar={ao_arquivar_assobio}
  />
{:else if modo === "editar"}
  <form class="form-perfil" onsubmit={salvar}>
    {#each [{ campo: "capa", label: "Capa", arquivo: imagem_capa }, { campo: "foto", label: "Foto de Perfil", arquivo: imagem_foto }] as imagem}
      <div class="form-campo">
        <label for={imagem.campo}>{imagem.label}</label>
        <div class="input-arquivo-container">
          <input
            type="file"
            id={imagem.campo}
            name={imagem.campo}
            accept="image/*"
            hidden
            onchange={(event) => atualizar_preview(imagem.campo, event)}
          />
          <button type="button" onclick={() => document.getElementById(imagem.campo).click()}>
            <span class="material-symbols-outlined">upload_file</span>
            <span>Escolher imagem</span>
          </button>
          {#if previews[imagem.campo] || imagem.arquivo}
            <div class="preview-container">
              <img
                class="preview-imagem"
                src={previews[imagem.campo]}
                alt={`Prévia de ${imagem.label.toLowerCase()}`}
              />
            </div>
          {/if}
        </div>
      </div>
    {/each}

    <div class="form-campo">
      <label for="nome">Nome</label>
      <input id="nome" name="nome" type="text" value={dados.nome || ""} required />
    </div>

    <div class="form-campo">
      <label for="bio">Bio</label>
      <textarea id="bio" name="bio">{dados.bio || ""}</textarea>
    </div>

    <button type="submit" disabled={salvando}>
      <span class="material-symbols-outlined">save</span>
      <span>{salvando ? "Salvando..." : "Salvar Alterações"}</span>
    </button>
    {#if mensagem_erro}
      <p role="alert">{mensagem_erro}</p>
    {/if}
  </form>
{:else if modo === "historico"}
  {#if historico.length}
    <div class="historico" style="margin-top: 0; border-top: none;">
      <ul>
        {#each historico as versao}
          <li><a href={`/perfil?v=${versao.hash}`}>{versao.data}</a></li>
        {/each}
      </ul>
    </div>
  {:else}
    <p>Nenhum histórico encontrado.</p>
  {/if}
{/if}

<style>
  .adicionar-assobio-container {
    position: absolute;
    bottom: 0.5em;
    left: 0.5em;
  }

  .botao-adicionar-assobio {
    padding: 0.35em;
  }

  .menu-adicionar-assobio {
    position: absolute;
    bottom: calc(100% + 0.5em);
    left: 0;
    min-width: 150px;
    overflow: hidden;
    background: #444;
    border-radius: 0.5em;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    z-index: 10;
  }

  .item-menu-adicionar-assobio {
    width: 100%;
    justify-content: flex-start;
    border-radius: 0;
  }

  .atributos-assobio {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    margin-top: 0.75em;
  }

  .linha-atributo-assobio {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    gap: 0.5em;
    align-items: center;
  }

  .valor-atributo-assobio {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.35em;
    min-width: 0;
  }

  .remover-atributo-assobio {
    padding: 0.3em;
  }

  .preview-imagem-assobio {
    display: block;
    max-width: 100%;
    max-height: 240px;
    margin-top: 0.5em;
    object-fit: contain;
  }

  .botao-publicar-assobio {
    position: absolute;
    right: 0.5em;
    bottom: 0.5em;
    padding: 0.35em;
  }
</style>
