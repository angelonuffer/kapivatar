import { test, expect } from './mocks/fs-mock.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Deve realizar o login e navegar entre as páginas', async ({ page }) => {
  // 1. Login
  await expect(page).toHaveScreenshot('login-page.png');
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();

  // 2. Verificar se está na página Início
  await expect(page).toHaveScreenshot('full-inicio-page.png');

  // 3. Navegação: Perfis
  await page.getByRole('link', { name: /Perfis/, exact: true }).click();
  await expect(page.locator('.conteudo-pagina')).toHaveScreenshot('perfis-page.png');
});

test('Deve mostrar o menu lateral como overlay em mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();

  // Sidebar deve estar escondida (fora da tela)
  // O botão de menu deve estar visível
  const botaoMenu = page.locator('.botao-menu');
  await expect(botaoMenu).toBeVisible();
  await expect(page).toHaveScreenshot('mobile-inicio-fechado.png');

  // Abrir sidebar
  await botaoMenu.click();
  await expect(page.locator('.sidebar')).toBeVisible(); // No mobile ela entra na tela
  await expect(page).toHaveScreenshot('mobile-sidebar-aberta.png');

  // Fechar sidebar pelo botão X
  await page.locator('.botao-fechar-sidebar').click();
  // Aguarda animação
  await page.waitForTimeout(500);
  await expect(page.locator('.overlay')).not.toBeVisible();
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
