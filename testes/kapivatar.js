import { test, expect } from './simulações/fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Deve realizar o login e navegar entre as páginas', async ({ page }) => {
  // 1. Login
  await page.getByRole('button', { name: /Escolher arquivo kapivatar\.sqlite/ }).click();
  await expect.poll(() => page.evaluate(() => window._databasePickerCalls)).toBe(1);
  expect(await page.evaluate(() => window._databasePickerOptions.suggestedName)).toBe('kapivatar.sqlite');

  // 2. Verificar se está na página Início
  await expect(page.locator('.conteudo-principal')).toBeVisible();

  // 3. Navegação: Perfis (via link de seleção na sidebar quando nenhum perfil está selecionado)
  await page.getByRole('link', { name: /Selecionar perfil/, exact: true }).click();
  await expect(page.locator('.conteudo-pagina')).toBeVisible();
});

test('Deve mostrar a navegação inferior em mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.getByRole('button', { name: /Escolher arquivo kapivatar\.sqlite/ }).click();

  const navegacao = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(navegacao).toBeVisible();
  expect(await navegacao.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label'))))
    .toEqual(['Início', 'Perfis', 'Contatos', 'Sair']);
  await expect(navegacao.locator('.navegacao-inferior-item > span:nth-child(2)')).toHaveText(['Início', 'Perfis', 'Contatos', 'Sair']);
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await expect(page.locator('.botao-menu')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Mais opções' })).not.toBeVisible();

  await navegacao.getByRole('button', { name: 'Perfis' }).click();
  await expect(page).toHaveURL(/\/perfis$/);

  const menu_acoes = page.getByRole('button', { name: 'Mais opções' });
  await expect(menu_acoes).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar perfil' })).not.toBeVisible();
  await menu_acoes.click();
  await expect(page.getByRole('button', { name: 'Criar perfil' })).toBeVisible();
  await page.getByRole('button', { name: 'Criar perfil' }).click();
  await expect(page).toHaveURL(/\/perfis\/criar$/);

  await navegacao.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('button', { name: /Escolher arquivo kapivatar\.sqlite/ })).toBeVisible();
});

test('Deve realizar o logout', async ({ page }) => {
  // Realizar login primeiro
  await page.getByRole('button', { name: /Escolher arquivo kapivatar\.sqlite/ }).click();
  await expect(page.locator('.conteudo-pagina')).toBeVisible();

  // Logout
  await page.locator('.sidebar-rodape').getByText('Sair').click();

  // Verificar se voltou para a tela de login
  await expect(page.getByRole('button', { name: /Escolher arquivo kapivatar\.sqlite/ })).toBeVisible();
});
