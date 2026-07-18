import { test, expect } from './mocks/fs-mock.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Deve realizar o login e navegar entre as páginas', async ({ page }) => {
  // 1. Login
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();

  // 2. Verificar se está na página Início
  await expect(page.locator('.conteudo-principal')).toBeVisible();

  // 3. Navegação: Perfis (via link de seleção na sidebar quando nenhum perfil está selecionado)
  await page.getByRole('link', { name: /Selecionar perfil/, exact: true }).click();
  await expect(page.locator('.conteudo-pagina')).toBeVisible();
});

test('Deve mostrar o menu lateral como overlay em mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();

  // Sidebar deve estar escondida (fora da tela)
  // O botão de menu deve estar visível
  const botaoMenu = page.locator('.botao-menu');
  await expect(botaoMenu).toBeVisible();

  // Abrir sidebar
  await botaoMenu.click();
  await expect(page.locator('.sidebar')).toBeVisible(); // No mobile ela entra na tela

  // Fechar sidebar pelo botão X
  await page.locator('.botao-fechar-sidebar').click();
  // Aguarda animação
  await page.waitForTimeout(500);
  await expect(page.locator('.overlay')).not.toBeVisible();
});

test('Deve realizar o logout', async ({ page }) => {
  // Realizar login primeiro
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();
  await expect(page.locator('.conteudo-pagina')).toBeVisible();

  // Logout
  await page.getByText('Sair').click();

  // Verificar se voltou para a tela de login
  await expect(page.getByRole('button', { name: /Escolher pasta de dados/ })).toBeVisible();
});
