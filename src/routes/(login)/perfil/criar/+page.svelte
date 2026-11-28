<script>
  import * as aplicativo from "../../../../kapivatar.js"
  import { goto } from "$app/navigation"
  import { onDestroy } from "svelte"

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
      await aplicativo.criar_arquivo_perfil(sugerir_nome_arquivo_dados(nome))
      const diretorio = await aplicativo.obter_diretorio()
      if (!diretorio) throw new Error("Não foi possível acessar o arquivo do perfil.")

      const chaves = await aplicativo.gerar_chaves()
      const chave_privada_jwk = await aplicativo.exportar_chave(chaves.privateKey)

      const agora = new Date().toISOString()
      const dispositivo = await aplicativo.obter_dispositivo_local()
      const dispositivos_pareados = await aplicativo.carregar_dispositivos_pareados()
      const dados = {
        nome: [{ data: agora, valor: nome }],
        bio: [{ data: agora, valor: bio }],
        visibilidade_foto: [{ data: agora, valor: "privado" }],
        chave_privada: chave_privada_jwk,
        dispositivo: { id: dispositivo.id, nome: dispositivo.nome },
        outros_dispositivos: dispositivos_pareados.map(({ id, nome, chave_secreta, pareado_em }) =>
          ({ id, nome, chave_secreta, pareado_em })),
      }

      const salvar_imagem = async (campo) => {
        const arquivo = form_data.get(campo)
        if (arquivo instanceof File && arquivo.name) {
          const buffer = await arquivo.arrayBuffer()
          const hash = await aplicativo.gerar_hash(buffer)
          await aplicativo.escrever_arquivo(diretorio, hash, buffer)
          return { hash, buffer }
        }
        return null
      }

      const capa = await salvar_imagem("capa")
      if (capa) dados.capa = [{ data: agora, valor: capa.hash }]

      const foto = await salvar_imagem("foto")
      if (foto) dados.foto = [{ data: agora, valor: foto.hash }]

      await aplicativo.gravar_dado_sqlite("perfil", dados)
      goto("/perfil")
    } catch (erro) {
      if (erro?.name !== "AbortError") {
        console.error("Erro ao salvar perfil:", erro)
        mensagem_erro = "Não foi possível salvar o perfil. Tente novamente."
      }
      salvando = false
    }
  }
</script>

<svelte:head>
  <title>Criar perfil · Kapivatar</title>
</svelte:head>

<div class="login-acao-cabecalho">
  <button
    class="botao-voltar-login"
    type="button"
    aria-label="Voltar"
    onclick={() => goto("/")}
  >
    <span class="material-symbols-outlined">arrow_back</span>
  </button>
  <p>Criar perfil</p>
</div>
<div class="login-acao-conteudo">
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
      <label for="foto">Foto</label>
      <div class="input-arquivo-container">
        <input
          type="file"
          id="foto"
          name="foto"
          accept="image/*"
          hidden
          onchange={(event) => atualizar_preview("foto", event)}
        />
        <button type="button" onclick={() => document.getElementById("foto").click()}>
          <span class="material-symbols-outlined">upload_file</span>
          <span>Escolher imagem</span>
        </button>
        {#if previews.foto}
          <div class="preview-container">
            <img class="preview-imagem" src={previews.foto.url} alt="Prévia da foto" />
            <span class="nome-arquivo">{previews.foto.nome}</span>
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
</div>
