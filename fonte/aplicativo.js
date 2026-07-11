async function ler(caminho, base) {
  const url = new URL(caminho, base).href;
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    const fs = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    return fs.readFile(fileURLToPath(url), 'utf-8');
  } else {
    const resposta = await fetch(url);
    return resposta.text();
  }
}

export default async function construir(páginas) {
  const [html, css, banco, motor] = await Promise.all([
    ler('index.html', import.meta.url),
    ler('kapivatar.css', import.meta.url),
    ler('banco.js', import.meta.url),
    ler('motor.js', import.meta.url)
  ]);

  // Remove exports and imports for inlining
  const bancoLimpo = banco.replace(/export\s+default\s+/, 'const banco = ').replace(/export\s+const\s+banco\s+=\s+/, 'const banco = ');
  const motorLimpo = motor.replace(/^import\s+.*\s+from\s+["']\.\/.*["'];?\s*$/gm, '');

  // Safe serialization of pages with functions
  const páginasJs = `[${páginas.map(p => {
    const renderStr = p.render ? p.render.toString() : 'null';
    const rest = { ...p };
    delete rest.render;
    return `{ ...${JSON.stringify(rest)}, render: ${renderStr} }`;
  }).join(',')}]`;

  const scriptFull = `
    ${bancoLimpo}
    window.páginas = ${páginasJs};
    const páginas = window.páginas;
    ${motorLimpo}
  `;

  return html
    .replace('<link rel="stylesheet" href="kapivatar.css">', `<style>${css}</style>`)
    .replace(/<script\s+type="module"\s+src=['"]kapivatar\.js['"]><\/script>/, `<script type="module">${scriptFull}</script>`)
    .replace(/<script\s+src=['"]kapivatar\.js['"]\s+type="module"><\/script>/, `<script type="module">${scriptFull}</script>`);
}
