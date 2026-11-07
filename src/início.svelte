<script>
  let { url_logo, url_capivara, abrir_arquivo_sqlite, criar_arquivo_sqlite, navegar } = $props()
  let erro_selecao = $state("")

  const escolher_arquivo = async (selecionar) => {
    erro_selecao = ""
    try {
      await selecionar()
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
  <p>Entrar no Kapivatar</p>
  <button onclick={() => escolher_arquivo(abrir_arquivo_sqlite)}>
    <span class="material-symbols-outlined">database</span>
    <span>Abrir arquivo kapivatar.sqlite</span>
  </button>
  <button onclick={() => escolher_arquivo(criar_arquivo_sqlite)}>
    <span class="material-symbols-outlined">database</span>
    <span>Criar arquivo kapivatar.sqlite</span>
  </button>
  {#if erro_selecao}
    <p role="alert">{erro_selecao}</p>
  {/if}
</div>
