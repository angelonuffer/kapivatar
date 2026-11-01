import { test, expect } from './simulações/file-system-access-api.js';

test.use({ useMockIndexedDB: false });

test('Deve persistir perfis usando o IndexedDB nativo', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.indexedDB instanceof IDBFactory)).toBe(true);

  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();
  await page.getByRole('link', { name: /Selecionar perfil/, exact: true }).click();
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil no IndexedDB nativo');
  await page.getByLabel('Bio').fill('Persistência real');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  await expect(page.locator('.perfil-card')).toContainText('Perfil no IndexedDB nativo');

  await page.reload();
  await expect(page.locator('.perfil-card')).toContainText('Perfil no IndexedDB nativo');
});
