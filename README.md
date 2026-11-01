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
- **Armazenamento Local:** Seus dados são guardados em uma pasta de sua escolha no seu computador através da File System Access API.
- **Privacidade por Padrão:** O que é seu, permanece com você.

## 🛠 Tecnologias

- **Frontend:** HTML5, CSS3 e JavaScript, com [Vite](https://vite.dev/) para desenvolvimento e build.
- **Persistência de Dados:** [IndexedDB](https://developer.mozilla.org/pt-BR/docs/Web/API/IndexedDB_API) para estados da aplicação.
- **Acesso ao Sistema de Arquivos:** [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) para armazenamento de dados do usuário.
- **Infraestrutura:** [Cloudflare Workers](https://workers.cloudflare.com/) para entrega de assets.
- **Testes:** [Playwright](https://playwright.dev/) para testes de ponta a ponta (E2E).

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

Para verificar os tipos e diagnósticos do projeto, use:

```bash
npm run check
```

No GitHub Actions, cada execução disponibiliza o relatório Playwright como artefato quando gerado. PRs do próprio repositório também publicam um preview público em `https://angelonuffer.github.io/kapivatar/previews/pr-<número>/`; o preview é removido quando o PR é fechado. PRs de forks continuam executando os testes e disponibilizando o artefato, mas não publicam no Pages.

## 📄 Licença

Este projeto está licenciado sob a licença **CC0 (Creative Commons Zero)**. Você pode copiar, modificar, distribuir e executar o trabalho, mesmo para fins comerciais, tudo sem pedir permissão.
