<script>
  let { arquivo_nome, dispositivos_pareados, sair, navegar } = $props()
</script>

<ul class="dispositivos-lista">
  <li class="dispositivo-card">
    <h2>Este dispositivo</h2>
    <p class="dispositivo-arquivo">
      <span>Arquivo de dados</span>
      <strong>{arquivo_nome}</strong>
    </p>
    <button type="button" onclick={sair}>
      <span class="material-symbols-outlined">logout</span>
      Sair deste dispositivo
    </button>
  </li>
</ul>

<button type="button" onclick={() => navegar("/dispositivos/parear")}>
  <span class="material-symbols-outlined">sync_alt</span>
  Parear dispositivo
</button>

<section class="dispositivos-pareados">
  <h2>Dispositivos pareados</h2>
  {#if dispositivos_pareados.length}
    <ul>
      {#each dispositivos_pareados as dispositivo (dispositivo.id)}
        <li>{dispositivo.nome}</li>
      {/each}
    </ul>
  {:else}
    <p>Nenhum dispositivo pareado.</p>
  {/if}
</section>

<style>
  .dispositivos-lista {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 24rem));
    gap: 1.5em;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .dispositivo-card {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1em;
    padding: 1.5em;
    border-radius: 1em;
    background-color: #333;
  }

  .dispositivo-card h2,
  .dispositivo-arquivo {
    margin: 0;
  }

  .dispositivo-arquivo {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
  }

  .dispositivos-pareados {
    margin-top: 1em;
  }

  .dispositivos-pareados h2 {
    margin-bottom: 0.5em;
  }
</style>
