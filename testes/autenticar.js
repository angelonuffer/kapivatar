import { test, expect } from './simulações/file-system-access-api.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();
});

test('Deve realizar o fluxo de autenticação e comunicação via postMessage', async ({ page }) => {
  // 1. Criar perfil
  await page.getByRole('link', { name: /Selecionar perfil/, exact: true }).click();
  await page.getByRole('button', { name: /Criar perfil/ }).click();

  await page.getByLabel('Nome').fill('Capivara Autorizada');
  await page.getByLabel('Bio').fill('Bio autorizada');

  // Adicionar uma foto para testar a renderização da imagem
  const fotoInput = page.locator('input#foto');
  const filePath = path.join(__dirname, '../www/kapivatar.svg');
  await fotoInput.setInputFiles(filePath);

  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  // Selecionar o perfil criado
  const card = page.locator('.perfil-card').first();
  await card.locator('.perfil-menu-botao').click();
  await page.getByRole('button', { name: 'Selecionar perfil' }).click();

  // 2. Navegar para /perfil_autenticado sem autorização prévia usando window.navegar
  await page.evaluate(() => {
    window.navegar('/perfil_autenticado?origin=http%3A%2F%2F127.0.0.1%3A3000');
  });

  // Deve exibir o ícone genérico de perfil
  const iconGen = page.locator('.perfil-autenticado-icon');
  await expect(iconGen).toBeVisible();

  // 3. Mockar window.open, window.close e window.opener para simular o popup na mesma aba
  await page.evaluate(() => {
    window.open = (url) => {
      window.navegar(url);
      return window;
    };
  });

  // Configurar escuta para postMessage enviados pelo iframe para a página mãe
  await page.evaluate(() => {
    window._receivedMessages = [];
    window.addEventListener('message', (event) => {
      if (event.data && typeof event.data === 'object' && event.data.kind === 'directory') {
        window._receivedMessages.push(event.data);
      }
    });
  });

  // Clicar no iframe (container) para iniciar a autorização
  await page.locator('.perfil-autenticado-container').click();

  // Deve ter navegado para a página de autorização
  await expect(page).toHaveURL(/\/autenticar\?origin=.*/);
  await expect(page.locator('h1')).toHaveText('Autorizar Conexão');
  await expect(page.locator('p')).toContainText('O aplicativo http://127.0.0.1:3000 deseja se conectar ao seu perfil Kapivatar (Capivara Autorizada)');

  // Mockar window.opener e window.close na página de autorização
  await page.evaluate(() => {
    window.opener = {
      postMessage: (data, targetOrigin) => {
        sessionStorage.setItem('_authMessage', JSON.stringify(data));
      }
    };
    window.close = () => {
      window.navegar('/perfil_autenticado?origin=http%3A%2F%2F127.0.0.1%3A3000');
    };
  });

  // Clicar em "Autorizar"
  await page.getByRole('button', { name: 'Autorizar' }).click();

  // Agora deve ter voltado para o /perfil_autenticado com autorização concedida
  await expect(page).toHaveURL(/\/perfil_autenticado\?origin=.*/);

  // Não deve exibir mais o ícone genérico de perfil
  await expect(page.locator('.perfil-autenticado-icon')).not.toBeVisible();

  // Vamos verificar se o postMessage com o subdiretório foi enviado
  const messagesCount = await page.evaluate(() => {
    return window._receivedMessages.length;
  });
  expect(messagesCount).toBeGreaterThan(0);

  const directoryHandleName = await page.evaluate(() => {
    return window._receivedMessages[0].name;
  });
  expect(directoryHandleName).toHaveLength(64);
});
