import { test, expect } from './mocks/fs-mock.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();
});

test('Deve exibir o formulário de criação de perfil estilizado', async ({ page }) => {
  await page.getByRole('link', { name: /Selecionar perfil/, exact: true }).click();
  await page.getByRole('button', { name: /Criar perfil/ }).click();

  // Verifica se o formulário está visível e centralizado (via screenshot)
  const form = page.locator('.form-perfil');
  await expect(form).toBeVisible();
  await expect(form).toHaveScreenshot('formulario-estilizado.png');

  // Testa upload de imagem personalizada
  const capaInput = page.locator('input#capa');
  const capaButton = page.getByRole('button', { name: 'Escolher imagem' }).first();

  // Simula seleção de arquivo
  const filePath = path.join(__dirname, '../www/kapivatar.svg');
  await capaInput.setInputFiles(filePath);

  // Verifica se a prévia apareceu
  const previewContainer = page.locator('.form-campo:has-text("Capa") .preview-container');
  await expect(previewContainer).toBeVisible();
  await expect(previewContainer.locator('.nome-arquivo')).toHaveText('kapivatar.svg');
  await expect(previewContainer.locator('.preview-imagem')).toBeVisible();

  await expect(form).toHaveScreenshot('formulario-com-preview.png');
});
