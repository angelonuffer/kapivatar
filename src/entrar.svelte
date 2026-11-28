<script>
  import CriarPerfil from "./criar-perfil.svelte"

  let {
    url_logo,
    url_capivara,
    abrir_perfil,
    navegar,
    criar_arquivo_perfil,
    obter_diretorio,
    gerar_chaves,
    exportar_chave,
    gerar_id_perfil,
    gerar_hash,
    escrever_arquivo,
    gravar_dado_sqlite,
    ler_arquivo,
    obter_dispositivo_local,
    carregar_dispositivos_pareados,
  } = $props()
  let erro_selecao = $state("")
  let criando_perfil = $state(false)

  const escolher_arquivo = async () => {
    erro_selecao = ""
    try {
      await abrir_perfil()
      navegar("/")
    } catch (erro) {
      if (erro?.name !== "AbortError") {
        console.error("Erro ao selecionar o arquivo de dados:", erro)
        erro_selecao = "Não foi possível acessar o arquivo selecionado. Tente novamente."
      }
    }
  }
</script>

<img class="login-logo" src={url_logo} alt="Kapivatar Logo" />

<div class="coluna login-info">
  <h1>Sua identidade pertence a você!</h1>
  <img class="login-imagem" src={url_capivara} alt="Mascote Capivara" />
  <p class="login-descricao">
    Não guardamos suas senhas, suas fotos ou suas conversas, porque acreditamos que a internet deve
    ser descentralizada por padrão. Use o poder do seu próprio navegador para autenticar, navegar e
    construir uma rede social que é verdadeiramente sua.
  </p>
</div>

<div class="coluna login-acao">
  {#if criando_perfil}
    <p>Criar perfil</p>
    <button
      class="botao-voltar-login"
      type="button"
      aria-label="Voltar"
      onclick={() => criando_perfil = false}
    >
      <span class="material-symbols-outlined">arrow_back</span>
    </button>
    <CriarPerfil
      {criar_arquivo_perfil}
      {obter_diretorio}
      {gerar_chaves}
      {exportar_chave}
      {gerar_id_perfil}
      {gerar_hash}
      {escrever_arquivo}
      {ler_arquivo}
      {gravar_dado_sqlite}
      {obter_dispositivo_local}
      {carregar_dispositivos_pareados}
      {navegar}
    />
  {:else}
    <p>Entrar no Kapivatar</p>
    <button onclick={() => criando_perfil = true}>
      <span class="material-symbols-outlined">person_add</span>
      <span>Criar perfil</span>
    </button>
    <button onclick={escolher_arquivo}>
      <span class="material-symbols-outlined">person</span>
      <span>Abrir perfil</span>
    </button>
    <button onclick={() => navegar("/dispositivos/parear/receber")}>
      <span class="material-symbols-outlined">devices</span>
      <span>Perfil de outro dispositivo</span>
    </button>
    {#if erro_selecao}
      <p role="alert">{erro_selecao}</p>
    {/if}
  {/if}
</div>
