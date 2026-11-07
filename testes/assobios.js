import { test, expect } from './simulações/fixtures.js';

test('Deve criar, editar, arquivar e consultar o histórico de um assobio', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Abrir arquivo SQLite/ }).click();
  await page.getByRole('link', { name: /Selecionar perfil/, exact: true }).click();
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil de Assobio');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();
  await expect(page.locator('.perfil-card').first()).toBeVisible();

  await page.goto('/assobios/criar');
  await page.getByLabel('Perfil').selectOption({ label: 'Perfil de Assobio' });
  await page.getByLabel('Data').fill('2026-11-07');
  await page.getByLabel('Nota').fill('Primeira nota');
  await page.getByRole('button', { name: 'Salvar Assobio' }).click();
  await expect(page.getByText('Primeira nota')).toBeVisible();

  const url = page.url();
  await page.goto(`${url}/editar`);
  await page.getByLabel('Nota').fill('Nota atualizada');
  await page.getByRole('button', { name: 'Salvar Assobio' }).click();
  await expect(page.getByText('Nota atualizada')).toBeVisible();

  await page.goto(`${url}/histórico`);
  const historico = page.locator('.conteudo-pagina a');
  await expect(historico).toHaveCount(2);
  await historico.last().click();
  await expect(page.getByText('Primeira nota')).toBeVisible();

  await page.goto('/assobios');
  await page.getByRole('button', { name: /Ações para Perfil de Assobio/ }).click();
  await page.getByRole('button', { name: 'Arquivar' }).click();
  await page.goto('/assobios/arquivo');
  await expect(page.getByText('Nota atualizada')).toBeVisible();
  await page.getByRole('button', { name: /Ações para Perfil de Assobio/ }).click();
  await page.getByRole('button', { name: 'Restaurar' }).click();
  await page.goto('/assobios');
  await expect(page.getByText('Nota atualizada')).toBeVisible();
});
