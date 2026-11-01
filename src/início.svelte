<script>
  let { url_logo, url_capivara, selecionar_diretorio, navegar } = $props()
  let erro_selecao = $state("")
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
  <p>Entrar no Kapivatar</p>
  <button
    onclick={async () => {
      erro_selecao = ""
      try {
        await selecionar_diretorio()
        navegar("/")
      } catch (erro) {
        if (erro?.name !== "AbortError") {
          console.error("Erro ao selecionar a pasta de dados:", erro)
          erro_selecao = "Não foi possível acessar a pasta selecionada. Tente novamente."
        }
      }
    }}
  >
    <span class="material-symbols-outlined">folder_open</span>
    <span>Escolher pasta de dados</span>
  </button>
  {#if erro_selecao}
    <p role="alert">{erro_selecao}</p>
  {/if}
</div>
