# Kapivatar

<h3>
  <img src="src/kapivatar.svg" width="42" align="center">
  &nbsp;
  <span>Sua identidade pertence a você!</span>
</h3>

O Kapivatar é uma rede social descentralizada que coloca o usuário no controle total de seus dados. Acreditamos que a internet deve ser descentralizada por padrão, e por isso o Kapivatar não armazena suas senhas, fotos ou conversas em servidores centrais. Tudo é processado e armazenado localmente no seu navegador e no seu sistema de arquivos.

![Capivara](src/capivara.jpeg)

## 🌟 Filosofia

O projeto baseia-se na premissa de que a soberania digital é um direito. Ao utilizar o poder das APIs modernas dos navegadores, o Kapivatar permite que você:
- **Autentique-se sem senhas centrais:** Utilizando sua própria estrutura de dados.
- **Armazenamento Local:** Seus dados são guardados em um arquivo SQLite escolhido no seu computador através da File System Access API. `kapivatar.sqlite` é apenas o nome sugerido ao criar um arquivo.
- **Privacidade por Padrão:** O que é seu, permanece com você.

## 🛠 Tecnologias

- **Frontend:** HTML5, CSS3 e JavaScript, com [Vite](https://vite.dev/) para desenvolvimento e build.
- **Persistência de Dados:** Os dados são armazenados em um banco SQLite no arquivo escolhido; o [IndexedDB](https://developer.mozilla.org/pt-BR/docs/Web/API/IndexedDB_API) persiste apenas o acesso ao arquivo.
- **Banco de Dados:** [SQLite WASM oficial](https://sqlite.org/wasm/doc/trunk/index.md) para leitura e gravação do arquivo SQLite no frontend.
- **Acesso ao Sistema de Arquivos:** [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) para seleção e armazenamento do arquivo de dados.
- **Infraestrutura:** [Cloudflare Workers](https://workers.cloudflare.com/) para entrega de assets.
- **Testes:** [Playwright](https://playwright.dev/) para testes de ponta a ponta (E2E).

## Sincronização entre dispositivos

Dispositivos pareados sincronizam os dados do arquivo SQLite pelo MQTT. O conteúdo é criptografado de ponta a ponta com AES-GCM e uma chave derivada por HKDF da chave secreta compartilhada no pareamento; essa chave não é publicada. O broker ainda pode observar tópicos, horários e tamanhos das mensagens. Os dados são fragmentados para transporte, e alterações concorrentes são resolvidas pela versão mais recente (com o ID do dispositivo como desempate).

A chave compartilhada é mantida no armazenamento local do navegador para permitir a sincronização futura. A sincronização acontece quando o arquivo de dados está aberto; handles de arquivos e outras permissões locais não são transferidos. Como em qualquer aplicação web, scripts executados na mesma origem podem acessar dados guardados pelo navegador.

## 🚀 Como Executar o Projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) em uma versão suportada pelo Vite.
- [npm](https://www.npmjs.com/) instalado.

### Instalação

1. Clone o repositório:
   ```bash
   git clone <url-do-repositorio>
   cd kapivatar
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Instale os navegadores do Playwright:
   ```bash
   npx playwright install chromium --with-deps
   ```

### Execução Local

Inicie o servidor de desenvolvimento do Vite:

```bash
npm run dev
```

O Vite informa no terminal o endereço local, normalmente `http://localhost:5173`.

Para gerar os arquivos de produção em `dist/`, execute:

```bash
npm run build
```

Para testar localmente o build gerado, execute:

```bash
npm run preview
```

O servidor de preview é destinado à verificação local do build, não à hospedagem em produção.

## 🧪 Testes

Os testes são realizados utilizando o Playwright. Para executá-los, use:

```bash
npm test
```

Para gerar um relatório estático e responsivo a partir de `playwright-report/`:

```bash
npm run report:pages
```

O resultado fica em `playwright-pages/` e pode ser aberto pelo `index.html` ou publicado como conteúdo estático. Para escolher as pastas de entrada e saída, execute `npm run report:pages -- <entrada> <saída>`. Opcionalmente, informe um terceiro argumento com um arquivo de texto contendo os caminhos dos arquivos de teste modificados ou criados, um por linha; os testes desses arquivos serão marcados e exibidos no início da lista. Ao selecionar um teste, o relatório abre uma página própria com seus passos e capturas disponíveis em cada execução, incluindo novas tentativas, e oferece um botão para voltar à lista. As capturas do rastreamento dependem de a opção `trace` do Playwright estar habilitada; testes ignorados ou sem capturas podem não apresentar imagens.

Para testar o próprio gerador, execute `npm run test:report`.

Para verificar os tipos e diagnósticos do projeto, use:

```bash
npm run check
```

No GitHub Actions, cada execução disponibiliza o relatório Playwright original e a página gerada como artefato quando gerados. O relatório da branch principal é publicado em `https://angelonuffer.github.io/kapivatar/latest/`. PRs do próprio repositório também publicam um preview público em `https://angelonuffer.github.io/kapivatar/previews/pr-<número>/`; o índice mantém apenas previews de PRs abertos e os relatórios são removidos quando os PRs são fechados ou mergeados. PRs de forks continuam executando os testes e disponibilizando o artefato, mas não publicam no Pages. Esses relatórios e suas capturas são públicos: não inclua dados sensíveis nos testes.

## 📄 Licença

Este projeto está licenciado sob a licença **CC0 (Creative Commons Zero)**. Você pode copiar, modificar, distribuir e executar o trabalho, mesmo para fins comerciais, tudo sem pedir permissão.
