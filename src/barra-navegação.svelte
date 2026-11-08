<script>
  const itens_navegacao = [
    { nome: "Início", url: "/", rotas: ["/"], icone: "home" },
    { nome: "Assobios", url: "/assobios", rotas: ["/assobios", "/assobio"], icone: "campaign" },
    { nome: "Contatos", url: "/contatos", rotas: ["/contatos", "/contato"], icone: "contacts" },
    { nome: "Dispositivos", url: "/dispositivos", rotas: ["/dispositivos"], icone: "devices" },
    { nome: "Perfil", url: "/perfil", rotas: ["/perfil"], icone: "account_circle" },
  ]

  let { tipo, navegar } = $props()
</script>

{#if tipo === "lateral"}
  <div class="coluna menu">
    {#each itens_navegacao as item}
      <a
        href={item.url}
        data-url={item.url}
        data-rotas={item.rotas.join(" ")}
        onclick={(evento) => {
          evento.preventDefault()
          navegar(item.url)
        }}
      >
        <span class="material-symbols-outlined" aria-hidden="true">{item.icone}</span>
        <span>{item.nome}</span>
      </a>
    {/each}
  </div>
{:else}
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
{/if}

<style lang="scss">
  .menu {
    box-sizing: border-box;
    flex: 1;
    align-items: center;
    gap: 0.5rem;
    overflow-y: auto;
    padding: 0.5rem 0.25rem;
  }

  .menu a {
    box-sizing: border-box;
    min-width: 0;
    width: 3.5rem;
    height: 3.5rem;
    flex: 0 0 3.5rem;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15em;
    padding: 0.35em 0.1em;
    font-size: 0.75em;
    text-align: center;
  }

  .menu a .material-symbols-outlined {
    font-size: 1.7em;
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
