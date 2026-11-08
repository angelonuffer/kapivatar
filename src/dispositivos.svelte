<script module>
  export const metadados = {
    nome: "Dispositivos",
    url: "/dispositivos",
    ícone: "devices",
    ações: [{ nome: "Parear dispositivo", url: "/dispositivos/parear", ícone: "sync_alt" }],
  }
</script>

<script>
  let {
    arquivo_nome,
    nome_dispositivo,
    dispositivos_pareados,
    renomear_dispositivo,
    abrir_arquivo_sqlite,
    criar_arquivo_sqlite,
    sair,
  } = $props()
  let menu_aberto = $state(false)
  let nome_dispositivo_atual = $state("")
  let nome_novo = $state("")
  let erro_operacao = $state("")
  let dialogo_renomear
  let dialogo_abrir_arquivo
  let dialogo_criar_arquivo
  let dialogo_fechar_arquivo

  $effect(() => {
    nome_dispositivo_atual = nome_dispositivo
  })

  const executar_operacao = async (operacao, mensagem_erro) => {
    erro_operacao = ""
    try {
      await operacao()
      return true
    } catch (erro) {
      if (erro?.name === "AbortError") return false
      console.error(mensagem_erro, erro)
      erro_operacao = "Não foi possível concluir a operação. Tente novamente."
      return false
    }
  }

  const abrir_dialogo_renomear = () => {
    menu_aberto = false
    nome_novo = nome_dispositivo_atual
    erro_operacao = ""
    dialogo_renomear.showModal()
  }

  const confirmar_renomeacao = async (evento) => {
    evento.preventDefault()
    const nome = nome_novo.trim()
    if (!nome) {
      erro_operacao = "Informe um nome para o dispositivo."
      return
    }
    if (await executar_operacao(() => renomear_dispositivo(nome), "Erro ao renomear dispositivo:")) {
      nome_dispositivo_atual = nome
      dialogo_renomear.close()
    }
  }

  const abrir_dialogo_arquivo = (dialogo) => {
    menu_aberto = false
    erro_operacao = ""
    dialogo.showModal()
  }

  const confirmar_abrir_arquivo = async () => {
    if (await executar_operacao(abrir_arquivo_sqlite, "Erro ao abrir arquivo de dados:")) {
      dialogo_abrir_arquivo.close()
    }
  }

  const confirmar_criar_arquivo = async () => {
    if (await executar_operacao(criar_arquivo_sqlite, "Erro ao criar arquivo de dados:")) {
      dialogo_criar_arquivo.close()
    }
  }

  const confirmar_fechar_arquivo = async () => {
    if (await executar_operacao(sair, "Erro ao fechar arquivo de dados:")) {
      dialogo_fechar_arquivo.close()
    }
  }
</script>

<section class="dispositivo-local">
  <h2>Este dispositivo</h2>
  <ul class="dispositivos-lista">
    <li class="dispositivo-card">
      <h2>{nome_dispositivo_atual}</h2>
      <p class="dispositivo-arquivo">
        <span class="material-symbols-outlined" role="img" aria-label="Arquivo de dados">
          database
        </span>
        <strong>{arquivo_nome}</strong>
      </p>
      <button
        class="botao-menu-dispositivo"
        type="button"
        aria-label="Opções do dispositivo"
        aria-expanded={menu_aberto}
        aria-controls="menu-opcoes-dispositivo"
        onclick={() => (menu_aberto = !menu_aberto)}
      >
        <span class="material-symbols-outlined" aria-hidden="true">more_vert</span>
      </button>
      {#if menu_aberto}
        <div class="menu-opcoes-dispositivo" id="menu-opcoes-dispositivo">
          <button type="button" onclick={abrir_dialogo_renomear}>
            <span class="material-symbols-outlined" aria-hidden="true">edit</span>
            Renomear dispositivo
          </button>
          <button type="button" onclick={() => abrir_dialogo_arquivo(dialogo_abrir_arquivo)}>
            <span class="material-symbols-outlined" aria-hidden="true">folder_open</span>
            Abrir outro arquivo de dados
          </button>
          <button type="button" onclick={() => abrir_dialogo_arquivo(dialogo_criar_arquivo)}>
            <span class="material-symbols-outlined" aria-hidden="true">note_add</span>
            Criar arquivo de dados
          </button>
          <button type="button" onclick={() => abrir_dialogo_arquivo(dialogo_fechar_arquivo)}>
            <span class="material-symbols-outlined" aria-hidden="true">database_off</span>
            Fechar arquivo de dados
          </button>
        </div>
      {/if}
    </li>
  </ul>
</section>

<dialog bind:this={dialogo_renomear} aria-labelledby="titulo-renomear-dispositivo">
  <form onsubmit={confirmar_renomeacao}>
    <h2 id="titulo-renomear-dispositivo">Renomear dispositivo</h2>
    <label for="nome-dispositivo">Novo nome</label>
    <input id="nome-dispositivo" type="text" required bind:value={nome_novo} />
    {#if erro_operacao}
      <p class="erro-operacao" role="alert">{erro_operacao}</p>
    {/if}
    <div class="acoes-dialogo">
      <button type="button" onclick={() => dialogo_renomear.close()}>Cancelar</button>
      <button type="submit">Salvar</button>
    </div>
  </form>
</dialog>

<dialog bind:this={dialogo_abrir_arquivo} aria-labelledby="titulo-abrir-arquivo">
  <h2 id="titulo-abrir-arquivo">Abrir outro arquivo de dados?</h2>
  <p>O arquivo de dados atual será fechado quando você selecionar outro arquivo.</p>
  {#if erro_operacao}
    <p class="erro-operacao" role="alert">{erro_operacao}</p>
  {/if}
  <div class="acoes-dialogo">
    <button type="button" onclick={() => dialogo_abrir_arquivo.close()}>Cancelar</button>
    <button type="button" onclick={confirmar_abrir_arquivo}>Continuar</button>
  </div>
</dialog>

<dialog bind:this={dialogo_criar_arquivo} aria-labelledby="titulo-criar-arquivo">
  <h2 id="titulo-criar-arquivo">Criar arquivo de dados?</h2>
  <p>O arquivo de dados atual será fechado quando você criar o novo arquivo.</p>
  {#if erro_operacao}
    <p class="erro-operacao" role="alert">{erro_operacao}</p>
  {/if}
  <div class="acoes-dialogo">
    <button type="button" onclick={() => dialogo_criar_arquivo.close()}>Cancelar</button>
    <button type="button" onclick={confirmar_criar_arquivo}>Continuar</button>
  </div>
</dialog>

<dialog bind:this={dialogo_fechar_arquivo} aria-labelledby="titulo-fechar-arquivo">
  <h2 id="titulo-fechar-arquivo">Fechar arquivo de dados?</h2>
  <p>O arquivo será fechado. Para voltar a usar o Kapivatar, você precisará abri-lo novamente.</p>
  {#if erro_operacao}
    <p class="erro-operacao" role="alert">{erro_operacao}</p>
  {/if}
  <div class="acoes-dialogo">
    <button type="button" onclick={() => dialogo_fechar_arquivo.close()}>Cancelar</button>
    <button type="button" onclick={confirmar_fechar_arquivo}>Fechar arquivo</button>
  </div>
</dialog>

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

  .botao-menu-dispositivo {
    position: absolute;
    top: 1em;
    right: 1em;
    padding: 0.5em;
  }

  .menu-opcoes-dispositivo {
    position: absolute;
    z-index: 1;
    top: 3.5em;
    right: 1em;
    display: grid;
    min-width: max-content;
    padding: 0.4em;
    border-radius: 0.5em;
    background-color: #222;
    box-shadow: 0 0.25em 0.75em rgb(0 0 0 / 40%);

    button {
      display: flex;
      align-items: center;
      gap: 0.5em;
      padding: 0.6em 0.75em;
      border: 0;
      background: transparent;
      color: inherit;
      text-align: left;
      white-space: nowrap;
      cursor: pointer;

      &:hover,
      &:focus-visible {
        background-color: #444;
      }
    }
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

  .acoes-dialogo {
    display: flex;
    justify-content: flex-end;
    gap: 0.5em;
  }

  .erro-operacao {
    color: #ff9a9a;
  }

  .dispositivos-pareados {
    margin-top: 1em;

    h2 {
      margin-bottom: 0.5em;
    }
  }
</style>
