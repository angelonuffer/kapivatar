# Kapivatar

<h3>
  <img src="www/kapivatar.svg" width="42" align="center">
  &nbsp;
  <span>Sua identidade pertence a você!</span>
</h3>

O Kapivatar é uma rede social descentralizada que coloca o usuário no controle total de seus dados. Acreditamos que a internet deve ser descentralizada por padrão, e por isso o Kapivatar não armazena suas senhas, fotos ou conversas em servidores centrais. Tudo é processado e armazenado localmente no seu navegador e no seu sistema de arquivos.

![Capivara](www/capivara.jpeg)

## 🌟 Filosofia

O projeto baseia-se na premissa de que a soberania digital é um direito. Ao utilizar o poder das APIs modernas dos navegadores, o Kapivatar permite que você:
- **Autentique-se sem senhas centrais:** Utilizando sua própria estrutura de dados.
- **Armazenamento Local:** Seus dados são guardados em uma pasta de sua escolha no seu computador através da File System Access API.
- **Privacidade por Padrão:** O que é seu, permanece com você.

## 🛠 Tecnologias

- **Frontend:** HTML5, CSS3 e JavaScript (Vanilla).
- **Persistência de Dados:** [IndexedDB](https://developer.mozilla.org/pt-BR/docs/Web/API/IndexedDB_API) para estados da aplicação.
- **Acesso ao Sistema de Arquivos:** [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) para armazenamento de dados do usuário.
- **Infraestrutura:** [Cloudflare Workers](https://workers.cloudflare.com/) para entrega de assets.
- **Testes:** [Playwright](https://playwright.dev/) para testes de ponta a ponta (E2E).

## 🚀 Como Executar o Projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) instalado.
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

Para rodar o projeto localmente, utilize o comando:
```bash
npx serve -s www
```
O projeto estará disponível em `http://localhost:3000` (ou na porta indicada pelo `serve`).

## 🧪 Testes

Os testes são realizados utilizando o Playwright. Para executá-los, use:

```bash
npm test
```

## 📄 Licença

Este projeto está licenciado sob a licença **CC0 (Creative Commons Zero)**. Você pode copiar, modificar, distribuir e executar o trabalho, mesmo para fins comerciais, tudo sem pedir permissão.
