import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Mock File System Access API
  await page.addInitScript(() => {
    const files = new Map();
    window._files = files;

    window.MockDirectoryHandle = class MockDirectoryHandle {
      constructor() {
        this.kind = 'directory';
        this.name = 'mock-data';
      }
      async getFileHandle(name, options = {}) {
        if (!files.has(name) && !options.create) {
          const error = new Error('File not found');
          error.name = 'NotFoundError';
          throw error;
        }
        if (!files.has(name) && options.create) {
          files.set(name, '');
        }
        return new window.MockFileHandle(name);
      }
    };

    window.MockFileHandle = class MockFileHandle {
      constructor(name) {
        this.name = name;
        this.kind = 'file';
      }
      async getFile() {
        const content = files.get(this.name);
        if (content === undefined) {
          throw new Error('File not found');
        }
        const blob = new Blob([content]);
        blob.text = async () => typeof content === 'string' ? content : new TextDecoder().decode(content);
        return blob;
      }
      async createWritable() {
        return new window.MockWritableStream(this.name);
      }
    };

    window.MockWritableStream = class MockWritableStream {
      constructor(name) {
        this.name = name;
      }
      async write(content) {
        files.set(this.name, content);
      }
      async close() {}
    };

    window.showDirectoryPicker = async () => new window.MockDirectoryHandle();

  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Escolher pasta de dados' }).click();
});

test('Deve criar um perfil e listar no histórico', async ({ page }) => {
  await page.getByRole('link', { name: 'Perfis', exact: true }).click();
  await page.getByRole('button', { name: 'Criar perfil' }).click();

  await page.getByLabel('Nome').fill('Capivara de Teste');
  await page.getByLabel('Bio').fill('Uma bio de teste');

  const saveButton = page.getByRole('button', { name: 'Salvar Perfil' });
  await saveButton.click();

  // Aguardar o redirecionamento verificando o título da página
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Perfis');

  // Verificar se o perfil aparece
  await expect(page.getByRole('heading', { level: 3 })).toHaveText('Capivara de Teste');
  await expect(page.getByText('Uma bio de teste')).toBeVisible();

  // Criar segundo perfil para testar histórico
  await page.getByRole('button', { name: 'Criar perfil' }).click();
  await page.getByLabel('Nome').fill('Segunda Capivara');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  await expect(page.getByText('Segunda Capivara')).toBeVisible();

  // Verificar se o histórico apareceu
  await expect(page.getByRole('heading', { level: 2, name: 'Histórico de Versões' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Versão:/ })).toHaveCount(1);
});
