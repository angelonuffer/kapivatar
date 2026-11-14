import { access, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const raiz = path.resolve(process.argv[2] ?? 'site');

async function existe(arquivo) {
  try {
    await access(arquivo);
    return true;
  } catch (erro) {
    if (erro.code === 'ENOENT') return false;
    throw erro;
  }
}

async function gerar() {
  const temRelatorioPrincipal = await existe(path.join(raiz, 'latest', 'index.html'));
  const diretorioPreviews = path.join(raiz, 'previews');
  const previews = (await existe(diretorioPreviews)
    ? await readdir(diretorioPreviews, { withFileTypes: true })
    : [])
    .filter((entrada) => entrada.isDirectory() && /^pr-\d+$/.test(entrada.name))
    .map((entrada) => entrada.name.slice(3))
    .filter((numero) => Number.isSafeInteger(Number(numero)))
    .sort((a, b) => Number(b) - Number(a));
  const total = previews.length + Number(temRelatorioPrincipal);
  const links = [
    ...(temRelatorioPrincipal ? [{
      href: 'latest/',
      categoria: 'Branch principal',
      titulo: 'Relatório mais recente',
      descricao: 'Resultados da execução mais recente na branch principal.',
      classe: 'card-principal',
    }] : []),
    ...previews.map((numero) => ({
      href: `previews/pr-${numero}/`,
      categoria: 'Pull request',
      titulo: `Preview da PR #${numero}`,
      descricao: 'Abra o relatório de testes e confira os detalhes desta execução.',
      classe: '',
    })),
  ];

  const cards = links.map(({ href, categoria, titulo, descricao, classe }) => `
        <a class="report-card ${classe}" href="${href}">
          <span class="card-icon" aria-hidden="true">${classe ? '↗' : '⌁'}</span>
          <span class="card-content">
            <span class="card-category">${categoria}</span>
            <span class="card-title">${titulo}</span>
            <span class="card-description">${descricao}</span>
          </span>
          <span class="card-arrow" aria-hidden="true">→</span>
        </a>`).join('');

  const pagina = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101a30">
  <meta name="description" content="Relatórios de testes e previews do Kapivatar.">
  <title>Relatórios de testes · Kapivatar</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #101a30;
      color: #f5f7fb;
      font-synthesis: none;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    * { box-sizing: border-box; }

    body {
      min-width: 320px;
      min-height: 100vh;
      margin: 0;
      background:
        radial-gradient(ellipse at 82% 4%, rgb(64 121 213 / 19%), transparent 34rem),
        radial-gradient(ellipse at 12% 35%, rgb(45 179 143 / 10%), transparent 30rem),
        #101a30;
    }

    a { color: inherit; }

    .page-shell {
      width: min(100% - 48px, 1000px);
      margin: 0 auto;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 28px 0;
      border-bottom: 1px solid rgb(255 255 255 / 9%);
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 11px;
      font-size: 15px;
      font-weight: 720;
      letter-spacing: -.025em;
      text-decoration: none;
    }

    .brand-mark {
      display: grid;
      width: 34px;
      height: 34px;
      place-items: center;
      border: 1px solid rgb(119 225 191 / 32%);
      border-radius: 11px;
      background: rgb(57 179 140 / 13%);
      color: #86e3c2;
      font-size: 19px;
    }

    .topbar-label {
      color: #a4afc2;
      font-size: 13px;
      font-weight: 550;
    }

    main { padding: 76px 0 96px; }

    .intro { max-width: 650px; }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      color: #8fe1c4;
      font-size: 12px;
      font-weight: 720;
      letter-spacing: .13em;
      text-transform: uppercase;
    }

    .eyebrow::before {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #64d5aa;
      box-shadow: 0 0 14px rgb(100 213 170 / 65%);
      content: "";
    }

    h1 {
      margin: 20px 0 16px;
      font-size: clamp(38px, 6vw, 58px);
      font-weight: 720;
      letter-spacing: -.055em;
      line-height: 1.06;
    }

    .intro-copy {
      max-width: 570px;
      margin: 0;
      color: #aab5c8;
      font-size: 16px;
      line-height: 1.7;
    }

    .reports { margin-top: 54px; }

    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }

    h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 650;
      letter-spacing: -.01em;
    }

    .report-count {
      padding: 5px 10px;
      border: 1px solid rgb(255 255 255 / 10%);
      border-radius: 999px;
      color: #aab5c8;
      font-size: 12px;
    }

    .report-list { display: grid; gap: 12px; }

    .report-card {
      display: flex;
      align-items: center;
      gap: 17px;
      min-height: 105px;
      padding: 20px 22px;
      border: 1px solid rgb(255 255 255 / 10%);
      border-radius: 16px;
      background: rgb(255 255 255 / 3%);
      text-decoration: none;
      transition: border-color .18s ease, background .18s ease, transform .18s ease;
    }

    .report-card:hover {
      transform: translateY(-2px);
      border-color: rgb(143 225 196 / 42%);
      background: rgb(255 255 255 / 6%);
    }

    .report-card:focus-visible {
      outline: 3px solid #8fe1c4;
      outline-offset: 3px;
    }

    .card-principal {
      border-color: rgb(143 225 196 / 27%);
      background: linear-gradient(110deg, rgb(55 155 127 / 13%), rgb(255 255 255 / 3%) 62%);
    }

    .card-icon {
      display: grid;
      flex: 0 0 46px;
      width: 46px;
      height: 46px;
      place-items: center;
      border: 1px solid rgb(255 255 255 / 9%);
      border-radius: 13px;
      background: rgb(255 255 255 / 5%);
      color: #c3cee0;
      font-size: 22px;
    }

    .card-principal .card-icon {
      border-color: rgb(143 225 196 / 20%);
      background: rgb(57 179 140 / 14%);
      color: #8fe1c4;
    }

    .card-content { display: grid; gap: 4px; }

    .card-category {
      color: #8fe1c4;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .09em;
      text-transform: uppercase;
    }

    .card-title {
      font-size: 16px;
      font-weight: 650;
      letter-spacing: -.015em;
    }

    .card-description {
      color: #a4afc2;
      font-size: 13px;
      line-height: 1.5;
    }

    .card-arrow {
      margin-left: auto;
      color: #7e8ba2;
      font-size: 20px;
      transition: transform .18s ease, color .18s ease;
    }

    .report-card:hover .card-arrow {
      transform: translateX(3px);
      color: #8fe1c4;
    }

    .empty-state {
      padding: 28px;
      border: 1px dashed rgb(255 255 255 / 16%);
      border-radius: 16px;
      color: #aab5c8;
      font-size: 14px;
      line-height: 1.6;
      text-align: center;
    }

    footer {
      padding: 20px 0 28px;
      border-top: 1px solid rgb(255 255 255 / 9%);
      color: #7f8ba1;
      font-size: 12px;
    }

    @media (max-width: 600px) {
      .page-shell { width: min(100% - 32px, 1000px); }
      .topbar { padding: 20px 0; }
      .topbar-label { font-size: 12px; }
      main { padding: 60px 0 72px; }
      .reports { margin-top: 40px; }
      .report-card { gap: 13px; padding: 17px 15px; }
      .card-icon { flex-basis: 40px; width: 40px; height: 40px; }
      .card-description { font-size: 12px; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; }
    }
  </style>
</head>
<body>
  <div class="page-shell">
    <header class="topbar">
      <a class="brand" href="./" aria-label="Kapivatar — relatórios de testes">
        <span class="brand-mark" aria-hidden="true">k</span>
        <span>Kapivatar</span>
      </a>
      <span class="topbar-label">Qualidade do projeto</span>
    </header>
    <main>
      <section class="intro" aria-labelledby="page-title">
        <span class="eyebrow">Playwright · GitHub Pages</span>
        <h1 id="page-title">Relatórios de testes</h1>
        <p class="intro-copy">Acompanhe os resultados da branch principal e explore os previews de cada pull request.</p>
      </section>
      <section class="reports" aria-labelledby="reports-title">
        <div class="section-heading">
          <h2 id="reports-title">Relatórios disponíveis</h2>
          <span class="report-count">${total} ${total === 1 ? 'relatório' : 'relatórios'}</span>
        </div>
        <div class="report-list">
${cards || `          <p class="empty-state">Ainda não há relatórios publicados. Quando uma execução estiver disponível, ela aparecerá aqui.</p>`}
        </div>
      </section>
    </main>
    <footer>Kapivatar · Relatórios automatizados de testes</footer>
  </div>
</body>
</html>
`;

  await mkdir(raiz, { recursive: true });
  await writeFile(path.join(raiz, 'index.html'), pagina);
}

gerar().catch((erro) => {
  console.error(`Erro ao gerar o índice do GitHub Pages: ${erro.message}`);
  process.exitCode = 1;
});
