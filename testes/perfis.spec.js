import { test, expect } from './mocks/fs-mock.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();
});

test('Deve criar um perfil e listar no histórico', async ({ page }) => {
  await page.getByRole('link', { name: /Perfis/, exact: true }).click();
  await page.getByRole('button', { name: /Criar perfil/ }).click();

  await page.getByLabel('Nome').fill('Capivara de Teste');
  await page.getByLabel('Bio').fill('Uma bio de teste');

  const saveButton = page.getByRole('button', { name: 'Salvar Perfil' });
  await saveButton.click();

  // Aguardar o redirecionamento e verificar o perfil criado
  await expect(page.locator('.perfil-card').first()).toHaveScreenshot('perfil-criado.png');

  // Criar segundo perfil para testar histórico
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Segunda Capivara');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  // Verificar se o segundo perfil aparece
  await expect(page.locator('.perfis-grid')).toHaveScreenshot('perfis-grid-duas-capivaras.png');

  // Verificar se o histórico apareceu
  await expect(page.locator('.historico')).toHaveScreenshot('historico-perfil.png');
});
