import { test, expect } from './simulações/fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Deve selecionar entre foto de perfil privada e pública #perfil #foto', async ({ page }) => {
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil com Visibilidade');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  await page.getByRole('button', { name: 'Alterar foto de perfil' }).click();
  await expect(page).toHaveURL(/\/perfil\/foto\/editar$/);
  await expect(page.getByRole('radio', { name: 'Privado' })).toBeChecked();

  await page.locator('#foto-perfil-nova').setInputFiles({
    name: 'perfil.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await page.getByRole('radio', { name: 'Público' }).check();
  await page.getByRole('button', { name: 'Salvar foto' }).click();
  await expect(page).toHaveURL(/\/perfil$/);

  await page.getByRole('button', { name: 'Alterar foto de perfil' }).click();
  await expect(page.getByRole('radio', { name: 'Público' })).toBeChecked();
});

test('Deve criar e exibir o perfil único do arquivo de dados #perfil #arquivo', async ({ page }) => {
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await expect(page).toHaveURL(/\/perfil\/criar$/);

  await page.getByLabel('Nome').fill('Capivara de Teste');
  await page.getByLabel('Bio', { exact: true }).fill('Uma bio de teste');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByRole('heading', { name: 'Capivara de Teste' })).toBeVisible();
  const banco = await page.evaluate(() => window._files.get('Capivara de Teste.kapivatar'));
  expect(new TextDecoder().decode(banco.slice(0, 16))).toBe('SQLite format 3\u0000');
  expect(banco.byteLength).toBeGreaterThan(100);

  await page.reload();
  await page.goto('/perfil');
  await expect(page.getByRole('heading', { name: 'Capivara de Teste' })).toBeVisible();
});

test('Deve abrir a página Assobiar pelo menu de ações do perfil #perfil #assobios', async ({ page }) => {
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil para Assobiar');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  await expect(page.locator('#novo-assobio')).toHaveCount(0);
  await page.getByRole('button', { name: 'Assobiar' }).click();
  await expect(page).toHaveURL(/\/assobiar$/);
  await expect(page.getByRole('heading', { name: 'Assobiar' })).toBeVisible();
  await expect(page.locator('#novo-assobio')).toBeVisible();
});

test('Deve publicar assobios no perfil em ordem decrescente de data #perfil #assobios', async ({ page }) => {
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil de Assobios');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Perfil de Assobios' })).toBeVisible();
  await page.getByRole('button', { name: 'Assobiar' }).click();

  const campo_assobio = page.locator('#novo-assobio');
  await campo_assobio.fill('Assobio mais antigo');
  await page.getByRole('button', { name: 'Publicar assobio' }).click();
  await expect(page.getByText('Assobio mais antigo')).toBeVisible();

  await page.getByRole('button', { name: 'Assobiar' }).click();
  await campo_assobio.fill('Assobio mais recente');
  await page.getByRole('button', { name: 'Publicar assobio' }).click();

  const cartoes = page.locator('.assobio-card-nota');
  await expect(cartoes).toHaveText(['Assobio mais recente', 'Assobio mais antigo']);
});

test('Deve publicar atributos de tipos diferentes no assobio #perfil #assobios', async ({ page }) => {
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil com Atributos');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Perfil com Atributos' })).toBeVisible();
  await page.getByRole('button', { name: 'Assobiar' }).click();

  const adicionar_atributo = async () => {
    await page.getByRole('button', { name: 'Atributo', exact: true }).click();
  };
  const escolher_tipo = async (linha, tipo, icone) => {
    await linha.getByRole('button', { name: /^Tipo do atributo:/ }).click();
    await expect(linha.locator('.opcao-tipo-atributo')).toHaveCount(3);
    await expect(linha.locator('.opcao-tipo-atributo')).toContainText(['Texto', 'Número', 'Lógico']);
    await linha.getByRole('button', { name: tipo, exact: true }).click();
    await expect(linha.locator('.botao-tipo-atributo')).toHaveText(icone);
  };
  await adicionar_atributo();
  const linhas = page.locator('.linha-atributo-assobio');
  await linhas.nth(0).getByLabel('Nome do atributo').fill('Habitat');
  await linhas.nth(0).getByLabel('Valor do atributo').fill('Floresta');

  await adicionar_atributo();
  await linhas.nth(1).getByLabel('Nome do atributo').fill('População');
  await escolher_tipo(linhas.nth(1), 'Número', 'numbers');
  await linhas.nth(1).getByLabel('Valor do atributo').fill('42');

  await adicionar_atributo();
  await linhas.nth(2).getByLabel('Nome do atributo').fill('Noturna');
  await escolher_tipo(linhas.nth(2), 'Lógico', 'toggle_on');
  await linhas.nth(2).getByLabel('Valor do atributo').selectOption('true');

  const dimensoes = await page.locator('.form-assobio').evaluate((form) => {
    const pagina = form.parentElement;
    const estilo = getComputedStyle(pagina);
    return {
      largura_util: pagina.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight),
      largura_formulario: form.getBoundingClientRect().width,
      larguras_campos: [...form.querySelectorAll('.nome-atributo-assobio, .valor-atributo-assobio')]
        .map((campo) => campo.getBoundingClientRect().width),
    };
  });
  expect(dimensoes.largura_formulario).toBeCloseTo(dimensoes.largura_util, 0);
  for (const largura of dimensoes.larguras_campos) {
    expect(largura).toBeCloseTo(dimensoes.largura_formulario, 0);
  }

  await page.getByRole('button', { name: 'Publicar assobio' }).click();

  await expect(page.locator('.assobio-atributo span')).toHaveText([
    'Habitat',
    'Floresta',
    'População',
    '42',
    'Noturna',
    'Verdadeiro',
  ]);
  await expect(page.locator('.assobio-card-titulo')).not.toHaveAttribute('href');
});

test('Deve exibir as ações de assobio em linhas de largura total #perfil', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  await page.getByLabel('Nome').fill('Perfil com Ações');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Perfil com Ações' })).toBeVisible();
  await page.getByRole('button', { name: 'Mais opções' }).click();
  await page.getByRole('button', { name: 'Assobiar' }).click();

  const botoes = page.locator('.acoes-assobio button, .botao-publicar-assobio');
  await expect(botoes).toHaveCount(4);
  for (const nome of ['Tirar foto', 'Escolher da galeria', 'Atributo', 'Publicar assobio']) {
    await expect(page.getByRole('button', { name: nome, exact: true })).toBeVisible();
  }
  const dimensoes = await page.locator('.form-assobio').evaluate((form) => {
    const largura_form = form.clientWidth;
    const botoes = [...form.querySelectorAll('.acoes-assobio button, .botao-publicar-assobio')];
    return {
      larguras: botoes.map((botao) => botao.getBoundingClientRect().width),
      posicoes: botoes.map((botao) => botao.getBoundingClientRect().top),
      largura_form,
    };
  });
  expect(dimensoes.larguras).toEqual(dimensoes.larguras.map(() => dimensoes.largura_form));
  expect(dimensoes.posicoes).toEqual([...dimensoes.posicoes].sort((a, b) => a - b));
});
