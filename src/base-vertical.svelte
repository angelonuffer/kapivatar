<script>
  import { itens_navegacao } from "./seções"

  let { navegar, abrir_sidebar } = $props()
  let botao_menu_acoes
  let menu_acoes

  const alternar_menu_acoes = () => {
    const aberto = menu_acoes.classList.toggle("aberto")
    botao_menu_acoes.setAttribute("aria-expanded", String(aberto))
  }

  const fechar_menu_acoes_se_fora = (evento) => {
    if (!(evento.target instanceof Node)) return
    if (menu_acoes.contains(evento.target) || botao_menu_acoes.contains(evento.target)) return

    menu_acoes.classList.remove("aberto")
    botao_menu_acoes.setAttribute("aria-expanded", "false")
  }

</script>

<svelte:window onpointerdown={fechar_menu_acoes_se_fora} onfocusin={fechar_menu_acoes_se_fora} />

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
  </nav>
</div>

<style lang="scss">
  @media (max-width: 767px) {
    :global(body.app-logado) {
      box-sizing: border-box;
      width: 100%;
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
    }
  }

  .conteudo-principal {
    margin: 1em 1em 1em 0;
    padding: 0;
    flex: 3;

    @media (max-width: 767px) {
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
  }

  .cabecalho {
    justify-content: space-between;
    align-items: center;

    @media (max-width: 767px) {
      box-sizing: border-box;
      flex: 0 0 4rem;
      width: 100%;
      min-height: 4rem;
      padding: 0.5em 1em;
    }
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

    @media (max-width: 767px) {
      position: relative;
      align-items: center;
    }
  }

  .menu-acoes {
    display: contents;

    @media (max-width: 767px) {
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

      &:global(.aberto) {
        display: flex;
        flex-direction: column;
      }

      :global(button) {
        width: 100%;
        justify-content: flex-start;
        background: none;
        text-align: left;

        &:hover {
          background-color: #444;
        }
      }
    }
  }

  .botao-mais-acoes {
    display: none;

    &[hidden] {
      display: none;
    }

    @media (max-width: 767px) {
      display: inline-flex;
      justify-content: center;
      padding: 0.5em;
      background: none;
    }
  }

  .conteudo-pagina {
    flex-direction: column;
    flex-grow: 1;
    padding: 2em;

    @media (max-width: 767px) {
      box-sizing: border-box;
      flex: 1 1 0;
      width: 100%;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      padding: 1em;
    }
  }

  @media (max-width: 767px) {
    .conteudo-pagina :global(.form-assobio) {
      box-sizing: border-box;
      width: 100%;
      max-width: none;
      margin: 0;
    }

    .conteudo-pagina :global(.form-assobio .form-campo input),
    .conteudo-pagina :global(.form-assobio .form-campo select),
    .conteudo-pagina :global(.form-assobio .form-campo textarea) {
      box-sizing: border-box;
      width: 100%;
    }
  }

  .navegacao-inferior {
    display: none;

    @media (max-width: 767px) {
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
  }

  .navegacao-inferior-item {
    @media (max-width: 767px) {
      min-width: 0;
      flex-direction: column;
      justify-content: center;
      gap: 0.15em;
      padding: 0.35em 0.1em;
      background: transparent;
      font-size: 0.75em;

      .material-symbols-outlined {
        font-size: 1.7em;
      }

      &:global(.ativo) {
        background-color: var(--cor-primaria);
      }
    }
  }
</style>
