<script>
  import BaseLogin from "../../../base-login.svelte"
  import CriarPerfil from "../../../criar-perfil.svelte"
  import * as aplicativo from "../../../kapivatar.js"
  import { goto } from "$app/navigation"

</script>

<svelte:head>
  <title>Criar perfil · Kapivatar</title>
</svelte:head>

<BaseLogin>
  <div class="login-acao-cabecalho">
    <button
      class="botao-voltar-login"
      type="button"
      aria-label="Voltar"
      onclick={() => goto("/")}
    >
      <span class="material-symbols-outlined">arrow_back</span>
    </button>
    <p>Criar perfil</p>
  </div>
  <div class="login-acao-conteudo">
    <CriarPerfil
      criar_arquivo_perfil={aplicativo.criar_arquivo_perfil}
      obter_diretorio={aplicativo.obter_diretorio}
      gerar_chaves={aplicativo.gerar_chaves}
      exportar_chave={aplicativo.exportar_chave}
      gerar_id_perfil={aplicativo.gerar_id_perfil}
      gerar_hash={aplicativo.gerar_hash}
      escrever_arquivo={aplicativo.escrever_arquivo}
      ler_arquivo={aplicativo.ler_arquivo}
      gravar_dado_sqlite={aplicativo.gravar_dado_sqlite}
      obter_dispositivo_local={aplicativo.obter_dispositivo_local}
      carregar_dispositivos_pareados={aplicativo.carregar_dispositivos_pareados}
      navegar={(url) => goto(url)}
    />
  </div>
</BaseLogin>
