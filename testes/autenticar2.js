import { test, expect } from './simulações/file-system-access-api.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();
});

test('Deve permitir criar perfil diretamente pela tela de autenticacao caso o usuario nao tenha nenhum perfil registrado', async ({ page }) => {
  await page.evaluate(() => {
    window.navegar('/autenticar?origin=http%3A%2F%2F127.0.0.1%3A3000');
  });

  await expect(page).toHaveURL(/\/autenticar\?origin=.*/);
  await expect(page.locator('h1')).toHaveText('Autorizar Conexão');
  await expect(page.locator('p').first()).toContainText('O aplicativo http://127.0.0.1:3000 deseja se conectar ao seu perfil Kapivatar');

  await expect(page.getByLabel('Nome')).toBeVisible();
  await expect(page.getByLabel('Bio')).toBeVisible();

  await page.getByLabel('Nome').fill('Capivara Automatica');
  await page.getByLabel('Bio').fill('Bio automatica');

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

  await page.getByRole('button', { name: 'Criar Perfil e Autorizar' }).click();

  await expect(page).toHaveURL(/\/perfil-autenticado\?origin=.*/);

  const messagesCount = await page.evaluate(() => {
    return window._receivedMessages.length;
  });
  expect(messagesCount).toBeGreaterThan(0);
});
