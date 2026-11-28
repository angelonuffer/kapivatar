<script>
  import * as aplicativo from "../../kapivatar.js"
  import { goto } from "$app/navigation"

  let erro_selecao = $state("")

  const navegar = (url) => goto(url)

  const escolher_arquivo = async () => {
    erro_selecao = ""
    try {
      await aplicativo.abrir_perfil()
      await navegar("/")
    } catch (erro) {
      if (erro?.name !== "AbortError") {
        console.error("Erro ao selecionar o arquivo de dados:", erro)
        erro_selecao = "Não foi possível acessar o arquivo selecionado. Tente novamente."
      }
    }
  }
</script>

<svelte:head>
  <title>Início · Kapivatar</title>
</svelte:head>

<p>Entrar no Kapivatar</p>
<button class="botao-login-secundario" onclick={() => navegar("/perfil/criar")}>
  <span class="material-symbols-outlined">person_add</span>
  <span>Criar perfil</span>
</button>
<button class="botao-login-secundario" onclick={escolher_arquivo}>
  <span class="material-symbols-outlined">person</span>
  <span>Abrir perfil</span>
</button>
<button class="botao-login-secundario" onclick={() => navegar("/dispositivos/parear/receber")}>
  <span class="material-symbols-outlined">devices</span>
  <span>Perfil de outro dispositivo</span>
</button>
{#if erro_selecao}
  <p role="alert">{erro_selecao}</p>
{/if}
