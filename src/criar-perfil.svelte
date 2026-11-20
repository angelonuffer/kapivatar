<script>
  import { onDestroy } from "svelte"

  let {
    criar_arquivo_perfil,
    obter_diretorio,
    gerar_chaves,
    exportar_chave,
    gerar_id_perfil,
    gerar_hash,
    escrever_arquivo,
    gravar_dado_sqlite,
    ler_arquivo,
    navegar,
    obter_dispositivo_local,
  } = $props()

  let nome = $state("")
  let bio = $state("")
  let salvando = $state(false)
  let mensagem_erro = $state("")
  let previews = $state({})

  const atualizar_preview = (campo, event) => {
    if (previews[campo]) URL.revokeObjectURL(previews[campo].url)
    const arquivo = event.currentTarget.files?.[0]
    previews[campo] = arquivo
      ? { nome: arquivo.name, url: URL.createObjectURL(arquivo) }
      : null
  }

  onDestroy(() => {
    for (const preview of Object.values(previews)) {
      if (preview) URL.revokeObjectURL(preview.url)
    }
  })

  const sugerir_nome_arquivo_dados = (nome_perfil) => {
    const nome_arquivo = nome_perfil.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    return `${nome_arquivo || "kapivatar"}.kapivatar`
  }

  const salvar = async (event) => {
    event.preventDefault()
    const form_data = new FormData(event.currentTarget)
    salvando = true
    mensagem_erro = ""

    try {
      await criar_arquivo_perfil(sugerir_nome_arquivo_dados(nome))
      const diretorio = await obter_diretorio()
      if (!diretorio) throw new Error("Não foi possível acessar o arquivo do perfil.")

      const chaves = await gerar_chaves()
      const chave_privada_jwk = await exportar_chave(chaves.privateKey)

      const agora = new Date().toISOString()
      const dispositivo = await obter_dispositivo_local()
      const dados = {
        nome: [{ data: agora, valor: nome }],
        bio: [{ data: agora, valor: bio }],
        chave_privada: chave_privada_jwk,
        dispositivo: { id: dispositivo.id, nome: dispositivo.nome },
        outros_dispositivos: [],
      }

      const salvar_imagem = async (campo) => {
        const arquivo = form_data.get(campo)
        if (arquivo instanceof File && arquivo.name) {
          const buffer = await arquivo.arrayBuffer()
          const hash = await gerar_hash(buffer)
          await escrever_arquivo(diretorio, hash, buffer)
          return { hash, buffer }
        }
        return null
      }

      const capa = await salvar_imagem("capa")
      if (capa) dados.capa = [{ data: agora, valor: capa.hash }]

      const foto = await salvar_imagem("foto")
      if (foto) dados.foto = [{ data: agora, valor: foto.hash }]

      await gravar_dado_sqlite("perfil", dados)

      navegar("/perfil")
    } catch (erro) {
      if (erro?.name !== "AbortError") {
        console.error("Erro ao salvar perfil:", erro)
        mensagem_erro = "Não foi possível salvar o perfil. Tente novamente."
      }
      salvando = false
    }
  }
</script>

<form class="form-perfil" onsubmit={salvar}>
  <div class="form-campo">
    <label for="capa">Capa</label>
    <div class="input-arquivo-container">
      <input
        type="file"
        id="capa"
        name="capa"
        accept="image/*"
        hidden
        onchange={(event) => atualizar_preview("capa", event)}
      />
      <button type="button" onclick={() => document.getElementById("capa").click()}>
        <span class="material-symbols-outlined">upload_file</span>
        <span>Escolher imagem</span>
      </button>
      {#if previews.capa}
        <div class="preview-container">
          <img class="preview-imagem" src={previews.capa.url} alt="Prévia da capa" />
          <span class="nome-arquivo">{previews.capa.nome}</span>
        </div>
      {/if}
    </div>
  </div>

  <div class="form-campo">
    <label for="nome">Nome</label>
    <input id="nome" name="nome" type="text" bind:value={nome} required />
  </div>

  <div class="form-campo">
    <label for="bio">Bio</label>
    <textarea id="bio" name="bio" bind:value={bio}></textarea>
  </div>

  <button type="submit" aria-live="polite" disabled={salvando}>
    <span class="material-symbols-outlined">save</span>
    <span>{salvando ? "Salvando..." : "Salvar Perfil"}</span>
  </button>
  {#if mensagem_erro}
    <p role="alert">{mensagem_erro}</p>
  {/if}
</form>
