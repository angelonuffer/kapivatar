<script>
  let { registros, somente_arquivados, ao_arquivar } = $props()
  let menu_aberto = $state(null)

  const alternar_menu = (evento, id) => {
    evento.stopPropagation()
    menu_aberto = menu_aberto === id ? null : id
  }
</script>

<svelte:window onclick={() => menu_aberto = null} />

{#if !registros.length}
  <p>{somente_arquivados ? "Nenhum assobio arquivado." : "Nenhum assobio encontrado."}</p>
{:else}
  <ul class="assobios-lista">
    {#each registros as registro (registro.id)}
      <li class="assobio-card">
        <a href={`/assobio/${registro.id}`} class="assobio-card-titulo">
          {registro.perfil_nome} — {registro.data}
        </a>
        <p class="assobio-card-nota">{registro.nota}</p>
        <div class="assobio-menu-container">
          <button
            type="button"
            class="assobio-menu-botao"
            aria-label={`Ações para ${registro.perfil_nome} — ${registro.data}`}
            aria-expanded={menu_aberto === registro.id}
            onclick={(evento) => alternar_menu(evento, registro.id)}
          >
            <span class="material-symbols-outlined" aria-hidden="true">more_vert</span>
          </button>
          <div class="assobio-menu-dropdown" class:aberto={menu_aberto === registro.id}>
            <button
              type="button"
              class="assobio-menu-item"
              onclick={() => ao_arquivar(registro.id, !somente_arquivados)}
            >
              <span class="material-symbols-outlined" aria-hidden="true">
                {somente_arquivados ? "unarchive" : "archive"}
              </span>
              <span>{somente_arquivados ? "Restaurar" : "Arquivar"}</span>
            </button>
          </div>
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .assobios-lista {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
    gap: 1em;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .assobio-card {
    position: relative;
    min-width: 0;
    padding: 1em;
    border: 1px solid #444;
    border-radius: 1em;
    background: linear-gradient(145deg, #353535, #292929);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .assobio-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
  }

  .assobio-card-titulo {
    display: block;
    padding: 0.5em 2.5em 0.5em 0;
    color: #f0d7b8;
    font-size: 1.05em;
    font-weight: 600;
  }

  .assobio-card-nota {
    margin: 0.75em 0 0;
    color: #ccc;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .assobio-menu-container {
    position: absolute;
    top: 0.75em;
    right: 0.75em;
    z-index: 5;
  }

  .assobio-menu-botao {
    width: 36px;
    height: 36px;
    padding: 0;
    justify-content: center;
    border-radius: 50%;
    background: #444;
  }

  .assobio-menu-botao:hover {
    background: #555;
  }

  .assobio-menu-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 10;
    display: none;
    min-width: 160px;
    overflow: hidden;
    border-radius: 0.5em;
    background-color: #444;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .assobio-menu-dropdown.aberto {
    display: block;
  }

  .assobio-menu-item {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: flex-start;
    gap: 0.8em;
    padding: 0.8em 1em;
    border: none;
    border-radius: 0;
    background: none;
    color: #eee;
    font-size: 0.9em;
    text-align: left;
  }

  .assobio-menu-item:hover {
    background-color: #555;
  }
</style>
