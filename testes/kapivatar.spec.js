import { test, expect } from './mocks/fs-mock.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Deve realizar o login e navegar entre as páginas', async ({ page }) => {
  // 1. Login
  await expect(page).toHaveScreenshot('login-page.png');
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();

  // 2. Verificar se está na página Início
  await expect(page.locator('.conteudo-pagina')).toHaveScreenshot('inicio-page.png');

  // 3. Navegação: Perfis
  await page.getByRole('link', { name: /Perfis/, exact: true }).click();
  await expect(page.locator('.conteudo-pagina')).toHaveScreenshot('perfis-page.png');
});

test('Deve realizar o logout', async ({ page }) => {
  // Realizar login primeiro
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();
  await expect(page.locator('.conteudo-pagina')).toHaveScreenshot('inicio-before-logout.png');

  // Logout
  await page.getByText('Sair').click();

  // Verificar se voltou para a tela de login
  await expect(page).toHaveScreenshot('login-page-after-logout.png');
});
