import { test, expect } from './simulações/fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Abrir arquivo SQLite/ }).click();
});

test('Não deve permitir criar mais de um perfil no mesmo arquivo', async ({ page }) => {
  await page.getByRole('link', { name: /Criar perfil/, exact: true }).click();
  await page.getByRole('button', { name: 'Criar perfil' }).click();
  await page.getByLabel('Nome').fill('Perfil Único');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Perfil Único' })).toBeVisible();

  await page.goto('/perfil/criar');
  await expect(page.getByText('Este arquivo de dados já contém um perfil.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar Perfil' })).toHaveCount(0);
});
