import { test, expect } from './simulações/fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Deve criar e exibir o perfil único do arquivo de dados #perfil #arquivo', async ({ page }) => {
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await expect(page).toHaveURL(/\/perfil\/criar$/);

  await page.getByLabel('Nome').fill('Capivara de Teste');
  await page.getByLabel('Bio', { exact: true }).fill('Uma bio de teste');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByRole('heading', { name: 'Capivara de Teste' })).toBeVisible();
  const banco = await page.evaluate(() => window._files.get('Capivara de Teste.kapivatar'));
  expect(new TextDecoder().decode(banco.slice(0, 16))).toBe('SQLite format 3\u0000');
  expect(banco.byteLength).toBeGreaterThan(100);

  await page.reload();
  await page.goto('/perfil');
  await expect(page.getByRole('heading', { name: 'Capivara de Teste' })).toBeVisible();
});

test('Deve publicar assobios no perfil em ordem decrescente de data #perfil #assobios', async ({ page }) => {
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil de Assobios');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Perfil de Assobios' })).toBeVisible();

  const campo_assobio = page.locator('#novo-assobio');
  await campo_assobio.fill('Assobio mais antigo');
  await page.getByRole('button', { name: 'Publicar assobio' }).click();
  await expect(page.getByText('Assobio mais antigo')).toBeVisible();

  await page.waitForTimeout(20);
  await campo_assobio.fill('Assobio mais recente');
  await page.getByRole('button', { name: 'Publicar assobio' }).click();

  const cartoes = page.locator('.assobio-card-nota');
  await expect(cartoes).toHaveText(['Assobio mais recente', 'Assobio mais antigo']);
});

test('Deve publicar atributos de tipos diferentes no assobio #perfil #assobios', async ({ page }) => {
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil com Atributos');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Perfil com Atributos' })).toBeVisible();

  const adicionar_atributo = async () => {
    await page.getByRole('button', { name: 'Adicionar ao assobio' }).click();
    await page.getByRole('button', { name: 'Atributo', exact: true }).click();
  };
  await adicionar_atributo();
  const linhas = page.locator('.linha-atributo-assobio');
  await linhas.nth(0).getByLabel('Nome do atributo').fill('Habitat');
  await linhas.nth(0).getByLabel('Valor do atributo').fill('Floresta');

  await adicionar_atributo();
  await linhas.nth(1).getByLabel('Nome do atributo').fill('População');
  await linhas.nth(1).getByLabel('Tipo do atributo').selectOption('numero');
  await linhas.nth(1).getByLabel('Valor do atributo').fill('42');

  await adicionar_atributo();
  await linhas.nth(2).getByLabel('Nome do atributo').fill('Noturna');
  await linhas.nth(2).getByLabel('Tipo do atributo').selectOption('logico');
  await linhas.nth(2).getByLabel('Valor do atributo').selectOption('true');

  await page.getByRole('button', { name: 'Publicar assobio' }).click();
  await expect(page.locator('.assobio-atributo span')).toHaveText([
    'Habitat',
    'Floresta',
    'População',
    '42',
    'Noturna',
    'Verdadeiro',
  ]);

  await page.goto('/assobios');
  await page.locator('.assobio-card-titulo').click();
  await expect(page.locator('.assobio-atributo span')).toHaveText([
    'Habitat',
    'Floresta',
    'População',
    '42',
    'Noturna',
    'Verdadeiro',
  ]);
});

test('Deve fechar o menu de adição ao interagir fora dele #perfil', async ({ page }) => {
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil com Menu');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Perfil com Menu' })).toBeVisible();

  await page.getByRole('button', { name: 'Adicionar ao assobio' }).click();
  await expect(page.getByRole('button', { name: 'Tirar foto' })).toBeVisible();

  await page.getByRole('heading', { name: 'Perfil com Menu' }).click();
  await expect(page.getByRole('button', { name: 'Tirar foto' })).toBeHidden();
});
