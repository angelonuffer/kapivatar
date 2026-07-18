import { test, expect } from './simulações/file-system-access-api.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();
});

test('Deve criar, visualizar, editar e ver histórico de um perfil', async ({ page }) => {
  // 1. Criar perfil
  await page.getByRole('link', { name: /Selecionar perfil/, exact: true }).click();
  await page.getByRole('button', { name: /Criar perfil/ }).click();

  await page.getByLabel('Nome').fill('Capivara Original');
  await page.getByLabel('Bio').fill('Bio original');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  // 2. Verificar card e clicar para ver detalhes
  const card = page.locator('.perfil-card').first();
  await expect(card).toContainText('Capivara Original');
  await card.click();

  // 3. Verificar página de detalhes
  await expect(page).toHaveURL(/\/perfil\/[a-f0-9]{64}/);
  await expect(page.locator('h2')).toHaveText('Capivara Original');
  await expect(page.locator('p')).toHaveText('Bio original');

  // 4. Editar perfil
  await page.getByRole('button', { name: 'Editar' }).click();
  await expect(page).toHaveURL(/\/perfil\/[a-f0-9]{64}\/editar/);

  await page.getByLabel('Nome').fill('Capivara Editada');
  await page.getByLabel('Bio').fill('Bio editada');
  await page.getByRole('button', { name: 'Salvar Alterações' }).click();

  // 5. Verificar atualização nos detalhes
  await expect(page).toHaveURL(/\/perfil\/[a-f0-9]{64}/);
  await expect(page.locator('h2')).toHaveText('Capivara Editada');
  await expect(page.locator('p')).toHaveText('Bio editada');

  // 6. Verificar histórico do perfil
  await page.getByRole('button', { name: 'Histórico' }).click();
  await expect(page).toHaveURL(/\/perfil\/[a-f0-9]{64}\/hist%C3%B3rico/);

  const itensHistorico = page.locator('.historico ul li');
  await expect(itensHistorico).toHaveCount(2);

  // 7. Navegar para versão anterior através do histórico
  await itensHistorico.last().locator('a').click();

  // Deve mostrar a versão antiga do perfil (com query parameter v)
  await expect(page).toHaveURL(/.*v=[a-f0-9]{64}/);
  await expect(page.locator('h2')).toHaveText('Capivara Original');
  await expect(page.locator('p')).toHaveText('Bio original');
});
