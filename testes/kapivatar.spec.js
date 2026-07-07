import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Mock showDirectoryPicker
  await page.addInitScript(() => {
    window.showDirectoryPicker = async () => {
      return {
        kind: 'directory',
        name: 'mock-data',
      };
    };
  });
  await page.goto('/');
});

test('Deve realizar o login e navegar entre as páginas', async ({ page }) => {
  // 1. Login
  await expect(page.getByText('Entrar no Kapivatar')).toBeVisible();
  await page.getByRole('button', { name: 'Escolher pasta de dados' }).click();

  // 2. Verificar se está na página Início
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Início');

  // 3. Navegação: Perfis
  await page.getByRole('link', { name: 'Perfis', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Perfis');
  await expect(page.getByRole('button', { name: 'Criar perfil' })).toBeVisible();

  // 4. Navegação: Contatos
  await page.getByRole('link', { name: 'Contatos' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contatos');

  // 5. Navegação: Conversas
  await page.getByRole('link', { name: 'Conversas' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Conversas');

  // 6. Navegação: Início (voltar)
  await page.getByRole('link', { name: 'Início' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Início');
});

test('Deve realizar o logout', async ({ page }) => {
  // Realizar login primeiro
  await page.getByRole('button', { name: 'Escolher pasta de dados' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Início');

  // Logout
  await page.getByText('Sair').click();

  // Verificar se voltou para a tela de login
  await expect(page.getByText('Entrar no Kapivatar')).toBeVisible();
});
