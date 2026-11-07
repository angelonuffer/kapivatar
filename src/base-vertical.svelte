<script>
  import { itens_navegacao } from "./seções"

  let { navegar, sair, abrir_sidebar } = $props()
  let botao_menu_acoes
  let menu_acoes

  const alternar_menu_acoes = () => {
    const aberto = menu_acoes.classList.toggle("aberto")
    botao_menu_acoes.setAttribute("aria-expanded", String(aberto))
  }

</script>

<div class="coluna conteudo-principal">
  <div class="linha cabecalho">
    <button class="botao-menu" aria-label="Abrir menu" onclick={abrir_sidebar}>
      <span class="material-symbols-outlined">menu</span>
    </button>
    <h1 class="titulo-pagina">Início</h1>
    <div class="linha acoes">
      <button
        bind:this={botao_menu_acoes}
        type="button"
        class="botao-mais-acoes"
        aria-label="Mais opções"
        aria-expanded="false"
        hidden
        onclick={alternar_menu_acoes}
      >
        <span class="material-symbols-outlined" aria-hidden="true">more_vert</span>
      </button>
      <div bind:this={menu_acoes} class="menu-acoes"></div>
    </div>
  </div>

  <div class="linha conteudo-pagina"></div>

  <nav class="navegacao-inferior" aria-label="Navegação principal">
    {#each itens_navegacao as item}
      <button
        type="button"
        class="navegacao-inferior-item"
        aria-label={item.nome}
        data-url={item.url}
        data-rotas={item.rotas.join(" ")}
        onclick={() => navegar(item.url)}
      >
        <span class="material-symbols-outlined" aria-hidden="true">{item.icone}</span>
        <span>{item.nome}</span>
      </button>
    {/each}
    <button type="button" class="navegacao-inferior-item" aria-label="Sair" onclick={sair}>
      <span class="material-symbols-outlined" aria-hidden="true">logout</span>
      <span>Sair</span>
    </button>
  </nav>
</div>

<style>
  .conteudo-principal {
    margin: 1em 1em 1em 0;
    padding: 0;
    flex: 3;
  }

  .cabecalho {
    justify-content: space-between;
    align-items: center;
  }

  .botao-menu {
    display: none;
    background: none;
    padding: 0.5em;
  }

  .titulo-pagina {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5em;
    color: var(--cor-primaria);
  }

  .acoes {
    padding: 0;
  }

  .menu-acoes {
    display: contents;
  }

  .botao-mais-acoes {
    display: none;
  }

  .botao-mais-acoes[hidden] {
    display: none;
  }

  .conteudo-pagina {
    background-color: #222;
    border-radius: 1em;
    flex-grow: 1;
    padding: 2em;
  }

  .navegacao-inferior {
    display: none;
  }

  @media (max-width: 767px) {
    :global(body.app-logado) {
      box-sizing: border-box;
      width: 100%;
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
    }

    .conteudo-principal {
      box-sizing: border-box;
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      min-height: 0;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }

    .cabecalho {
      box-sizing: border-box;
      flex: 0 0 4rem;
      width: 100%;
      min-height: 4rem;
      padding: 0.5em 1em;
    }

    .acoes {
      position: relative;
      align-items: center;
    }

    .botao-mais-acoes {
      display: inline-flex;
      justify-content: center;
      padding: 0.5em;
      background: none;
    }

    .menu-acoes {
      position: absolute;
      top: calc(100% + 0.25em);
      right: 0;
      z-index: 110;
      display: none;
      min-width: max-content;
      padding: 0.25em;
      border-radius: 0.5em;
      background-color: #333;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .menu-acoes:global(.aberto) {
      display: flex;
      flex-direction: column;
    }

    .menu-acoes :global(button) {
      width: 100%;
      justify-content: flex-start;
      background: none;
      text-align: left;
    }

    .menu-acoes :global(button:hover) {
      background-color: #444;
    }

    .conteudo-pagina {
      box-sizing: border-box;
      flex: 1 1 0;
      width: 100%;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      padding: 1em;
    }

    .botao-menu {
      display: none;
    }

    .navegacao-inferior {
      position: static;
      z-index: 100;
      box-sizing: border-box;
      flex: 0 0 4.5rem;
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      width: 100%;
      height: 4.5rem;
      min-height: 4.5rem;
      padding: 0.4em 0 calc(0.4em + env(safe-area-inset-bottom));
      border-top: 1px solid #333;
      background-color: #111;
    }

    .navegacao-inferior-item {
      min-width: 0;
      flex-direction: column;
      justify-content: center;
      gap: 0.15em;
      padding: 0.35em 0.1em;
      background: transparent;
      font-size: 0.75em;
    }

    .navegacao-inferior-item .material-symbols-outlined {
      font-size: 1.7em;
    }

    .navegacao-inferior-item:global(.ativo) {
      background-color: var(--cor-primaria);
    }
  }
</style>
