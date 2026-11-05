<script>
  let { navegar, sair, abrir_sidebar } = $props()

  const itens_navegacao = [
    { nome: "Início", url: "/", icone: "home" },
    { nome: "Perfis", url: "/perfis", icone: "account_circle" },
    { nome: "Contatos", url: "/contatos", icone: "contacts" },
  ]
</script>

<div class="coluna conteudo-principal">
  <div class="linha cabecalho">
    <button class="botao-menu" aria-label="Abrir menu" onclick={abrir_sidebar}>
      <span class="material-symbols-outlined">menu</span>
    </button>
    <h1 class="titulo-pagina">Início</h1>
    <div class="linha acoes"></div>
  </div>

  <div class="linha conteudo-pagina"></div>

  <nav class="navegacao-inferior" aria-label="Navegação principal">
    {#each itens_navegacao as item}
      <button
        type="button"
        class="navegacao-inferior-item"
        aria-label={item.nome}
        data-url={item.url}
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
