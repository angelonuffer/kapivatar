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
  await expect(page.locator('.perfil-card').first()).toBeVisible();

  // Criar segundo perfil para testar histórico
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Segunda Capivara');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  // Verificar se o segundo perfil aparece
  await expect(page.locator('.perfis-grid')).toBeVisible();

  // O histórico não deve mais estar na página de perfis
  await expect(page.locator('.historico')).not.toBeVisible();

  // Clicar no botão Histórico
  await page.getByRole('button', { name: 'Histórico' }).click();

  // Verificar se navegou para a página de histórico
  // O Playwright recebe a URL com escape de caracteres especiais
  await expect(page).toHaveURL(/\/perfis\/hist%C3%B3rico/);

  // Verificar se o histórico apareceu na nova página
  await expect(page.locator('.historico')).toBeVisible();

  // Verificar se contém links de versão
  await expect(page.locator('.historico ul li')).toHaveCount(2);
});
