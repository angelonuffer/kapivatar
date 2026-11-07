import { test, expect } from './simulações/fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Deve mostrar tela de permissão quando o arquivo existe mas não tem permissão', async ({ page }) => {
  // 1. Selecionar o arquivo e salvar o handle no IndexedDB
  await page.getByRole('button', { name: /Abrir arquivo kapivatar\.sqlite/ }).click();

  // 2. Recarregar a página simulando que a permissão foi "perdida" (prompt)
  await page.evaluate(() => {
    sessionStorage.setItem('_permissionState', 'prompt');
  });
  await page.reload();

  // 3. Verificar se a tela de permissão é exibida
  await expect(page.getByText('Permissão Necessária')).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Permitir Acesso' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sair e trocar arquivo' })).toBeVisible();

  // 4. Clicar em permitir e verificar se entra no app
  await page.getByRole('button', { name: 'Permitir Acesso' }).click();
  await expect(page.getByText('Bem-vindo ao Kapivatar!')).toBeVisible();
});

test('Deve permitir sair e limpar o arquivo da tela de permissão', async ({ page }) => {
  // 1. Selecionar o banco
  await page.getByRole('button', { name: /Abrir arquivo kapivatar\.sqlite/ }).click();

  // 2. Simular perda de permissão e recarregar
  await page.evaluate(() => {
    sessionStorage.setItem('_permissionState', 'prompt');
  });
  await page.reload();

  // 3. Clicar em Sair
  await page.getByRole('button', { name: 'Sair e trocar arquivo' }).click();

  // 4. Verificar se voltou para a tela de login (escolher pasta)
  await expect(page.getByText('Entrar no Kapivatar')).toBeVisible();
  await expect(page.getByRole('button', { name: /Abrir arquivo kapivatar\.sqlite/ })).toBeVisible();
});
