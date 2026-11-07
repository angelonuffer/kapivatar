<script>
  let { url_logo, navegar, fechar_sidebar, sair } = $props()
</script>

<button type="button" class="overlay" aria-label="Fechar menu" onclick={fechar_sidebar}></button>

<div class="coluna sidebar">
  <div class="sidebar-header">
    <a
      href="/"
      class="sidebar-brand"
      onclick={(evento) => {
        evento.preventDefault()
        navegar("/")
      }}
    >
      <img class="sidebar-logo" src={url_logo} alt="Kapivatar Logo" />
      <span class="sidebar-titulo">Kapivatar</span>
    </a>

    <button class="botao-fechar-sidebar" aria-label="Fechar menu" onclick={fechar_sidebar}>
      <span class="material-symbols-outlined">close</span>
    </button>
  </div>

  <div class="coluna menu"></div>

  <div class="coluna sidebar-rodape">
    <div class="perfil-selecionado-sidebar"></div>
    <button type="button" onclick={sair}>
      <span class="material-symbols-outlined">logout</span>
      <span>Sair</span>
    </button>
  </div>
</div>
