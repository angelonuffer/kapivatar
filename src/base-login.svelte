<script>
  let { children } = $props()

  const url_logo = new URL("./kapivatar.svg", import.meta.url).href
  const url_capivara = new URL("./capivara.jpeg", import.meta.url).href
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
  {@render children()}
</div>
