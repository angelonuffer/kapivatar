<script>
  import { onDestroy, onMount } from "svelte"

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
  } = $props()

  let previews = $state({ capa: "", foto: "" })
  let salvando = $state(false)
  let mensagem_erro = $state("")
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
  })

  onDestroy(() => {
    for (const url of urls_preview) URL.revokeObjectURL(url)
  })

  const atualizar_preview = (campo, event) => {
    remover_preview(previews[campo])
    const arquivo = event.currentTarget.files?.[0]
    previews[campo] = arquivo ? criar_preview(arquivo) : ""
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
