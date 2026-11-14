import { test, expect } from './simulações/fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Abrir arquivo SQLite/ }).click();
});

test('Deve criar, visualizar, editar e ver histórico de um perfil #perfil', async ({ page }) => {
  // 1. Criar perfil
  await page.getByRole('link', { name: /Criar perfil/, exact: true }).click();
  await page.getByRole('button', { name: /Criar perfil/ }).click();

  await page.getByLabel('Nome').fill('Capivara Original');
  await page.getByLabel('Bio', { exact: true }).fill('Bio original');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  // 2. Verificar os detalhes do perfil
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.locator('h2')).toHaveText('Capivara Original');
  await expect(page.locator('.perfil-info-detalhe p')).toHaveText('Bio original');

  // 4. Editar perfil
  await page.getByRole('button', { name: 'Editar' }).click();
  await expect(page).toHaveURL(/\/perfil\/editar$/);

  await page.getByLabel('Nome').fill('Capivara Editada');
  await page.getByLabel('Bio', { exact: true }).fill('Bio editada');
  await page.getByRole('button', { name: 'Salvar Alterações' }).click();

  // 5. Verificar atualização nos detalhes
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.locator('h2')).toHaveText('Capivara Editada');
  await expect(page.locator('.perfil-info-detalhe p')).toHaveText('Bio editada');

  // 6. Verificar histórico do perfil
  await page.getByRole('button', { name: 'Histórico' }).click();
  await expect(page).toHaveURL(/\/perfil\/hist%C3%B3rico$/);

  const itensHistorico = page.locator('.historico ul li');
  await expect(itensHistorico).toHaveCount(2);

  // 7. Navegar para versão anterior através do histórico
  await itensHistorico.last().locator('a').click();

  // Deve mostrar a versão antiga do perfil (com query parameter v)
  await expect(page).toHaveURL(/.*v=[a-f0-9]{64}/);
  await expect(page.locator('h2')).toHaveText('Capivara Original');
  await expect(page.locator('.perfil-info-detalhe p')).toHaveText('Bio original');
});
