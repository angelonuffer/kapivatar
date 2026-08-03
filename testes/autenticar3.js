import { test, expect } from './simulações/file-system-access-api.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();
});

test('Deve exibir lista de perfis para o usuario selecionar em /autenticar', async ({ page }) => {
  // 1. Criar perfil
  await page.getByRole('link', { name: /Selecionar perfil/, exact: true }).click();
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Capivara Autorizada');
  await page.getByLabel('Bio').fill('Bio autorizada');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  // criar segundo perfil
  await page.evaluate(() => window.navegar('/perfis/criar'));
  await page.getByLabel('Nome').fill('Capivara Dois');
  await page.getByLabel('Bio').fill('Bio dois');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  // wait for it to be saved to idb
  await page.waitForTimeout(500);

  // set selection
  const cards = page.locator('.perfil-card');
  const cardDoisMenu = cards.nth(1).locator('.perfil-menu-botao');
  await cardDoisMenu.click();
  await page.getByRole('button', { name: 'Selecionar perfil' }).click();

  await page.waitForTimeout(500);

  // navegar para /autenticar
  await page.evaluate(() => {
    window.navegar('/autenticar?origin=http%3A%2F%2F127.0.0.1%3A3000');
  });

  await expect(page).toHaveURL(/\/autenticar\?origin=.*/);
  await expect(page.locator('h1')).toHaveText('Autorizar Conexão');

  await expect(page.locator('.perfil-card')).toHaveCount(1); // excluding the currently selected one

  // selecionar o segundo perfil (the one that wasn't selected)
  const card = page.locator('.perfil-card').first();
  await card.click();

  // wait for it to be selected
  await expect(page.locator('p').first()).toContainText('Capivara Autorizada');

  // 3. Mockar window.open, window.close e window.opener para simular o popup na mesma aba
  await page.evaluate(() => {
    window._receivedMessages = [];
    window.opener = {
      postMessage: (data, targetOrigin) => {
        if (data && data.tipo === "KAPIVATAR_AUTORIZADO") {
          window._receivedMessages.push(data);
        }
      }
    };
    window.close = () => {
      window.navegar('/perfil-autenticado?origin=http%3A%2F%2F127.0.0.1%3A3000');
    };
  });

  await page.getByRole('button', { name: 'Autorizar' }).click();

  await expect(page).toHaveURL(/\/perfil-autenticado\?origin=.*/);

  const messagesCount = await page.evaluate(() => {
    return window._receivedMessages.length;
  });
  expect(messagesCount).toBeGreaterThan(0);
});
