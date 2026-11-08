<script>
  let { arquivo_nome, dispositivos_pareados, sair, navegar } = $props()
  let dialogo_confirmacao_sair

  const confirmar_sair = () => {
    dialogo_confirmacao_sair.close()
    sair()
  }
</script>

<ul class="dispositivos-lista">
  <li class="dispositivo-card">
    <h2>Este dispositivo</h2>
    <p class="dispositivo-arquivo">
      <span class="material-symbols-outlined" role="img" aria-label="Arquivo de dados">
        database
      </span>
      <strong>{arquivo_nome}</strong>
    </p>
    <button
      class="botao-sair-dispositivo"
      type="button"
      aria-label="Sair deste dispositivo"
      onclick={() => dialogo_confirmacao_sair.showModal()}
    >
      <span class="material-symbols-outlined" aria-hidden="true">logout</span>
    </button>
  </li>
</ul>

<dialog bind:this={dialogo_confirmacao_sair} aria-labelledby="titulo-confirmacao-sair">
  <h2 id="titulo-confirmacao-sair">Sair deste dispositivo?</h2>
  <p>Você precisará abrir novamente o arquivo de dados para entrar.</p>
  <div class="acoes-confirmacao-sair">
    <button type="button" onclick={() => dialogo_confirmacao_sair.close()}>Cancelar</button>
    <button type="button" onclick={confirmar_sair}>Sair</button>
  </div>
</dialog>

<button type="button" onclick={() => navegar("/dispositivos/parear")}>
  <span class="material-symbols-outlined">sync_alt</span>
  Parear dispositivo
</button>

<section class="dispositivos-pareados">
  <h2>Dispositivos pareados</h2>
  {#if dispositivos_pareados.length}
    <ul class="dispositivos-lista">
      {#each dispositivos_pareados as dispositivo (dispositivo.id)}
        <li class="dispositivo-card">
          <h2>{dispositivo.nome}</h2>
        </li>
      {/each}
    </ul>
  {:else}
    <p>Nenhum dispositivo pareado.</p>
  {/if}
</section>

<style lang="scss">
  .dispositivos-lista {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
    gap: 1.5em;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .dispositivo-card,
  .dispositivo-arquivo {
    display: flex;
    flex-direction: column;
  }

  .dispositivo-card {
    position: relative;
    box-sizing: border-box;
    align-items: flex-start;
    gap: 1em;
    padding: 1.5em;
    border-radius: 1em;
    background-color: #333;

    h2 {
      margin: 0;
    }
  }

  .botao-sair-dispositivo {
    position: absolute;
    top: 1em;
    right: 1em;
    padding: 0.5em;
  }

  .dispositivo-arquivo {
    align-items: center;
    flex-direction: row;
    margin: 0;
    gap: 0.25em;
  }

  dialog {
    max-width: min(24em, calc(100% - 4em));
    border: 0;
    border-radius: 1em;
    background-color: #333;
    color: #eee;

    h2 {
      margin-top: 0;
    }

    &::backdrop {
      background-color: rgb(0 0 0 / 70%);
    }
  }

  .acoes-confirmacao-sair {
    display: flex;
    justify-content: flex-end;
    gap: 0.5em;
  }

  .dispositivos-pareados {
    margin-top: 1em;

    h2 {
      margin-bottom: 0.5em;
    }
  }
</style>
