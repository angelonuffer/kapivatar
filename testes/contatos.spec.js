import { test as base, expect } from './mocks/fs-mock.js';

const test = base.extend({
  page: async ({ page }, use) => {
    // Listen to console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // Add MQTT Mock to the page
    await page.addInitScript(() => {
      window._publishedMessages = [];
      Object.defineProperty(window, 'mqtt', {
        get: () => {
          return {
            connect: () => {
              console.log("Mock MQTT connect called");
              const listeners = {};
              const client = {
                on: (event, cb) => {
                  listeners[event] = cb;
                  if (event === 'connect') {
                    setTimeout(() => cb(), 10);
                  }
                },
                subscribe: (topic) => {
                  console.log("Mock MQTT subscribed to", topic);
                },
                publish: (topic, message) => {
                  console.log("Mock MQTT publish:", topic, message);
                  window._publishedMessages.push({ topic, message: JSON.parse(message) });
                },
                _simulateIncoming: (topic, data) => {
                  if (listeners['message']) {
                    listeners['message'](topic, JSON.stringify(data));
                  }
                }
              };
              window._mqttClient = client;
              return client;
            }
          };
        },
        set: (val) => {
          // Ignore overwrite
        },
        configurable: true
      });
    });
    await use(page);
  }
});

test('Deve realizar fluxo de solicitação, retentativa e confirmação ao receber retentativa de contato já aceito', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();

  // 1. Criar perfil
  await page.getByRole('link', { name: /Selecionar perfil/, exact: true }).click();
  await page.getByRole('button', { name: /Criar perfil/ }).click();

  await page.getByLabel('Nome').fill('Meu Perfil');
  await page.getByLabel('Bio').fill('Minha bio');
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();

  // Selecionar o perfil criado
  const card = page.locator('.perfil-card').first();
  await card.locator('.perfil-menu-botao').click();
  await page.getByRole('button', { name: 'Selecionar perfil' }).click();

  // Navegar para Contatos -> Adicionar
  await page.getByRole('link', { name: /Contatos/, exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar' }).click();

  // Obter o ID do nosso perfil
  const meuId = await page.locator('input[readonly]').inputValue();
  expect(meuId).toHaveLength(64);

  // Gerar chaves e ID válidos para o nosso Contato Alvo
  const { idAlvo, chavePublicaAlvo } = await page.evaluate(async () => {
    const chaves = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
    const jwk = await crypto.subtle.exportKey("jwk", chaves.publicKey);
    const spki = await crypto.subtle.exportKey("spki", chaves.publicKey);
    const hash_buffer = await crypto.subtle.digest("SHA-256", spki);
    const id = Array.from(new Uint8Array(hash_buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return { idAlvo: id, chavePublicaAlvo: jwk };
  });

  // Preencher ID do contato alvo gerado e clicar em adicionar
  await page.getByLabel('ID do Contato para Adicionar').fill(idAlvo);
  await page.getByRole('button', { name: 'Adicionar Contato' }).click();

  // Verificar se fomos para a página de solicitações
  await expect(page).toHaveURL(/\/contatos\/solicita%C3%A7%C3%B5es/);

  // Verificar se a solicitação foi salva no IndexedDB/Arquivo e enviada por MQTT
  let published = await page.evaluate(() => window._publishedMessages);
  expect(published.length).toBeGreaterThan(0);
  let contactMsg = published.find(p => p.message.adicionar_contato_id === idAlvo);
  expect(contactMsg).toBeDefined();
  expect(contactMsg.message.meu_perfil.id).toBe(meuId);

  // Verificar que foi registrado um timestamp para a solicitação enviada
  const dataEnvioStr = await page.evaluate(async (idAlvo) => {
    const lista = await window.carregar_lista_contatos();
    return lista.solicitações_enviadas_datas[idAlvo];
  }, idAlvo);
  expect(dataEnvioStr).toBeDefined();
  const dataEnvio = new Date(dataEnvioStr).getTime();
  expect(isNaN(dataEnvio)).toBe(false);

  // 2. Testar retentativa de envio de solicitação pendente
  // Limpar mensagens publicadas
  await page.evaluate(() => { window._publishedMessages = []; });

  // Alterar a data de envio para 15 segundos atrás para entrar na janela de retentativa
  await page.evaluate(async (idAlvo) => {
    const lista = await window.carregar_lista_contatos();
    const dataPassada = new Date(Date.now() - 15000).toISOString();
    lista.solicitações_enviadas_datas[idAlvo] = dataPassada;
    await window.salvar_lista_contatos(lista);
  }, idAlvo);

  // Chamar verificar_retentativas manualmente
  await page.evaluate(async () => {
    await window.verificar_retentativas();
  });

  // Verificar se publicou outra mensagem MQTT de solicitação
  published = await page.evaluate(() => window._publishedMessages);
  contactMsg = published.find(p => p.message.adicionar_contato_id === idAlvo);
  expect(contactMsg).toBeDefined();

  // 3. Testar recebimento de uma retentativa de solicitação de contato que JÁ foi aceito
  // Primeiro, vamos colocar manualmente o contato na lista de contatos aceitos para simular que já aceitamos
  await page.evaluate(async ({ idAlvo, chavePublicaAlvo }) => {
    const lista = await window.carregar_lista_contatos();
    // Adicionar contato fictício
    lista.contatos.push({
      id: idAlvo,
      nome: 'Contato Alvo',
      bio: 'Bio Alvo',
      chave_publica: chavePublicaAlvo
    });
    await window.salvar_lista_contatos(lista);
  }, { idAlvo, chavePublicaAlvo });

  // Limpar mensagens publicadas
  await page.evaluate(() => { window._publishedMessages = []; });

  // Agora simulamos que recebemos uma nova solicitação de adicionar contato (retentativa) do idAlvo
  await page.evaluate(({ idAlvo, chavePublicaAlvo, meuId }) => {
    const dadosMqtt = {
      adicionar_contato_id: meuId,
      meu_perfil: {
        id: idAlvo,
        nome: 'Contato Alvo',
        bio: 'Bio Alvo',
        chave_publica: chavePublicaAlvo
      }
    };
    window._mqttClient._simulateIncoming('kapivatar.net', dadosMqtt);
  }, { idAlvo, chavePublicaAlvo, meuId });

  // Aguardar o processamento assíncrono
  await page.waitForTimeout(500);

  // Verificar se o sistema respondeu confirmando o aceite (publicando a confirmação de aceite)
  published = await page.evaluate(() => window._publishedMessages);
  expect(published.length).toBeGreaterThan(0);

  // A confirmação deve ser enviada criptografada via MQTT, com id_destino sendo idAlvo
  const confirmMsg = published.find(p => p.message.id_destino === idAlvo);
  expect(confirmMsg).toBeDefined();
  expect(confirmMsg.message.mensagem_criptografada).toBeDefined();
});
