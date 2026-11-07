import { test, expect } from './simulações/fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Deve realizar o login e navegar entre as páginas', async ({ page }) => {
  // 1. Login
  await page.getByRole('button', { name: /Abrir arquivo kapivatar\.sqlite/ }).click();
  await expect.poll(() => page.evaluate(() => window._databasePickerCalls)).toBe(1);
  expect(await page.evaluate(() => window._databasePickerType)).toBe('open');
  expect(await page.evaluate(() => window._databasePickerOptions.types[0].accept['application/vnd.sqlite3'])).toEqual(['.sqlite']);

  // 2. Verificar se está na página Início
  await expect(page.locator('.conteudo-principal')).toBeVisible();

  const itens_sidebar = await page.locator('.sidebar .menu > a').evaluateAll((links) =>
    links.map((link) => {
      const { width, height, top } = link.getBoundingClientRect();
      return { width, height, top, direction: getComputedStyle(link).flexDirection };
    })
  );
  expect(itens_sidebar.length).toBeGreaterThan(0);
  expect(itens_sidebar.every((item) => item.width === 56 && item.height === 56 && item.direction === 'column')).toBe(true);
  expect(itens_sidebar.map((item) => item.top)).toEqual(
    [...itens_sidebar.map((item) => item.top)].sort((a, b) => a - b)
  );

  // 3. Navegação: Perfis (via link de seleção na sidebar quando nenhum perfil está selecionado)
  await page.getByRole('link', { name: /Selecionar perfil/, exact: true }).click();
  await expect(page.locator('.conteudo-pagina')).toBeVisible();
});

test('Deve mostrar a navegação inferior em mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.getByRole('button', { name: /Abrir arquivo kapivatar\.sqlite/ }).click();

  const navegacao = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(navegacao).toBeVisible();
  expect(await navegacao.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(5);
  expect(await navegacao.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label'))))
    .toEqual(['Início', 'Assobios', 'Perfis', 'Contatos', 'Sair']);
  await expect(navegacao.locator('.navegacao-inferior-item > span:nth-child(2)')).toHaveText(['Início', 'Assobios', 'Perfis', 'Contatos', 'Sair']);
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await expect(page.locator('.botao-menu')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Mais opções' })).not.toBeVisible();

  await navegacao.getByRole('button', { name: 'Assobios' }).click();
  await expect(page).toHaveURL(/\/assobios$/);
  await expect(navegacao.getByRole('button', { name: 'Assobios' })).toHaveClass(/ativo/);
  await expect(navegacao.getByRole('button', { name: 'Assobios' })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('button', { name: 'Mais opções' }).click();
  await page.getByRole('button', { name: 'Criar assobio' }).click();
  await expect(page).toHaveURL(/\/assobios\/criar$/);
  await expect(navegacao.getByRole('button', { name: 'Assobios' })).toHaveClass(/ativo/);

  await page.evaluate(() => window.navegar('/assobio/teste'));
  await expect(page).toHaveURL(/\/assobio\/teste$/);
  await expect(navegacao.getByRole('button', { name: 'Assobios' })).toHaveClass(/ativo/);

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
  await expect(page.getByRole('button', { name: /Abrir arquivo kapivatar\.sqlite/ })).toBeVisible();
});

test('Deve realizar o logout', async ({ page }) => {
  // Realizar login primeiro
  await page.getByRole('button', { name: /Abrir arquivo kapivatar\.sqlite/ }).click();
  await expect(page.locator('.conteudo-pagina')).toBeVisible();

  // Logout
  await page.locator('.sidebar-rodape').getByText('Sair').click();

  // Verificar se voltou para a tela de login
  await expect(page.getByRole('button', { name: /Abrir arquivo kapivatar\.sqlite/ })).toBeVisible();
});

test('Deve criar um novo arquivo de dados', async ({ page }) => {
  await page.getByRole('button', { name: /Criar arquivo kapivatar\.sqlite/ }).click();

  await expect.poll(() => page.evaluate(() => window._databasePickerCalls)).toBe(1);
  expect(await page.evaluate(() => window._databasePickerType)).toBe('save');
  expect(await page.evaluate(() => window._databasePickerOptions.suggestedName)).toBe('kapivatar.sqlite');
  await expect(page.locator('.conteudo-principal')).toBeVisible();
});
