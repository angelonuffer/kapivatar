import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const modelo = await readFile(fileURLToPath(new URL('../scripts/relatorio.html', import.meta.url)), 'utf8');

test('abre um teste em sua própria página e permite voltar à lista', async ({ page }) => {
  const relatorio = {
    testes: [{
      titulo: 'Teste de exemplo',
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
