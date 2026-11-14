import { test, expect, criar_perfil_teste } from './simulações/fixtures.js';

test('Deve mostrar tela de permissão quando o arquivo existe mas não tem permissão #permissao #arquivo', async ({ page }) => {
  await criar_perfil_teste(page);
  await expect(page.locator('.conteudo-principal')).toBeVisible();

  // 2. Recarregar a página simulando que a permissão foi "perdida" (prompt)
  await page.evaluate(() => {
    sessionStorage.setItem('_permissionState', 'prompt');
  });
  await page.reload();

  // 3. Verificar se a tela de permissão é exibida
  await expect(page.getByText('Permissão Necessária')).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Permitir Acesso' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sair e trocar perfil' })).toBeVisible();

  // 4. Clicar em permitir e verificar se entra no app
  await page.getByRole('button', { name: 'Permitir Acesso' }).click();
  await expect(page.getByRole('heading', { name: 'Perfil de Teste' })).toBeVisible();
});

test('Deve permitir sair e limpar o arquivo da tela de permissão #permissao #arquivo', async ({ page }) => {
  await criar_perfil_teste(page);
  await expect(page.locator('.conteudo-principal')).toBeVisible();

  // 2. Simular perda de permissão e recarregar
  await page.evaluate(() => {
    sessionStorage.setItem('_permissionState', 'prompt');
  });
  await page.reload();

  // 3. Clicar em Sair
  await page.getByRole('button', { name: 'Sair e trocar perfil' }).click();

  // 4. Verificar se voltou para a tela de login (escolher pasta)
  await expect(page.getByText('Entrar no Kapivatar')).toBeVisible();
  await expect(page.getByRole('button', { name: /Abrir perfil/ })).toBeVisible();
});
