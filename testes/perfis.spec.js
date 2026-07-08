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

  // Aguardar o redirecionamento verificando o título da página
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Perfis/);

  // Verificar se o perfil aparece
  await expect(page.getByRole('heading', { level: 3 })).toHaveText('Capivara de Teste');
  await expect(page.getByText('Uma bio de teste')).toBeVisible();

  // Criar segundo perfil para testar histórico
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Segunda Capivara');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  await expect(page.getByText('Segunda Capivara')).toBeVisible();

  // Verificar se o histórico apareceu
  await expect(page.getByRole('heading', { level: 2, name: 'Histórico de Versões' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Versão:/ })).toHaveCount(1);
});
