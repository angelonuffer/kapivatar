# Integração com Kapivatar (Autenticação Local)

O Kapivatar fornece um mecanismo local e descentralizado de autenticação para outros aplicativos web (webapps). Através deste fluxo, o seu webapp pode se integrar ao Kapivatar usando uma janela pop-up (semelhante ao OAuth 2.0) e receber os dados de perfil do usuário conectado de forma segura.

---

## Como Funciona

1. **Iframe de Perfil:** O seu webapp incorpora um iframe apontando para o endpoint `/perfil_autenticado` do Kapivatar.
2. **Exibição do Estado:**
   - Se o usuário **está autenticado** e o seu webapp **já foi autorizado**, o iframe exibe a foto do perfil ativo do usuário e envia imediatamente um `postMessage` contendo as informações públicas do perfil conectado.
   - Se o usuário **não tem autorização** ou **não está logado**, o iframe exibe um ícone genérico de perfil.
3. **Fluxo de Autorização:**
   - Ao clicar no iframe, uma janela popup (`window.open`) abre o endpoint `/autenticar` do Kapivatar, passando o parâmetro `origin` da sua aplicação.
   - O usuário visualiza uma tela de consentimento local contendo as informações do perfil ativo e o domínio solicitante.
   - Ao clicar em "Autorizar", o Kapivatar registra a autorização.
   - O popup notifica o iframe e se fecha automaticamente. O iframe do Kapivatar então recarrega seu estado, exibe a foto do perfil e envia as informações do perfil para a sua aplicação via `postMessage`.

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

Quando o iframe do Kapivatar carrega e valida que a autorização foi concedida, ele envia uma mensagem contendo as informações públicas do perfil conectado para o window pai.

Adicione o seguinte listener JavaScript no seu webapp:

```javascript
let perfilConectado = null;

window.addEventListener("message", async (event) => {
  // Opcional: Valide a origem do Kapivatar por segurança
  if (event.origin !== "http://localhost:3000") return;

  const data = event.data;

  // Verifica se o evento é de sucesso de conexão com o perfil do Kapivatar
  if (data && data.tipo === "KAPIVATAR_CONECTADO") {
    perfilConectado = data.perfil;
    console.log("Conectado ao Kapivatar! Recebemos o perfil:", perfilConectado.nome);

    // Agora você pode usar os dados do perfil (ID, Nome, Bio, Chave Pública) na sua aplicação!
    await inicializarAppComDados();
  }
});
```

---

## Passo 3: Utilizar as Informações do Perfil Conectado

Com as informações do perfil recebidas, o seu aplicativo pode identificar o usuário localmente de forma descentralizada. Os dados recebidos no objeto `perfil` têm o seguinte formato:

```json
{
  "id": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "nome": "Capivara do Campo",
  "bio": "Desenvolvedora local e fã de mato.",
  "chave_publica": {
    "alg": "RSA-OAEP-256",
    "e": "AQAB",
    "ext": true,
    "key_ops": ["encrypt"],
    "kty": "RSA",
    "n": "..."
  }
}
```

> **Nota de Segurança:** A chave privada do usuário **nunca** é compartilhada com a sua aplicação externa. O Kapivatar protege rigorosamente a identidade digital do usuário mantendo as chaves privadas totalmente seguras em seu próprio sandbox.

### Exemplo: Salvar Preferências Localmente (no seu próprio domínio)

Como você não recebe um handle de sistema de arquivos do Kapivatar, você deve persistir as preferências e estados do usuário localmente na origem do seu próprio webapp (por exemplo, usando `localStorage` ou `IndexedDB`), associando-as ao ID estável do perfil conectado:

```javascript
async function salvarPreferencias(preferencias) {
  if (!perfilConectado) return;

  const chave = `preferencias_${perfilConectado.id}`;
  localStorage.setItem(chave, JSON.stringify(preferencias));
  console.log("Preferências salvas localmente para o perfil:", perfilConectado.nome);
}

async function carregarPreferencias() {
  if (!perfilConectado) return null;

  const chave = `preferencias_${perfilConectado.id}`;
  const dados = localStorage.getItem(chave);
  return dados ? JSON.parse(dados) : null;
}
```

---

## Benefícios do Modelo de Autenticação do Kapivatar

1. **Privacidade Absoluta:** O processo de consentimento e autenticação acontece inteiramente em nível de cliente, sem intermediários ou servidores na nuvem.
2. **Segurança de Chaves:** As chaves criptográficas privadas permanecem isoladas no Kapivatar, enquanto o seu aplicativo recebe uma identidade descentralizada baseada em chave pública de forma segura.
3. **UX Simples:** O usuário se autentica com um único clique em uma janela popup nativa e leve.
