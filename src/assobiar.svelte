<script>
  import { onDestroy } from "svelte"

  let { perfis, perfil_selecionado, registro, imagem_existente, descrever_imagem, ao_salvar } = $props()

  const obter_valores_iniciais = () => {
    const data_registro = registro?.dados.data
    const data_atual = new Date()
    data_atual.setMinutes(data_atual.getMinutes() - data_atual.getTimezoneOffset())
    return {
      perfil: registro?.dados.perfil ??
        (perfis.some(item => item.id === perfil_selecionado) ? perfil_selecionado : perfis[0]?.id ?? ""),
      data: data_registro
        ? /^\d{4}-\d{2}-\d{2}$/.test(data_registro) ? `${data_registro}T00:00` : data_registro.slice(0, 16)
        : data_atual.toISOString().slice(0, 16),
      nota: registro?.dados.nota || "",
      imagem_atual: imagem_existente,
    }
  }
  const valores_iniciais = obter_valores_iniciais()
  let perfil = $state(valores_iniciais.perfil)
  let data = $state(valores_iniciais.data)
  let nota = $state(valores_iniciais.nota)
  let arquivo_selecionado = $state(null)
  let imagem_atual = $state(valores_iniciais.imagem_atual)
  let preview_url = $state(valores_iniciais.imagem_atual ? URL.createObjectURL(valores_iniciais.imagem_atual) : "")
  let nome_arquivo = $state("")
  let status_descricao = $state("")
  let gerando_descricao = $state(false)
  let salvando = $state(false)
  let input_imagem
  let input_nota

  const atualizar_validade_nota = () => {
    const tem_imagem = Boolean(arquivo_selecionado || imagem_existente)
    input_nota.setCustomValidity(!input_nota.value.trim() && !tem_imagem
      ? "Informe uma nota ou anexe uma imagem."
      : "")
  }

  const selecionar_imagem = (evento) => {
    const arquivo = evento.currentTarget.files?.[0]
    if (!arquivo) return
    arquivo_selecionado = arquivo
    imagem_atual = arquivo
    if (preview_url) URL.revokeObjectURL(preview_url)
    preview_url = URL.createObjectURL(arquivo)
    nome_arquivo = arquivo.name
    atualizar_validade_nota()
  }

  const gerar_descricao = async () => {
    if (!imagem_atual) return
    gerando_descricao = true
    status_descricao = "Preparando os modelos locais…"
    try {
      nota = await descrever_imagem(imagem_atual, mensagem => status_descricao = mensagem)
      input_nota.value = nota
      atualizar_validade_nota()
      status_descricao = "Postagem gerada com IA local e adicionada à nota."
    } catch (erro) {
      console.error("Erro ao gerar descrição da imagem:", erro)
      status_descricao = "Não foi possível gerar a descrição. Tente novamente."
    } finally {
      gerando_descricao = false
    }
  }

  const enviar = async (evento) => {
    evento.preventDefault()
    atualizar_validade_nota()
    if (!input_nota.validity.valid) {
      input_nota.reportValidity()
      return
    }
    salvando = true
    try {
      await ao_salvar({
        perfil,
        perfil_nome: perfis.find(item => item.id === perfil).nome,
        data,
        nota,
        arquivo_imagem: arquivo_selecionado,
      })
    } catch (erro) {
      console.error("Erro ao salvar assobio:", erro)
      salvando = false
    }
  }

  onDestroy(() => {
    if (preview_url) URL.revokeObjectURL(preview_url)
  })
</script>

<form class="form-perfil form-assobio" onsubmit={enviar}>
  <div class="form-campo">
    <label for="perfil">Perfil</label>
    <select id="perfil" name="perfil" bind:value={perfil} required>
      {#each perfis as item (item.id)}
        <option value={item.id}>{item.nome}</option>
      {/each}
    </select>
  </div>

  <div class="form-campo">
    <label for="data">Data</label>
    <input id="data" name="data" type="datetime-local" bind:value={data} required />
  </div>

  <div class="form-campo">
    <label for="imagem">Imagem</label>
    <div class="input-arquivo-container">
      <input
        bind:this={input_imagem}
        id="imagem"
        name="imagem"
        type="file"
        accept="image/*"
        style="display: none"
        onchange={selecionar_imagem}
      />
      <button type="button" onclick={() => input_imagem.click()}>Escolher imagem</button>
      {#if preview_url}
        <div class="preview-container">
          <img class="preview-imagem" src={preview_url} alt="Pré-visualização da imagem do assobio" />
          <span class="nome-arquivo">{nome_arquivo}</span>
        </div>
      {/if}
    </div>
  </div>

  <div class="form-campo">
    <label for="nota">Nota</label>
    <div class="campo-nota-container">
      <textarea
        bind:this={input_nota}
        id="nota"
        name="nota"
        bind:value={nota}
        oninput={atualizar_validade_nota}
      ></textarea>
      {#if imagem_atual}
        <button
          type="button"
          class="botao-descricao-imagem"
          aria-label="Gerar postagem com a imagem"
          title="Gerar postagem com a imagem"
          disabled={gerando_descricao}
          onclick={gerar_descricao}
        >
          <span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
        </button>
      {/if}
    </div>
    <span class="status-descricao-imagem" aria-live="polite">{status_descricao}</span>
  </div>

  <button type="submit" disabled={salvando}>Salvar Assobio</button>
</form>
