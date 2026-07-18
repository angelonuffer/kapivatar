import { test, expect } from './simulações/file-system-access-api.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();
});

test('Deve remover um perfil da lista e aparecer no histórico', async ({ page }) => {
  // Criar um perfil primeiro
  await page.getByRole('link', { name: /Selecionar perfil/, exact: true }).click();
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil para Remover');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  // Verificar se o card aparece
  const card = page.locator('.perfil-card', { hasText: 'Perfil para Remover' });
  await expect(card).toBeVisible();

  // Abrir o menu de três pontos
  await card.getByRole('button', { name: /Ações para/ }).click();

  const menuRemover = page.getByRole('button', { name: 'Remover perfil' });
  await expect(menuRemover).toBeVisible();

  // Configurar para aceitar o confirm
  page.once('dialog', dialog => {
    expect(dialog.message()).toContain('Tem certeza que deseja remover o perfil');
    dialog.accept();
  });

  // Clicar em remover
  await menuRemover.click();

  // Verificar se o card sumiu
  await expect(card).not.toBeVisible();
  await expect(page.getByText('Nenhum perfil encontrado.')).toBeVisible();

  // Verificar histórico
  await page.getByRole('button', { name: 'Histórico' }).click();
  // Deve ter 2 versões: a criação e a remoção
  await expect(page.locator('.historico ul li')).toHaveCount(2);
});
