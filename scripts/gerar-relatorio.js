import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';

const entrada = path.resolve(process.argv[2] ?? 'playwright-report');
const saida = path.resolve(process.argv[3] ?? 'playwright-pages');
const arquivoListaAlterados = process.argv[4] ? path.resolve(process.argv[4]) : null;
const modelo = fileURLToPath(new URL('./relatorio.html', import.meta.url));

function json(arquivos, nome) {
  if (!arquivos[nome]) throw new Error(`Arquivo ausente no ZIP: ${nome}`);
  return JSON.parse(strFromU8(arquivos[nome]));
}

function normalizarCaminho(arquivo) {
  return path.posix.normalize(arquivo.replaceAll('\\', '/')).replace(/^\.\//, '');
}

async function lerAnexo(nome) {
  const raiz = await realpath(entrada);
  const arquivo = await realpath(path.resolve(raiz, nome));
  if (!arquivo.startsWith(raiz + path.sep)) {
    throw new Error(`Anexo fora do relatório: ${nome}`);
  }
  return readFile(arquivo);
}

async function gerar() {
  if (entrada === saida) throw new Error('A pasta de saída deve ser diferente da pasta de entrada.');
  const html = await readFile(path.join(entrada, 'index.html'), 'utf8');
  const dados = html.match(/<template id="playwrightReportBase64">\s*data:application\/zip;base64,([A-Za-z0-9+/=\s]+)\s*<\/template>/);
  if (!dados) throw new Error('Não foi encontrado o relatório incorporado no HTML do Playwright.');

  const arquivos = unzipSync(Buffer.from(dados[1].replace(/\s/g, ''), 'base64'));
  const relatorio = json(arquivos, 'report.json');
  if (!Array.isArray(relatorio.files)) throw new Error('Lista de arquivos ausente no relatório.');
  await mkdir(path.join(saida, 'imagens'), { recursive: true });
  const arquivosAlterados = new Set(
    arquivoListaAlterados
      ? (await readFile(arquivoListaAlterados, 'utf8')).split(/\r?\n/).filter(Boolean).map(normalizarCaminho)
      : [],
  );

  async function salvarImagem(bytes, extensao, titulo) {
    const hash = createHash('sha256').update(bytes).digest('hex');
    const nome = `${hash}.${extensao}`;
    await writeFile(path.join(saida, 'imagens', nome), bytes);
    return { titulo, url: `imagens/${nome}` };
  }

  function associarImagensAosPassos(steps, imagens) {
    const passos = [];
    function percorrer(lista) {
      for (const step of lista) {
        passos.push(step);
        percorrer(step.steps ?? []);
      }
    }
    percorrer(steps);

    const associadas = new Set();
    for (const step of passos) {
      step.imagens = imagens.filter((imagem) => {
        const associada = imagem.anexo !== undefined && step.attachments?.includes(imagem.anexo);
        if (associada) associadas.add(imagem);
        return associada;
      });
    }

    for (const imagem of imagens) {
      if (associadas.has(imagem) || !Number.isFinite(imagem.timestamp) || !passos.length) continue;
      const instante = imagem.timestamp;
      const passo = passos
        .filter((step) => Number.isFinite(Date.parse(step.startTime)))
        .map((step) => {
          const inicio = Date.parse(step.startTime);
          const fim = inicio + (step.duration ?? 0);
          const distancia = instante < inicio ? inicio - instante : instante > fim ? instante - fim : 0;
          return { step, distancia, duracao: step.duration ?? 0 };
        })
        .sort((a, b) => a.distancia - b.distancia || a.duracao - b.duracao)[0]?.step;
      if (!passo) continue;
      passo.imagens.push(imagem);
      associadas.add(imagem);
    }
    return imagens.filter((imagem) => !associadas.has(imagem));
  }

  const testes = [];
  for (const arquivo of relatorio.files) {
    const detalhes = json(arquivos, `${arquivo.fileId}.json`);
    for (const teste of detalhes.tests) {
      const resultados = [];
      for (const resultado of teste.results) {
        const imagens = [];
        for (const [indiceAnexo, anexo] of (resultado.attachments ?? []).entries()) {
          const formatos = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
          const extensao = formatos[anexo.contentType?.split(';')[0]];
          if (extensao && anexo.path) {
            imagens.push({ ...await salvarImagem(await lerAnexo(anexo.path), extensao, anexo.name), anexo: indiceAnexo });
          } else if (anexo.name === 'trace' && anexo.path) {
            const trace = unzipSync(await lerAnexo(anexo.path));
            const frames = [];
            let deslocamento = null;
            for (const [nome, conteudo] of Object.entries(trace)) {
              if (!nome.endsWith('.trace')) continue;
              for (const linha of strFromU8(conteudo).split('\n')) {
                if (!linha.trim()) continue;
                const evento = JSON.parse(linha);
                if (evento.type === 'context-options' && Number.isFinite(evento.wallTime) && Number.isFinite(evento.monotonicTime)) {
                  deslocamento = evento.wallTime - evento.monotonicTime;
                }
                if (evento.type === 'screencast-frame') {
                  frames.push({
                    ...evento,
                    wallTime: deslocamento === null ? undefined : deslocamento + evento.timestamp,
                  });
                }
              }
            }
            frames.sort((a, b) => a.timestamp - b.timestamp);
            for (const frame of frames) {
              const extensaoFrame = path.extname(frame.file ?? '').toLowerCase().slice(1);
              if (!['jpeg', 'jpg', 'png', 'webp'].includes(extensaoFrame) || !trace[frame.file]) {
                throw new Error(`Captura ausente ou inválida no rastreamento: ${frame.file}`);
              }
              const imagem = await salvarImagem(trace[frame.file], extensaoFrame, `Captura ${imagens.length + 1}`);
              if (Number.isFinite(frame.wallTime)) imagem.timestamp = frame.wallTime;
              imagens.push(imagem);
            }
          }
        }
        const imagensSemPasso = associarImagensAosPassos(resultado.steps ?? [], imagens);
        resultados.push({
          retry: resultado.retry,
          status: resultado.status,
          duration: resultado.duration,
          steps: resultado.steps ?? [],
          errors: resultado.errors ?? [],
          imagens,
          imagensSemPasso,
        });
      }
      const hashtags = [...new Set([...teste.title.matchAll(/(?:^|\s)(#[\p{L}\p{N}_-]+)/gu)].map(([, hashtag]) => hashtag))];
      testes.push({
        id: teste.testId,
        titulo: teste.title.replace(/(?:^|\s)#[\p{L}\p{N}_-]+/gu, '').trim(),
        hashtags,
        caminho: [...(teste.path ?? []), arquivo.fileName].join(' / '),
        projeto: teste.projectName,
        outcome: teste.outcome,
        modificadoNoPR: arquivosAlterados.has(normalizarCaminho(arquivo.fileName)),
        resultados,
      });
    }
  }

  testes.sort((a, b) => Number(b.modificadoNoPR) - Number(a.modificadoNoPR));
  const pagina = await readFile(modelo, 'utf8');
  const conteudo = JSON.stringify({ testes, startTime: relatorio.startTime }).replace(/</g, '\\u003c');
  await writeFile(path.join(saida, 'index.html'), pagina.replace('/* DADOS_DO_RELATORIO */', () => `const relatorio = ${conteudo};`));
  console.log(`Relatório gerado em ${saida}: ${testes.length} teste(s).`);
}

gerar().catch((erro) => {
  console.error(`Erro ao gerar relatório: ${erro.message}`);
  process.exitCode = 1;
});
