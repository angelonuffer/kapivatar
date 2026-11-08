<script>
  import BarraNavegacao from "./barra-navegação.svelte"

  let { url_logo, navegar, fechar_sidebar } = $props()
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

  <BarraNavegacao tipo="lateral" {navegar} />

  <div class="coluna sidebar-rodape">
    <div class="perfil-selecionado-sidebar"></div>
  </div>
</div>

<style>
  .sidebar {
    box-sizing: border-box;
    flex: 0 0 5rem;
    width: 5rem;
    min-width: 5rem;
    padding: 0;
    justify-content: space-between;
    background-color: #111;
    z-index: 100;
    transition: transform 0.3s ease;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .sidebar-brand:hover {
    background-color: transparent;
  }

  .sidebar-logo {
    width: 40px;
    height: 40px;
    border-radius: 0.5em;
  }

  .sidebar-titulo {
    display: none;
    font-size: 1.5em;
    font-weight: bold;
    color: var(--cor-primaria);
  }

  .botao-fechar-sidebar {
    display: none;
    background: none;
    padding: 0.5em;
  }

  .sidebar-rodape {
    box-sizing: border-box;
    align-items: center;
    gap: 0.5em;
    padding: 0.5rem 0.25rem;
  }

  .perfil-selecionado-sidebar {
    box-sizing: border-box;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25em;
    background-color: #222;
    border-radius: 0.5em;
    padding: 0.25em;
  }

  .perfil-selecionado-sidebar :global(.perfil-sidebar-info) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25em;
    overflow: hidden;
  }

  .perfil-selecionado-sidebar :global(.perfil-sidebar-foto) {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  .perfil-selecionado-sidebar :global(.perfil-sidebar-nome) {
    max-width: 100%;
    font-size: 0.65em;
    text-align: center;
    overflow-wrap: anywhere;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #eee;
  }

  .perfil-selecionado-sidebar :global(a) {
    box-sizing: border-box;
    width: 100%;
    flex-direction: column;
    gap: 0.15em;
    padding: 0.35em 0.1em;
    font-size: 0.65em;
    text-align: center;
  }

  .perfil-selecionado-sidebar :global(.botao-trocar-perfil) {
    background: none;
    padding: 0.2em;
    border-radius: 0.3em;
    color: #ccc;
  }

  .perfil-selecionado-sidebar :global(.botao-trocar-perfil:hover) {
    background-color: #333;
    color: #eee;
  }

  .overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 90;
  }

  @media (max-width: 767px) {
    .sidebar {
      display: none;
    }
  }
</style>
