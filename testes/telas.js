import { test as base, expect } from './simulações/file-system-access-api.js';
import { mockMqtt } from './simulações/mqtt.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imagePath = path.join(__dirname, '../www/kapivatar.svg');

const test = base.extend({
  page: async ({ page }, use) => {
    // Add MQTT Mock to the page
    await mockMqtt(page);
    await use(page);
  }
});

async function tirarScreenshots(page, baseDir) {
  // Horizontal (1280x720)
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(300);
  const pathHorizontal = baseDir ? `testes/telas/${baseDir}/horizontal.png` : 'testes/telas/horizontal.png';
  await page.screenshot({ path: pathHorizontal });

  // Vertical (375x667)
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(300);
  const pathVertical = baseDir ? `testes/telas/${baseDir}/vertical.png` : 'testes/telas/vertical.png';
  await page.screenshot({ path: pathVertical });

  // Vertical Menu (375x667, with menu open)
  const botaoMenu = page.locator('.botao-menu');
  if (await botaoMenu.isVisible()) {
    await botaoMenu.click();
    await page.waitForTimeout(300);
    const pathVerticalMenu = baseDir ? `testes/telas/${baseDir}/vertical-menu.png` : 'testes/telas/vertical-menu.png';
    await page.screenshot({ path: pathVerticalMenu });

    // Close the menu afterwards
    const botaoFechar = page.locator('.botao-fechar-sidebar');
    if (await botaoFechar.isVisible()) {
      await botaoFechar.click();
      await page.waitForTimeout(300);
    }
  }

  // Restore to desktop size
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(300);
}

test('Gerar todas as screenshots do aplicativo', async ({ page }) => {
  // 1. Tela de Login (antes de escolher pasta)
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Escolher pasta de dados/ })).toBeVisible();
  await tirarScreenshots(page, 'login');

  // 2. Tela de Permissão (quando o diretório existe mas não tem permissão)
  // Simular login inicial para salvar o diretório no IndexedDB
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: /Escolher pasta de dados/ }).click();

  // Agora simular perda de permissão e recarregar
  await page.evaluate(() => {
    sessionStorage.setItem('_permissionState', 'prompt');
  });
  await page.reload();
  await expect(page.getByText('Permissão Necessária')).toBeVisible();
  await tirarScreenshots(page, 'permissao');

  // Limpar a simulação de perda de permissão e restaurar o acesso
  await page.evaluate(() => {
    sessionStorage.removeItem('_permissionState');
  });
  await page.getByRole('button', { name: 'Permitir Acesso' }).click();

  // 3. Início (`/`) - Logado mas sem perfil selecionado
  await page.evaluate(() => navegar('/'));
  await expect(page.getByText('Bem-vindo ao Kapivatar!')).toBeVisible();
  await tirarScreenshots(page, '');

  // 4. Perfis (`/perfis`) - Lista de perfis vazia
  await page.getByRole('link', { name: /Selecionar perfil/, exact: true }).click();
  await expect(page.getByText('Nenhum perfil encontrado.')).toBeVisible();
  await tirarScreenshots(page, 'perfis');

  // 5. Criar Perfil (`/perfis/criar`)
  await page.getByRole('button', { name: /Criar perfil/ }).click();
  const form = page.locator('.form-perfil');
  await expect(form).toBeVisible();
  await page.getByLabel('Nome').fill('Capivara Original');
  await page.getByLabel('Bio').fill('Bio original');
  // upload image
  const capaInput = page.locator('input#capa');
  await capaInput.setInputFiles(imagePath);
  await page.waitForTimeout(100);
  await tirarScreenshots(page, 'perfis/criar');

  // Save the profile
  await page.getByRole('button', { name: 'Salvar Perfil' }).click();
  // Wait to navigate back to profiles list
  await expect(page).toHaveURL(/\/perfis/);

  // Let's select this profile as active
  const card = page.locator('.perfil-card').first();
  await expect(card).toBeVisible();
  await card.locator('.perfil-menu-botao').click();
  await page.getByRole('button', { name: 'Selecionar perfil' }).click();
  // This navigates to / (Início) but with profile selected
  await expect(page).toHaveURL(/\/$/);

  // Get the profile ID
  const id_perfil = await page.evaluate(async () => {
    return await window.obter_id_perfil_selecionado();
  });

  // 6. Perfil (`/perfil/:id`)
  await page.evaluate((id) => navegar(`/perfil/${id}`), id_perfil);
  await expect(page.locator('h2')).toContainText('Capivara Original');
  await tirarScreenshots(page, 'perfil');

  // 7. Editar Perfil (`/perfil/:id/editar`)
  await page.evaluate((id) => navegar(`/perfil/${id}/editar`), id_perfil);
  await expect(page.locator('.form-perfil')).toBeVisible();
  await tirarScreenshots(page, 'perfil/editar');

  // Let's actually edit and save to generate history!
  await page.getByLabel('Nome').fill('Capivara Editada');
  await page.getByLabel('Bio').fill('Bio editada');
  await page.getByRole('button', { name: 'Salvar Alterações' }).click();
  await expect(page).toHaveURL(new RegExp(`/perfil/${id_perfil}$`));

  // 8. Histórico do Perfil (`/perfil/:id/histórico`)
  await page.evaluate((id) => navegar(`/perfil/${id}/histórico`), id_perfil);
  await expect(page.locator('.conteudo-pagina .historico').first()).toBeVisible();
  await tirarScreenshots(page, 'perfil/histórico');

  // 9. Histórico de Perfis (`/perfis/histórico`)
  await page.evaluate(() => navegar(`/perfis/histórico`));
  await expect(page.locator('.conteudo-pagina .historico').first()).toBeVisible();
  await tirarScreenshots(page, 'perfis/histórico');

  // 10. Contatos (`/contatos`) - Vazio
  await page.evaluate(() => navegar('/contatos'));
  await expect(page.locator('.conteudo-pagina')).toContainText('Sua lista de contatos está vazia.');
  await tirarScreenshots(page, 'contatos');

  // 11. Adicionar Contato (`/contatos/adicionar`)
  await page.evaluate(() => navegar('/contatos/adicionar'));
  await expect(page.locator('form')).toBeVisible();
  await tirarScreenshots(page, 'contatos/adicionar');

  // 12. Solicitações de Contato (`/contatos/solicitações`) - Vazio
  await page.evaluate(() => navegar('/contatos/solicitações'));
  await expect(page.locator('.conteudo-pagina')).toContainText('Nenhuma solicitação enviada.');
  await tirarScreenshots(page, 'contatos/solicitações');

  // Now, let's populate a contact and requests in IndexedDB to show how they look with data!
  // Generate keys/ID for target contact
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

  // Populate data in DB/file: we'll have 1 contact, 1 sent request, 1 received request
  await page.evaluate(async ({ idAlvo, chavePublicaAlvo }) => {
    const lista = await window.carregar_lista_contatos();
    // Add 1 contact
    lista.contatos.push({
      id: idAlvo,
      nome: 'Contato Alvo',
      bio: 'Bio do Contato Alvo',
      chave_publica: chavePublicaAlvo
    });
    // Add 1 sent request
    lista.solicitações_enviadas.push('outro_id_enviado_12345');
    lista.solicitações_enviadas_datas = {
      'outro_id_enviado_12345': '2026-03-30T12:00:00.000Z'
    };
    // Add 1 received request
    lista.solicitações_recebidas.push({
      id: 'outro_id_recebido_67890',
      nome: 'Mestre Capi',
      bio: 'Sou um mestre',
      chave_publica: chavePublicaAlvo
    });
    await window.salvar_lista_contatos(lista);
  }, { idAlvo, chavePublicaAlvo });

  // 10b. Contatos (`/contatos`) - Com contatos
  await page.evaluate(() => navegar('/contatos'));
  await expect(page.locator('.perfil-card')).toBeVisible();
  await tirarScreenshots(page, 'contatos');

  // 12b. Solicitações de Contato (`/contatos/solicitações`) - Com dados
  await page.evaluate(() => navegar('/contatos/solicitações'));
  await expect(page.locator('.lista-solicitacoes')).toHaveCount(2);
  await tirarScreenshots(page, 'contatos/solicitações');

  // 13. Contato/Chat (`/contato/:id`)
  // Let's write some messages into the conversation
  await page.evaluate(async ({ meuId, idAlvo }) => {
    const conversa = await window.carregar_conversa(meuId, idAlvo);
    conversa.mensagens.push({
      id: 'msg1',
      id_remetente: idAlvo,
      texto: 'Olá! Tudo bem?',
      data: '2026-03-30T11:59:00.000Z'
    });
    conversa.mensagens.push({
      id: 'msg2',
      id_remetente: meuId,
      texto: 'E aí! Tudo ótimo e com você?',
      data: '2026-03-30T11:59:30.000Z',
      recebida: true
    });
    conversa.mensagens.push({
      id: 'msg3',
      id_remetente: idAlvo,
      texto: 'Tudo tranquilo. Estilo capivara 🦦',
      data: '2026-03-30T12:00:00.000Z'
    });
    await window.salvar_conversa(meuId, idAlvo, conversa);
  }, { meuId: id_perfil, idAlvo });

  await page.evaluate((id) => navegar(`/contato/${id}`), idAlvo);
  await expect(page.locator('.chat-mensagem')).toHaveCount(3);
  await tirarScreenshots(page, 'contato');
});
