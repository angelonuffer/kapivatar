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
