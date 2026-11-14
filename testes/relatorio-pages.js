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
