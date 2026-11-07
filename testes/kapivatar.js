import { test, expect } from './simulações/fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Deve realizar o login e navegar entre as páginas', async ({ page }) => {
  // 1. Login
  await page.getByRole('button', { name: /Abrir arquivo SQLite/ }).click();
  await expect.poll(() => page.evaluate(() => window._databasePickerCalls)).toBe(1);
  expect(await page.evaluate(() => window._databasePickerType)).toBe('open');
  expect(await page.evaluate(() => window._databasePickerOptions.types[0].accept['application/vnd.sqlite3'])).toEqual(['.sqlite']);

  // 2. Verificar se está na página Início
  await expect(page.locator('.conteudo-principal')).toBeVisible();

  const itens_sidebar = await page.locator('.sidebar .menu > a').evaluateAll((links) =>
    links.map((link) => {
      const { width, height, top } = link.getBoundingClientRect();
      return { width, height, top, direction: getComputedStyle(link).flexDirection };
    })
  );
  expect(itens_sidebar.length).toBeGreaterThan(0);
  expect(itens_sidebar.every((item) => item.width === 56 && item.height === 56 && item.direction === 'column')).toBe(true);
  expect(itens_sidebar.map((item) => item.top)).toEqual(
    [...itens_sidebar.map((item) => item.top)].sort((a, b) => a - b)
  );

  // 3. Navegação: Perfis (via link de seleção na sidebar quando nenhum perfil está selecionado)
  await page.getByRole('link', { name: /Selecionar perfil/, exact: true }).click();
  await expect(page.locator('.conteudo-pagina')).toBeVisible();
});

test('Deve mostrar a navegação inferior em mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.getByRole('button', { name: /Abrir arquivo SQLite/ }).click();

  const navegacao = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(navegacao).toBeVisible();
  expect(await navegacao.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(5);
  expect(await navegacao.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label'))))
    .toEqual(['Início', 'Assobios', 'Perfis', 'Contatos', 'Dispositivos']);
  await expect(navegacao.locator('.navegacao-inferior-item > span:nth-child(2)')).toHaveText(['Início', 'Assobios', 'Perfis', 'Contatos', 'Dispositivos']);
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await expect(page.locator('.botao-menu')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Mais opções' })).not.toBeVisible();

  await navegacao.getByRole('button', { name: 'Assobios' }).click();
  await expect(page).toHaveURL(/\/assobios$/);
  await expect(navegacao.getByRole('button', { name: 'Assobios' })).toHaveClass(/ativo/);
  await expect(navegacao.getByRole('button', { name: 'Assobios' })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('button', { name: 'Mais opções' }).click();
  await page.getByRole('button', { name: 'Criar assobio' }).click();
  await expect(page).toHaveURL(/\/assobios\/criar$/);
  await expect(navegacao.getByRole('button', { name: 'Assobios' })).toHaveClass(/ativo/);

  await page.evaluate(() => window.navegar('/assobio/teste'));
  await expect(page).toHaveURL(/\/assobio\/teste$/);
  await expect(navegacao.getByRole('button', { name: 'Assobios' })).toHaveClass(/ativo/);

  await navegacao.getByRole('button', { name: 'Perfis' }).click();
  await expect(page).toHaveURL(/\/perfis$/);

  const menu_acoes = page.getByRole('button', { name: 'Mais opções' });
  await expect(menu_acoes).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar perfil' })).not.toBeVisible();
  await menu_acoes.click();
  await expect(page.getByRole('button', { name: 'Criar perfil' })).toBeVisible();
  await page.getByRole('button', { name: 'Criar perfil' }).click();
  await expect(page).toHaveURL(/\/perfis\/criar$/);

  await navegacao.getByRole('button', { name: 'Dispositivos' }).click();
  await expect(page).toHaveURL(/\/dispositivos$/);
  await expect(page.locator('.dispositivo-card')).toHaveCount(1);
});

test('Deve realizar o logout', async ({ page }) => {
  // Realizar login primeiro
  await page.evaluate(() => { window._databasePickerSelectedName = 'arquivo-pessoal.sqlite'; });
  await page.getByRole('button', { name: /Abrir arquivo SQLite/ }).click();
  await expect(page.locator('.conteudo-pagina')).toBeVisible();

  await page.getByRole('link', { name: 'Dispositivos' }).click();
  await expect(page.locator('.dispositivo-card')).toHaveCount(1);
  await expect(page.locator('.dispositivo-arquivo')).toContainText('arquivo-pessoal.sqlite');
  await expect(page.getByRole('button', { name: 'Sair deste dispositivo' })).toBeVisible();

  await page.getByRole('button', { name: 'Sair deste dispositivo' }).click();
  await expect(page.getByRole('button', { name: /Abrir arquivo SQLite/ })).toBeVisible();
});

test('Deve parear dispositivos pelo MQTT sem publicar a chave secreta', async ({ page }) => {
  await page.getByRole('button', { name: /Abrir arquivo SQLite/ }).click();
  await page.getByRole('link', { name: 'Dispositivos' }).click();
  await page.getByRole('button', { name: 'Parear dispositivo' }).click();

  const minha_chave = page.locator('#chave_secreta_dispositivo')
  await expect(minha_chave).toHaveValue(/^[A-Za-z0-9_-]{43}$/);
  const chave = await minha_chave.inputValue();
  const chave_outro_dispositivo = await page.evaluate(() => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    let binario = '';
    for (const byte of bytes) binario += String.fromCharCode(byte);
    return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  });

  await page.getByLabel('Chave secreta do outro dispositivo').fill(chave_outro_dispositivo);
  await page.getByRole('button', { name: 'Parear', exact: true }).click();

  const publicacao = await page.evaluate(() => window._publishedMessages.at(-1));
  expect(publicacao.topic).toMatch(/^kapivatar\.net\/pareamento\/[a-f0-9]{64}$/);
  expect(JSON.stringify(publicacao.message)).not.toContain(chave_outro_dispositivo);
  expect(publicacao.message.versao).toBe(1);
  expect(publicacao.message.iv).toMatch(/^[A-Za-z0-9_-]{16}$/);

  const solicitacao = await page.evaluate(async ({ pacote, segredo }) => {
    const decodificar = (valor) => {
      const base64 = valor.replace(/-/g, '+').replace(/_/g, '/');
      const binario = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
      return Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
    };
    const bytes = decodificar(segredo);
    const material = await crypto.subtle.importKey('raw', bytes, 'HKDF', false, ['deriveKey']);
    const chave_aes = await crypto.subtle.deriveKey({
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('kapivatar-pareamento-v1'),
      info: new TextEncoder().encode('mqtt-e2e'),
    }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const dados = await crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv: decodificar(pacote.message.iv),
      additionalData: new TextEncoder().encode(pacote.topic),
    }, chave_aes, decodificar(pacote.message.dados));
    return JSON.parse(new TextDecoder().decode(dados));
  }, { pacote: publicacao, segredo: chave_outro_dispositivo });

  expect(solicitacao.tipo).toBe('solicitacao');
  expect(solicitacao.dispositivo.id).toMatch(/^[0-9a-f-]{36}$/i);

  const id_dispositivo_remoto = await page.evaluate(() => crypto.randomUUID());
  await page.evaluate(async ({ topic, secret, id, requestId }) => {
    const codificar = (valor) => {
      const bytes = new Uint8Array(valor);
      let binario = '';
      for (const byte of bytes) binario += String.fromCharCode(byte);
      return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    };
    const decodificar = (valor) => {
      const base64 = valor.replace(/-/g, '+').replace(/_/g, '/');
      const binario = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
      return Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
    };
    const material = await crypto.subtle.importKey('raw', decodificar(secret), 'HKDF', false, ['deriveKey']);
    const chave_aes = await crypto.subtle.deriveKey({
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('kapivatar-pareamento-v1'),
      info: new TextEncoder().encode('mqtt-e2e'),
    }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const dados = await crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv,
      additionalData: new TextEncoder().encode(topic),
    }, chave_aes, new TextEncoder().encode(JSON.stringify({
      versao: 1,
      tipo: 'resposta',
      solicitacao_id: requestId,
      criado_em: Date.now(),
      dispositivo: { id, nome: 'Dispositivo remoto' },
    })));
    window._mqttClient._simulateIncoming(topic, {
      versao: 1,
      iv: codificar(iv),
      dados: codificar(dados),
    });
  }, {
    topic: publicacao.topic,
    secret: chave_outro_dispositivo,
    id: id_dispositivo_remoto,
    requestId: solicitacao.solicitacao_id,
  });

  await expect(page.getByRole('status')).toHaveText('Dispositivo pareado: Dispositivo remoto.');
  await expect.poll(() => page.evaluate((id) => JSON.parse(
    localStorage.getItem('kapivatar.dispositivos.pareados')
  ).some((dispositivo) => dispositivo.id === id), id_dispositivo_remoto)).toBe(true);

  await page.evaluate(async () => {
    await window.salvar_lista_contatos({
      contatos: [],
      solicitações_enviadas: [],
      solicitações_recebidas: [],
      marcador: 'conteúdo privado de sincronização',
    });
  });
  const mensagens_sincronizacao = await page.evaluate(() =>
    window._publishedMessages.filter(({ message }) => message.uso === 'sincronizacao-v1')
  );
  expect(mensagens_sincronizacao.length).toBeGreaterThan(0);
  expect(mensagens_sincronizacao.every(({ topic, message }) =>
    topic === publicacao.topic && !JSON.stringify(message).includes('conteúdo privado de sincronização')
  )).toBe(true);

  await page.evaluate(async ({ topic, secret, id }) => {
    const codificar = (valor) => {
      const bytes = new Uint8Array(valor);
      let binario = '';
      for (const byte of bytes) binario += String.fromCharCode(byte);
      return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    };
    const decodificar = (valor) => {
      const base64 = valor.replace(/-/g, '+').replace(/_/g, '/');
      const binario = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
      return Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
    };
    const material = await crypto.subtle.importKey('raw', decodificar(secret), 'HKDF', false, ['deriveKey']);
    const chave_aes = await crypto.subtle.deriveKey({
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('kapivatar-pareamento-v1'),
      info: new TextEncoder().encode('mqtt-sync-v1'),
    }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);

    const lista = JSON.stringify({
      contatos: [],
      solicitações_enviadas: [],
      solicitações_recebidas: [],
      marcador: 'recebido com segurança',
    });
    const hash_buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(lista));
    const hash = Array.from(new Uint8Array(hash_buffer))
      .map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const enviar = async (chave, valor, instante) => {
      const dados = {
        versao: 1,
        tipo: 'sincronizacao',
        criado_em: Date.now(),
        dispositivo_id: id,
        chave,
        operacao: 'gravar',
        versao_dado: { instante, dispositivo: id },
        formato: 'texto',
        transferencia_id: crypto.randomUUID(),
        parte: 0,
        total: 1,
        dados: codificar(new TextEncoder().encode(valor)),
      };
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const criptografado = await crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv,
        additionalData: new TextEncoder().encode(topic),
      }, chave_aes, new TextEncoder().encode(JSON.stringify(dados)));
      window._mqttClient._simulateIncoming(topic, {
        versao: 1,
        uso: 'sincronizacao-v1',
        iv: codificar(iv),
        dados: codificar(criptografado),
      });
    };
    const instante = Date.now();
    await enviar(hash, lista, instante);
    await enviar('contatos', hash, instante + 1);
  }, {
    topic: publicacao.topic,
    secret: chave_outro_dispositivo,
    id: id_dispositivo_remoto,
  });
  await expect.poll(async () => page.evaluate(async () =>
    (await window.carregar_lista_contatos()).marcador
  )).toBe('recebido com segurança');
});

test('Deve criar um novo arquivo de dados com nome escolhido pelo usuário', async ({ page }) => {
  await page.evaluate(() => { window._databasePickerSelectedName = 'meus-dados.sqlite'; });
  await page.getByRole('button', { name: /Criar arquivo SQLite/ }).click();

  await expect.poll(() => page.evaluate(() => window._databasePickerCalls)).toBe(1);
  expect(await page.evaluate(() => window._databasePickerType)).toBe('save');
  expect(await page.evaluate(() => window._databasePickerOptions.suggestedName)).toBe('kapivatar.sqlite');
  await page.evaluate(() => window.navegar('/dispositivos'));
  await expect(page.locator('.dispositivo-arquivo')).toContainText('meus-dados.sqlite');
  await expect(page.locator('.conteudo-principal')).toBeVisible();
});

test('Deve sincronizar uma vez ao abrir o banco, sem repetir em cada navegação', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('kapivatar.dispositivos.pareados', JSON.stringify([{
      id: crypto.randomUUID(),
      nome: 'Dispositivo pareado',
      chave_secreta: 'A'.repeat(43),
      pareado_em: new Date().toISOString(),
    }]));
  });

  await page.getByRole('button', { name: /Abrir arquivo SQLite/ }).click();
  await expect.poll(() => page.evaluate(() =>
    window._publishedMessages.filter(({ message }) => message.uso === 'sincronizacao-v1').length
  )).toBe(1);

  await page.evaluate(() => window.navegar('/dispositivos'));
  await expect(page).toHaveURL(/\/dispositivos$/);
  await page.evaluate(() => window.navegar('/perfis'));
  await expect(page).toHaveURL(/\/perfis$/);
  expect(await page.evaluate(() =>
    window._publishedMessages.filter(({ message }) => message.uso === 'sincronizacao-v1').length
  )).toBe(1);
});
