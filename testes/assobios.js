import { test, expect } from './simulações/fixtures.js';

test('Deve criar, editar, arquivar e consultar o histórico de um assobio', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Abrir arquivo SQLite/ }).click();
  await page.getByRole('link', { name: /Criar perfil/, exact: true }).click();
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil de Assobio');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Perfil de Assobio' })).toBeVisible();

  await page.goto('/assobios/criar');
  await page.locator('#perfil').selectOption({ label: 'Perfil de Assobio' });
  await expect(page.getByLabel('Data')).toHaveAttribute('type', 'datetime-local');
  await expect(page.locator('.form-assobio label')).toHaveText(['Perfil', 'Data', 'Imagem', 'Nota']);
  await page.getByLabel('Data').fill('2026-11-07T13:45');
  const botao_descricao = page.getByRole('button', { name: 'Gerar descrição da imagem' });
  await expect(botao_descricao).not.toBeVisible();
  await page.getByRole('button', { name: 'Salvar Assobio' }).click();
  await expect(page).toHaveURL(/\/assobios\/criar$/);
  expect(await page.getByLabel('Nota').evaluate(input => input.validity.valid)).toBe(false);
  await page.getByLabel('Imagem', { exact: true }).setInputFiles({
    name: 'assobio.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64'),
  });
  await expect(botao_descricao).toBeVisible();
  expect(await page.getByLabel('Nota').evaluate(input => input.validity.valid)).toBe(true);
  await page.getByRole('button', { name: 'Salvar Assobio' }).click();
  const imagem_assobio = page.getByRole('img', { name: 'Imagem do assobio', exact: true });
  await expect(imagem_assobio).toBeVisible();
  await expect(page.getByText('Primeira nota')).toHaveCount(0);
  const largura_imagem = await imagem_assobio.evaluate(imagem => {
    const estilo = getComputedStyle(imagem.parentElement);
    return {
      imagem: imagem.getBoundingClientRect().width,
      conteudo: imagem.parentElement.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight),
    };
  });
  expect(Math.abs(largura_imagem.imagem - largura_imagem.conteudo), JSON.stringify(largura_imagem)).toBeLessThan(1);

  const url = page.url();
  await page.goto(`${url}/editar`);
  await page.getByLabel('Nota').fill('Nota atualizada');
  await page.getByRole('button', { name: 'Salvar Assobio' }).click();
  await expect(page.getByText('Nota atualizada')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Imagem do assobio' })).toBeVisible();

  await page.goto(`${url}/histórico`);
  const historico = page.locator('.conteudo-pagina a');
  await expect(historico).toHaveCount(2);
  await historico.last().click();
  await expect(page.getByRole('img', { name: 'Imagem do assobio' })).toBeVisible();

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
