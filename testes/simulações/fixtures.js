import { mergeTests, expect } from '@playwright/test';
import { test as externalRequests } from './rede.js';
import { test as mqtt } from './mqtt.js';
import { test as fileSystemAccessApi } from './file-system-access-api.js';

export const test = mergeTests(externalRequests, mqtt, fileSystemAccessApi);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  const fontes = await page.evaluate(async () =>
    (await document.fonts.load('24px "Material Symbols Outlined"', 'home')).length,
  );
  if (!fontes) throw new Error('A fonte Material Symbols não foi carregada.');
});

export { expect };
