import { test, expect } from './simulações/fixtures.js';

test('Deve anexar foto pelo menu de adição no perfil #assobios', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil com foto');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  await page.getByRole('button', { name: 'Adicionar ao assobio' }).click();
  await expect(page.getByRole('button', { name: 'Tirar foto' })).toBeVisible();
  await page.getByRole('button', { name: 'Escolher da galeria' }).click();
  await page.locator('.form-assobio input[type="file"]:not([capture])').setInputFiles({
    name: 'foto.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64'),
  });
  await expect(page.getByRole('img', { name: 'Pré-visualização da foto do assobio' })).toBeVisible();
  await page.getByRole('button', { name: 'Publicar assobio' }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByRole('img', { name: 'Imagem do assobio' })).toBeVisible();
  await expect(page.locator('.assobio-card-titulo')).not.toHaveAttribute('href');
});

test('Deve arquivar e restaurar um assobio pelo perfil #perfil #assobios', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil de Assobio');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Perfil de Assobio' })).toBeVisible();

  await page.locator('#novo-assobio').fill('Assobio arquivado');
  await page.getByRole('button', { name: 'Publicar assobio' }).click();
  await expect(page.getByText('Assobio arquivado')).toBeVisible();
  await page.getByRole('button', { name: /Ações para Perfil de Assobio/ }).click();
  await page.getByRole('button', { name: 'Arquivar' }).click();
  await expect(page.getByText('Assobio arquivado')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver arquivados' }).click();
  await expect(page.getByText('Assobio arquivado')).toBeVisible();
  await page.getByRole('button', { name: /Ações para Perfil de Assobio/ }).click();
  await page.getByRole('button', { name: 'Restaurar' }).click();
  await expect(page.getByText('Assobio arquivado')).toBeVisible();
});
