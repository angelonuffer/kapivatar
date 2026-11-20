<script>
  import { onDestroy, onMount } from "svelte"
  import Assobios from "./assobios.svelte"

  let {
    modo,
    dados = {},
    imagem_capa = null,
    imagem_foto = null,
    hash_perfil_atual,
    id,
    diretorio,
    gerar_hash,
    escrever_arquivo,
    navegar,
    historico = [],
    registros_assobios = [],
    registros_assobios_arquivados = [],
    ao_publicar_assobio,
    ao_arquivar_assobio,
    ao_salvar_foto,
    ao_restaurar_foto,
    registrar_foto_perfil,
    fotos_perfil = [],
  } = $props()

  let previews = $state({ capa: "", foto: "" })
  let salvando = $state(false)
  let novo_assobio = $state("")
  let atributos_assobio = $state([])
  let arquivo_imagem_assobio = $state(null)
  let preview_imagem_assobio = $state("")
  let menu_tipo_atributo_aberto = $state(null)
  let salvando_assobio = $state(false)
  let mostrar_assobios_arquivados = $state(false)
  let erro_assobio = $state("")
  let mensagem_erro = $state("")
  let input_imagem_assobio = $state()
  let input_galeria_assobio = $state()
  let arquivo_foto_nova = $state(null)
  let preview_foto_nova = $state("")
  let input_foto_perfil = $state()
  const urls_preview = new Set()
  const tipos_atributo = [
    { valor: "texto", nome: "Texto", icone: "text_fields" },
    { valor: "numero", nome: "Número", icone: "numbers" },
    { valor: "logico", nome: "Lógico", icone: "toggle_on" },
  ]

  const criar_preview = (arquivo) => {
    const url = URL.createObjectURL(arquivo)
    urls_preview.add(url)
    return url
  }

  const remover_preview = (url) => {
    if (!url) return
    URL.revokeObjectURL(url)
    urls_preview.delete(url)
  }

  onMount(() => {
    if (imagem_capa) previews.capa = criar_preview(imagem_capa)
    if (imagem_foto) previews.foto = criar_preview(imagem_foto)
    document.addEventListener("pointerdown", fechar_menu_tipo_atributo)
  })

  onDestroy(() => {
    document.removeEventListener("pointerdown", fechar_menu_tipo_atributo)
    for (const url of urls_preview) URL.revokeObjectURL(url)
    for (const foto of fotos_perfil) {
      if (foto.url) URL.revokeObjectURL(foto.url)
    }
  })

  const fechar_menu_tipo_atributo = (event) => {
    if (!event.target.closest(".seletor-tipo-atributo")) {
      menu_tipo_atributo_aberto = null
    }
  }

  const atualizar_preview = (campo, event) => {
    remover_preview(previews[campo])
    const arquivo = event.currentTarget.files?.[0]
    previews[campo] = arquivo ? criar_preview(arquivo) : ""
  }

  const publicar_assobio = async (event) => {
    event.preventDefault()
    const nota = novo_assobio.trim()
    if (!nota && !arquivo_imagem_assobio && !atributos_assobio.length) return

    salvando_assobio = true
    erro_assobio = ""
    try {
      const atributos = atributos_assobio.map(({ nome, tipo, valor }) => ({
        nome: nome.trim(),
        tipo,
        valor: tipo === "numero" ? Number(valor) : tipo === "logico" ? valor === "true" : valor,
      }))
      await ao_publicar_assobio(nota, arquivo_imagem_assobio, atributos)
      novo_assobio = ""
      atributos_assobio = []
      arquivo_imagem_assobio = null
      remover_preview(preview_imagem_assobio)
      preview_imagem_assobio = ""
      if (input_imagem_assobio) input_imagem_assobio.value = ""
      if (input_galeria_assobio) input_galeria_assobio.value = ""
    } catch (erro) {
      console.error("Erro ao publicar assobio:", erro)
      erro_assobio = "Não foi possível publicar o assobio. Tente novamente."
    } finally {
      salvando_assobio = false
    }
  }

  const selecionar_imagem_assobio = (event) => {
    const arquivo = event.currentTarget.files?.[0]
    if (!arquivo) return
    remover_preview(preview_imagem_assobio)
    arquivo_imagem_assobio = arquivo
    preview_imagem_assobio = criar_preview(arquivo)
  }

  const adicionar_atributo_assobio = () => {
    atributos_assobio.push({
      id: crypto.randomUUID(),
      nome: "",
      tipo: "texto",
      valor: "",
    })
  }

  const selecionar_tipo_atributo = (atributo, tipo) => {
    if (atributo.tipo !== tipo.valor) atributo.valor = ""
    atributo.tipo = tipo.valor
    menu_tipo_atributo_aberto = null
  }

  const selecionar_foto_perfil = (event) => {
    const arquivo = event.currentTarget.files?.[0]
    if (!arquivo) return
    remover_preview(preview_foto_nova)
    arquivo_foto_nova = arquivo
    preview_foto_nova = criar_preview(arquivo)
  }

  const salvar_foto_perfil = async (event) => {
    event.preventDefault()
    if (!arquivo_foto_nova || !ao_salvar_foto) return
    salvando = true
    mensagem_erro = ""
    try {
      await ao_salvar_foto(arquivo_foto_nova)
      navegar("/perfil")
    } catch (erro) {
      console.error("Erro ao editar foto de perfil:", erro)
      mensagem_erro = "Não foi possível salvar a foto de perfil. Tente novamente."
      salvando = false
    }
  }

  const restaurar_foto_perfil = async (blob) => {
    if (!ao_restaurar_foto) return
    salvando = true
    mensagem_erro = ""
    try {
      await ao_restaurar_foto(blob)
      navegar("/perfil")
    } catch (erro) {
      console.error("Erro ao restaurar foto de perfil:", erro)
      mensagem_erro = "Não foi possível restaurar a foto de perfil. Tente novamente."
      salvando = false
    }
  }

  const salvar = async (event) => {
    event.preventDefault()
    salvando = true
    mensagem_erro = ""
    const form_data = new FormData(event.currentTarget)

    try {
      const dados_novos = {
        ...dados,
        nome: form_data.get("nome"),
        bio: form_data.get("bio"),
        anterior: hash_perfil_atual,
        data: new Date().toISOString(),
      }

      const salvar_imagem = async (campo, hash_antigo) => {
        const arquivo = form_data.get(campo)
        if (arquivo instanceof File && arquivo.name) {
          const buffer = await arquivo.arrayBuffer()
          const hash = await gerar_hash(buffer)
          await escrever_arquivo(diretorio, hash, buffer)
          if (campo === "foto" && registrar_foto_perfil) {
            await registrar_foto_perfil(buffer)
          }
          return hash
        }
        return hash_antigo
      }

      dados_novos.capa = await salvar_imagem("capa", dados.capa)
      dados_novos.foto = await salvar_imagem("foto", dados.foto)

      const conteudo_perfil = JSON.stringify(dados_novos)
      const hash_perfil_novo = await gerar_hash(conteudo_perfil)
      await escrever_arquivo(diretorio, hash_perfil_novo, conteudo_perfil)
      await escrever_arquivo(diretorio, id, hash_perfil_novo)

      navegar("/perfil")
    } catch (erro) {
      console.error("Erro ao editar perfil:", erro)
      mensagem_erro = "Não foi possível salvar as alterações do perfil. Tente novamente."
      salvando = false
    }
  }
</script>

{#if modo === "visualizar" || modo === "assobiar"}
  {#if modo === "visualizar"}
    <div class="perfil-detalhe">
      {#if previews.capa || imagem_capa}
        <img class="perfil-capa-detalhe" src={previews.capa} alt={`Capa de ${dados.nome}`} />
      {/if}
      <div class="perfil-info-detalhe">
        <div class="foto-perfil-container">
          {#if previews.foto || imagem_foto}
            <img
              class="perfil-foto-detalhe"
              src={previews.foto}
              alt={`Foto de ${dados.nome}`}
              style:margin-top={dados.capa ? "-50px" : "0"}
            />
          {:else}
            <div class="perfil-foto-sem-foto" aria-label={`Foto de ${dados.nome} não registrada`}>
              <span class="material-symbols-outlined" aria-hidden="true">person</span>
            </div>
          {/if}
          {#if navegar}
            <button
              type="button"
              class="editar-foto-perfil"
              aria-label="Alterar foto de perfil"
              title="Alterar foto de perfil"
              onclick={() => navegar("/perfil/foto/editar")}
            >
              <span class="material-symbols-outlined" aria-hidden="true">edit</span>
            </button>
          {/if}
        </div>
        <h2>{dados.nome}</h2>
        <p>{dados.bio}</p>
      </div>
    </div>
  {/if}
  {#if modo === "assobiar"}
  <form class="form-perfil form-assobio" onsubmit={publicar_assobio}>
    <div class="form-campo">
      <div class="campo-nota-container">
        <textarea id="novo-assobio" bind:value={novo_assobio}></textarea>
        <div class="acoes-assobio">
          <button
            type="button"
            class="botao-acao-assobio"
            onclick={() => input_imagem_assobio.click()}
          >
            <span class="material-symbols-outlined" aria-hidden="true">photo_camera</span>
            <span>Tirar foto</span>
          </button>
          <button
            type="button"
            class="botao-acao-assobio"
            onclick={() => input_galeria_assobio.click()}
          >
            <span class="material-symbols-outlined" aria-hidden="true">photo_library</span>
            <span>Escolher da galeria</span>
          </button>
          <button
            type="button"
            class="botao-acao-assobio"
            onclick={adicionar_atributo_assobio}
          >
            <span class="material-symbols-outlined" aria-hidden="true">label</span>
            <span>Atributo</span>
          </button>
          <input
            bind:this={input_imagem_assobio}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onchange={selecionar_imagem_assobio}
          />
          <input
            bind:this={input_galeria_assobio}
            type="file"
            accept="image/*"
            hidden
            onchange={selecionar_imagem_assobio}
          />
        </div>
      </div>
      {#if preview_imagem_assobio}
        <img
          class="preview-imagem-assobio"
          src={preview_imagem_assobio}
          alt="Pré-visualização da foto do assobio"
        />
      {/if}
      {#if atributos_assobio.length}
        <div class="atributos-assobio">
          {#each atributos_assobio as atributo (atributo.id)}
            <div class="linha-atributo-assobio">
              <input
                type="text"
                class="nome-atributo-assobio"
                aria-label="Nome do atributo"
                placeholder="Nome"
                bind:value={atributo.nome}
                required
              />
              <div class="valor-atributo-assobio">
                {#if atributo.tipo === "logico"}
                  <select aria-label="Valor do atributo" bind:value={atributo.valor} required>
                    <option value="">Selecione</option>
                    <option value="true">Verdadeiro</option>
                    <option value="false">Falso</option>
                  </select>
                {:else}
                  <input
                    type={atributo.tipo === "numero" ? "number" : "text"}
                    aria-label="Valor do atributo"
                    placeholder="Valor"
                    bind:value={atributo.valor}
                    required
                  />
                {/if}
                <div class="seletor-tipo-atributo">
                  <button
                    type="button"
                    class="botao-tipo-atributo"
                    aria-label={`Tipo do atributo: ${tipos_atributo.find(tipo => tipo.valor === atributo.tipo).nome}`}
                    title={tipos_atributo.find(tipo => tipo.valor === atributo.tipo).nome}
                    aria-expanded={menu_tipo_atributo_aberto === atributo.id}
                    onclick={() => menu_tipo_atributo_aberto = menu_tipo_atributo_aberto === atributo.id
                      ? null
                      : atributo.id}
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">
                      {tipos_atributo.find(tipo => tipo.valor === atributo.tipo).icone}
                    </span>
                  </button>
                  {#if menu_tipo_atributo_aberto === atributo.id}
                    <div class="menu-tipos-atributo">
                      {#each tipos_atributo as tipo (tipo.valor)}
                        <button
                          type="button"
                          class="opcao-tipo-atributo"
                          aria-label={tipo.nome}
                          aria-pressed={atributo.tipo === tipo.valor}
                          onclick={() => selecionar_tipo_atributo(atributo, tipo)}
                        >
                          <span class="material-symbols-outlined" aria-hidden="true">{tipo.icone}</span>
                          <span>{tipo.nome}</span>
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
              <button
                type="button"
                class="remover-atributo-assobio"
                aria-label="Remover atributo"
                onclick={() => atributos_assobio = atributos_assobio.filter(item => item.id !== atributo.id)}
              >
                <span class="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
          {/each}
        </div>
      {/if}
      <button
        type="submit"
        class="botao-publicar-assobio"
        disabled={salvando_assobio}
      >
        <span class="material-symbols-outlined" aria-hidden="true">send</span>
        <span>{salvando_assobio ? "Publicando..." : "Publicar assobio"}</span>
      </button>
    </div>
    {#if erro_assobio}
      <p role="alert">{erro_assobio}</p>
    {/if}
  </form>
  {/if}
  {#if modo === "visualizar"}
    <section class="secao-assobios-perfil">
      <div class="cabecalho-assobios-perfil">
        <h3>{mostrar_assobios_arquivados ? "Assobios arquivados" : "Assobios"}</h3>
        <button
          type="button"
          onclick={() => mostrar_assobios_arquivados = !mostrar_assobios_arquivados}
        >
          {mostrar_assobios_arquivados ? "Ver assobios" : "Ver arquivados"}
        </button>
      </div>
      <Assobios
        registros={mostrar_assobios_arquivados ? registros_assobios_arquivados : registros_assobios}
        somente_arquivados={mostrar_assobios_arquivados}
        ao_arquivar={ao_arquivar_assobio}
      />
    </section>
  {/if}
{:else if modo === "editar_foto"}
  <form class="form-perfil editar-foto-perfil-form" onsubmit={salvar_foto_perfil}>
    <h2>Editar foto de perfil</h2>
    <div class="form-campo">
      <label for="foto-perfil-nova">Selecionar foto do dispositivo</label>
      <input
        bind:this={input_foto_perfil}
        type="file"
        id="foto-perfil-nova"
        accept="image/*"
        hidden
        onchange={selecionar_foto_perfil}
      />
      <button type="button" onclick={() => input_foto_perfil.click()}>
        <span class="material-symbols-outlined" aria-hidden="true">photo_library</span>
        <span>Escolher foto</span>
      </button>
      {#if preview_foto_nova}
        <div class="preview-container">
          <img class="preview-imagem" src={preview_foto_nova} alt="Prévia da nova foto de perfil" />
        </div>
      {/if}
    </div>
    <button type="submit" disabled={salvando || !arquivo_foto_nova}>
      <span class="material-symbols-outlined" aria-hidden="true">save</span>
      <span>{salvando ? "Salvando..." : "Salvar foto"}</span>
    </button>
    {#if mensagem_erro}
      <p role="alert">{mensagem_erro}</p>
    {/if}
  </form>

  <section class="historico-fotos-perfil">
    <h3>Fotos anteriores</h3>
    {#if fotos_perfil.length}
      <div class="lista-fotos-perfil">
        {#each fotos_perfil as foto (foto.data)}
          <div class="foto-perfil-historico">
            <img src={foto.url} alt={`Foto anterior de ${new Date(foto.data).toLocaleString()}`} />
            <time datetime={foto.data}>{new Date(foto.data).toLocaleString()}</time>
            <button
              type="button"
              disabled={salvando}
              onclick={() => restaurar_foto_perfil(foto.blob)}
            >
              <span class="material-symbols-outlined" aria-hidden="true">restore</span>
              <span>Restaurar</span>
            </button>
          </div>
        {/each}
      </div>
    {:else}
      <p>Nenhuma foto anterior encontrada.</p>
    {/if}
  </section>
{:else if modo === "editar"}
  <form class="form-perfil" onsubmit={salvar}>
    {#each [{ campo: "capa", label: "Capa", arquivo: imagem_capa }] as imagem}
      <div class="form-campo">
        <label for={imagem.campo}>{imagem.label}</label>
        <div class="input-arquivo-container">
          <input
            type="file"
            id={imagem.campo}
            name={imagem.campo}
            accept="image/*"
            hidden
            onchange={(event) => atualizar_preview(imagem.campo, event)}
          />
          <button type="button" onclick={() => document.getElementById(imagem.campo).click()}>
            <span class="material-symbols-outlined">upload_file</span>
            <span>Escolher imagem</span>
          </button>
          {#if previews[imagem.campo] || imagem.arquivo}
            <div class="preview-container">
              <img
                class="preview-imagem"
                src={previews[imagem.campo]}
                alt={`Prévia de ${imagem.label.toLowerCase()}`}
              />
            </div>
          {/if}
        </div>
      </div>
    {/each}

    <div class="form-campo">
      <label for="nome">Nome</label>
      <input id="nome" name="nome" type="text" value={dados.nome || ""} required />
    </div>

    <div class="form-campo">
      <label for="bio">Bio</label>
      <textarea id="bio" name="bio">{dados.bio || ""}</textarea>
    </div>

    <button type="submit" disabled={salvando}>
      <span class="material-symbols-outlined">save</span>
      <span>{salvando ? "Salvando..." : "Salvar Alterações"}</span>
    </button>
    {#if mensagem_erro}
      <p role="alert">{mensagem_erro}</p>
    {/if}
  </form>
{:else if modo === "historico"}
  {#if historico.length}
    <div class="historico" style="margin-top: 0; border-top: none;">
      <ul>
        {#each historico as versao}
          <li><a href={`/perfil?v=${versao.hash}`}>{versao.data}</a></li>
        {/each}
      </ul>
    </div>
  {:else}
    <p>Nenhum histórico encontrado.</p>
  {/if}
{/if}

<style>
  .cabecalho-assobios-perfil {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1em;
    margin: 1.5em 0 1em;
  }

  .cabecalho-assobios-perfil h3 {
    margin: 0;
  }

  .acoes-assobio {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    margin-top: 0.5em;
  }

  .botao-acao-assobio,
  .botao-publicar-assobio {
    box-sizing: border-box;
    width: 100%;
    justify-content: flex-start;
  }

  .atributos-assobio {
    box-sizing: border-box;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    margin-top: 0.75em;
  }

  .linha-atributo-assobio {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    width: 100%;
  }

  .form-assobio {
    box-sizing: border-box;
    width: 100%;
    max-width: none;
    margin: 0;
  }

  .nome-atributo-assobio {
    box-sizing: border-box;
    width: 100%;
  }

  .valor-atributo-assobio {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 2.5em;
    gap: 0.35em;
    width: 100%;
    min-width: 0;
  }

  .seletor-tipo-atributo {
    position: relative;
  }

  .botao-tipo-atributo {
    width: 100%;
    height: 100%;
    justify-content: center;
    padding: 0.25em;
  }

  .menu-tipos-atributo {
    position: absolute;
    right: 0;
    bottom: calc(100% + 0.35em);
    z-index: 10;
    min-width: max-content;
    overflow: hidden;
    border-radius: 0.5em;
    background: #444;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .opcao-tipo-atributo {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: flex-start;
    gap: 0.6em;
    border-radius: 0;
    background: none;
    text-align: left;
  }

  .opcao-tipo-atributo:hover,
  .opcao-tipo-atributo[aria-pressed="true"] {
    background: #555;
  }

  .remover-atributo-assobio {
    align-self: flex-end;
    padding: 0.3em;
  }

  .preview-imagem-assobio {
    display: block;
    max-width: 100%;
    max-height: 240px;
    margin-top: 0.5em;
    object-fit: contain;
  }

  .botao-publicar-assobio {
    justify-content: center;
  }

  .foto-perfil-container {
    position: relative;
    display: inline-block;
  }

  .perfil-foto-sem-foto {
    display: flex;
    width: 100px;
    height: 100px;
    align-items: center;
    justify-content: center;
    border: 4px solid white;
    border-radius: 50%;
    background: #444;
  }

  .perfil-foto-sem-foto .material-symbols-outlined {
    font-size: 48px;
  }

  .editar-foto-perfil {
    position: absolute;
    right: 0.1em;
    bottom: 0.1em;
    width: 2.25em;
    height: 2.25em;
    padding: 0;
    justify-content: center;
    border-radius: 50%;
  }

  .editar-foto-perfil-form {
    margin-bottom: 2em;
  }

  .historico-fotos-perfil {
    max-width: 600px;
    margin: 0 auto;
  }

  .lista-fotos-perfil {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1em;
  }

  .foto-perfil-historico {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  .foto-perfil-historico img {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 0.5em;
    object-fit: cover;
  }

  .foto-perfil-historico time {
    min-height: 2.5em;
  }
</style>
