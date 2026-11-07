import { test, expect } from './simulações/fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Escolher arquivo kapivatar\.sqlite/ }).click();
});

test('Deve arquivar e restaurar um perfil', async ({ page }) => {
  // Criar um perfil primeiro
  await page.getByRole('link', { name: /Selecionar perfil/, exact: true }).click();
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil para Arquivar');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  // Verificar se o card aparece
  const card = page.locator('.perfil-card', { hasText: 'Perfil para Arquivar' });
  await expect(card).toBeVisible();

  // Abrir o menu de três pontos
  await card.getByRole('button', { name: /Ações para/ }).click();

  const menuArquivar = page.getByRole('button', { name: 'Arquivar perfil' });
  await expect(menuArquivar).toBeVisible();

  // Configurar para aceitar o confirm
  page.once('dialog', dialog => {
    expect(dialog.message()).toContain('Tem certeza que deseja arquivar o perfil');
    dialog.accept();
  });

  await menuArquivar.click();

  // O perfil sai da lista ativa sem ser excluído
  await expect(card).not.toBeVisible();
  await expect(page.getByText('Nenhum perfil encontrado.')).toBeVisible();

  await page.getByRole('button', { name: 'Arquivo' }).click();
  await expect(page).toHaveURL(/\/perfis\/arquivo/);
  const cardArquivado = page.locator('.perfil-card', { hasText: 'Perfil para Arquivar' });
  await expect(cardArquivado).toBeVisible();
  await cardArquivado.getByRole('button', { name: /Ações para/ }).click();
  await page.getByRole('button', { name: 'Restaurar perfil' }).click();

  await expect(page.getByText('Nenhum perfil arquivado.')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar aos perfis' }).click();
  await expect(page.locator('.perfil-card', { hasText: 'Perfil para Arquivar' })).toBeVisible();
});
