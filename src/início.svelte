<script>
  let { url_logo, url_capivara, vfs_salvar, navegar } = $props()
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
      await vfs_salvar("diretório", true)
      navegar("/")
    }}
  >
    <span class="material-symbols-outlined">folder_open</span>
    <span>Escolher pasta de dados</span>
  </button>
</div>
