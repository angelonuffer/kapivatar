import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const modelo = await readFile(fileURLToPath(new URL('../scripts/relatorio.html', import.meta.url)), 'utf8');

test('abre um teste em sua própria página e permite voltar à lista #relatorio', async ({ page }) => {
  const relatorio = {
    testes: [{
      titulo: 'Teste de exemplo',
      hashtags: ['#relatorio'],
      caminho: 'teste.js',
      projeto: 'chromium',
      outcome: 'expected',
      resultados: [],
    }],
    startTime: null,
  };
  const html = modelo.replace('/* DADOS_DO_RELATORIO */', `const relatorio = ${JSON.stringify(relatorio)};`);

  await page.setContent(html);
  await expect(page.locator('#pagina-lista')).toBeVisible();
  await page.getByRole('link', { name: /Teste de exemplo/ }).click();
  await expect(page).toHaveURL(/#teste=0$/);
  await expect(page.locator('#pagina-teste')).toBeVisible();
  await expect(page.locator('#detalhes h2')).toHaveText('Teste de exemplo');

  await page.getByRole('button', { name: 'Voltar para a lista de testes' }).click();
  await expect(page.locator('#pagina-lista')).toBeVisible();
  await expect(page.locator('#pagina-teste')).toBeHidden();
});

test('filtra a lista por hashtag #relatorio #filtro', async ({ page }) => {
  const relatorio = {
    testes: [
      { titulo: 'Teste de perfil', hashtags: ['#perfil'], caminho: 'perfil.js', projeto: 'chromium', outcome: 'expected', resultados: [] },
      { titulo: 'Teste de contato', hashtags: ['#contatos', '#sincronizacao'], caminho: 'contatos.js', projeto: 'chromium', outcome: 'expected', resultados: [] },
    ],
    startTime: null,
  };
  const html = modelo.replace('/* DADOS_DO_RELATORIO */', `const relatorio = ${JSON.stringify(relatorio)};`);

  await page.setContent(html);
  const filtro = page.getByLabel('Filtrar por hashtag');
  await expect(filtro.locator('option')).toHaveText(['Todas as hashtags', '#contatos', '#perfil', '#sincronizacao']);
  await expect(page.locator('#lista .teste')).toHaveCount(2);
  await filtro.selectOption('#sincronizacao');
  await expect(page.locator('#lista .teste')).toHaveCount(1);
  await expect(page.locator('#lista .teste strong')).toHaveText('Teste de contato');
  await expect(page.locator('#lista .hashtag')).toHaveText(['#contatos', '#sincronizacao']);
  await page.locator('#lista .teste').click();
  await expect(page.locator('#detalhes h2')).toHaveText('Teste de contato');
  await expect(page.locator('#lista .teste')).toHaveAttribute('aria-current', 'true');
  await page.getByRole('button', { name: 'Voltar para a lista de testes' }).click();
  await filtro.selectOption('');
  await expect(page.locator('#lista .teste')).toHaveCount(2);
});

test('exibe capturas junto ao passo ao qual pertencem #relatorio #capturas', async ({ page }) => {
  const relatorio = {
    testes: [{
      titulo: 'Teste com captura',
      hashtags: [],
      caminho: 'teste.js',
      projeto: 'chromium',
      outcome: 'expected',
      resultados: [{
        retry: 0,
        status: 'passed',
        duration: 10,
        errors: [],
        steps: [{ title: 'Abre a página', imagens: [{ titulo: 'Página inicial', url: 'data:image/png;base64,AA==' }] }],
        imagens: [{ titulo: 'Página inicial', url: 'data:image/png;base64,AA==' }],
        imagensSemPasso: [],
      }],
    }],
    startTime: null,
  };
  const html = modelo.replace('/* DADOS_DO_RELATORIO */', `const relatorio = ${JSON.stringify(relatorio)};`);

  await page.setContent(html);
  await page.getByRole('link', { name: /Teste com captura/ }).click();
  const passo = page.locator('#detalhes li').filter({ hasText: 'Abre a página' });
  await expect(passo.locator('img')).toHaveAttribute('alt', 'Página inicial');
  await expect(page.getByRole('heading', { name: 'Capturas de tela' })).toHaveCount(0);
});
