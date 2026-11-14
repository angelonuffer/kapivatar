import { test, expect } from './simulações/fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Deve criar e exibir o perfil único do arquivo de dados #perfil #arquivo', async ({ page }) => {
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await expect(page).toHaveURL(/\/perfil\/criar$/);

  await page.getByLabel('Nome').fill('Capivara de Teste');
  await page.getByLabel('Bio', { exact: true }).fill('Uma bio de teste');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByRole('heading', { name: 'Capivara de Teste' })).toBeVisible();
  const banco = await page.evaluate(() => window._files.get('Capivara de Teste.kapivatar'));
  expect(new TextDecoder().decode(banco.slice(0, 16))).toBe('SQLite format 3\u0000');
  expect(banco.byteLength).toBeGreaterThan(100);

  await page.reload();
  await page.goto('/perfil');
  await expect(page.getByRole('heading', { name: 'Capivara de Teste' })).toBeVisible();
});

test('Deve publicar assobios no perfil em ordem decrescente de data #perfil #assobios', async ({ page }) => {
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil de Assobios');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Perfil de Assobios' })).toBeVisible();

  const campo_assobio = page.locator('#novo-assobio');
  await campo_assobio.fill('Assobio mais antigo');
  await page.getByRole('button', { name: 'Publicar assobio' }).click();
  await expect(page.getByText('Assobio mais antigo')).toBeVisible();

  await page.waitForTimeout(20);
  await campo_assobio.fill('Assobio mais recente');
  await page.getByRole('button', { name: 'Publicar assobio' }).click();

  const cartoes = page.locator('.assobio-card-nota');
  await expect(cartoes).toHaveText(['Assobio mais recente', 'Assobio mais antigo']);
});
