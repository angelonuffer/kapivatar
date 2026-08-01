# Integração com Kapivatar (Autenticação Local)

O Kapivatar fornece um mecanismo local e descentralizado de autenticação e persistência de dados sandboxed para outros aplicativos web (webapps). Através deste fluxo, o seu webapp pode se integrar ao Kapivatar usando uma janela pop-up (semelhante ao OAuth 2.0) e receber um handle de sistema de arquivos local (`FileSystemDirectoryHandle`) exclusivo para o seu domínio (origem).

---

## Como Funciona

1. **Iframe de Perfil:** O seu webapp incorpora um iframe apontando para o endpoint `/perfil_autenticado` do Kapivatar.
2. **Exibição do Estado:**
   - Se o usuário **está autenticado** e o seu webapp **já foi autorizado**, o iframe exibe a foto do perfil ativo do usuário e envia imediatamente um `postMessage` contendo o handle do subdiretório.
   - Se o usuário **não tem autorização** ou **não está logado**, o iframe exibe um ícone genérico de perfil.
3. **Fluxo de Autorização:**
   - Ao clicar no iframe, uma janela popup (`window.open`) abre o endpoint `/autenticar` do Kapivatar, passando o parâmetro `origin` da sua aplicação.
   - O usuário visualiza uma tela de consentimento local contendo as informações do perfil ativo e o domínio solicitante.
   - Ao clicar em "Autorizar", o Kapivatar cria um subdiretório sandboxed nomeado pelo hash SHA-256 da origem solicitante dentro da pasta de dados do Kapivatar.
   - O popup notifica o iframe e se fecha automaticamente. O iframe do Kapivatar então recarrega seu estado, exibe a foto do perfil e envia o `FileSystemDirectoryHandle` do subdiretório para a sua aplicação via `postMessage`.

---

## Passo 1: Incorporar o Iframe no seu Webapp

Adicione o seguinte elemento iframe na interface do seu webapp:

```html
<iframe
  id="kapivatar-iframe"
  src="http://localhost:3000/perfil_autenticado?origin=http%3A%2F%2Fmeu-webapp.com"
  style="width: 54px; height: 54px; border: none; overflow: hidden; background: transparent;"
  scrolling="no">
</iframe>
```

> **Nota:** Certifique-se de passar o parâmetro `origin` no formato URL-encoded correspondente à origem exata do seu webapp.

---

## Passo 2: Ouvir a Mensagem de Autorização (`postMessage`)

Quando o iframe do Kapivatar carrega e valida que a autorização foi concedida, ele envia um objeto `FileSystemDirectoryHandle` para o window pai.

Adicione o seguinte listener JavaScript no seu webapp:

```javascript
let diretorioSandbox = null;

window.addEventListener("message", async (event) => {
  // Opcional: Valide a origem do Kapivatar por segurança
  if (event.origin !== "http://localhost:3000") return;

  // O handle de diretório é retornado diretamente
  const handle = event.data;

  if (handle && handle.kind === "directory") {
    diretorioSandbox = handle;
    console.log("Conectado ao Kapivatar! Recebemos o diretório sandbox:", handle.name);

    // Agora você pode ler/gravar arquivos no seu sandbox exclusivo!
    await inicializarAppComDados();
  }
});
```

---

## Passo 3: Utilizar o Sistema de Arquivos (File System Access API)

Com o `FileSystemDirectoryHandle` recebido, o seu aplicativo tem controle total de leitura e escrita sobre uma pasta exclusiva no computador do usuário, gerenciada de forma segura e local.

Abaixo estão exemplos práticos de como interagir com o seu diretório sandbox:

### Escrever um Arquivo de Configuração/Estado

```javascript
async function salvarDadosUsuario(dados) {
  if (!diretorioSandbox) return;

  try {
    // Obtém (ou cria se não existir) o arquivo de preferências
    const fileHandle = await diretorioSandbox.getFileHandle("preferencias.json", { create: true });

    // Abre um fluxo de escrita (writable stream)
    const writable = await fileHandle.createWritable();

    // Grava os dados em formato JSON
    await writable.write(JSON.stringify(dados));

    // Fecha o fluxo para salvar fisicamente
    await writable.close();
    console.log("Preferências salvas com sucesso!");
  } catch (error) {
    console.error("Erro ao salvar arquivo localmente:", error);
  }
}
```

### Ler um Arquivo Salvo

```javascript
async function carregarDadosUsuario() {
  if (!diretorioSandbox) return null;

  try {
    // Obtém o arquivo
    const fileHandle = await diretorioSandbox.getFileHandle("preferencias.json");
    const file = await fileHandle.getFile();

    // Lê o conteúdo de texto e converte para JSON
    const conteudo = await file.text();
    return JSON.parse(conteudo);
  } catch (error) {
    if (error.name === "NotFoundError") {
      console.log("Nenhum arquivo de preferências encontrado. Usando padrões.");
      return {};
    }
    console.error("Erro ao ler arquivo localmente:", error);
    return null;
  }
}
```

---

## Benefícios do Modelo de Autenticação do Kapivatar

1. **Privacidade Absoluta:** Os dados gerados e utilizados no seu webapp permanecem inteiramente no disco do usuário final, sem intermediários ou servidores na nuvem.
2. **Armazenamento Seguro:** O seu sandbox é isolado através de hash (`SHA-256` da sua origem), impedindo que outros aplicativos acessem os seus arquivos.
3. **UX Simples:** O usuário se autentica com um único clique em uma janela popup nativa e leve.
