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
  await expect(page.locator('.pagina-titulo')).toHaveText('Início');

  // 3. Navegação: Perfis
  // Tentando encontrar o link de forma mais genérica
  await page.click('a[href="/perfis"]');
  await expect(page.locator('.pagina-titulo')).toHaveText('Perfis');
  await expect(page.getByRole('button', { name: 'Criar perfil' })).toBeVisible();

  // 4. Navegação: Contatos
  await page.click('a[href="/contatos"]');
  await expect(page.locator('.pagina-titulo')).toHaveText('Contatos');

  // 5. Navegação: Conversas
  await page.click('a[href="/conversas"]');
  await expect(page.locator('.pagina-titulo')).toHaveText('Conversas');

  // 6. Navegação: Início (voltar)
  await page.click('a[href="/"]');
  await expect(page.locator('.pagina-titulo')).toHaveText('Início');
});

test('Deve realizar o logout', async ({ page }) => {
  // Realizar login primeiro
  await page.getByRole('button', { name: 'Escolher pasta de dados' }).click();
  await expect(page.locator('.pagina-titulo')).toHaveText('Início');

  // Logout
  await page.click('a:has-text("Sair")');

  // Verificar se voltou para a tela de login
  await expect(page.getByText('Entrar no Kapivatar')).toBeVisible();
});
