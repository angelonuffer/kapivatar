import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { strToU8, zipSync } from 'fflate';

const script = fileURLToPath(new URL('./gerar-relatorio.js', import.meta.url));

async function fixture(t) {
  const pasta = await mkdtemp(path.join(os.tmpdir(), 'kapivatar-relatorio-'));
  t.after(() => rm(pasta, { recursive: true, force: true }));
  const entrada = path.join(pasta, 'entrada');
  const saida = path.join(pasta, 'saida');
  await mkdir(path.join(entrada, 'data'), { recursive: true });
  return { pasta, entrada, saida };
}

async function escreverRelatorio(entrada, testes) {
  const resumo = { startTime: 123, files: [{ fileId: 'arquivo', fileName: 'teste.js' }] };
  const detalhes = { tests: testes };
  const zip = zipSync({
    'report.json': strToU8(JSON.stringify(resumo)),
    'arquivo.json': strToU8(JSON.stringify(detalhes)),
  });
  await writeFile(path.join(entrada, 'index.html'), `<template id="playwrightReportBase64">data:application/zip;base64,${Buffer.from(zip).toString('base64')}</template>`);
}

test('gera passos, capturas e tentativas sem inserir HTML executável', async (t) => {
  const { entrada, saida } = await fixture(t);
  const frame = Uint8Array.from([1, 2, 3]);
  const trace = zipSync({
    '1-trace.trace': strToU8(JSON.stringify({ type: 'screencast-frame', timestamp: 2, file: 'screencast/frame.jpeg' })),
    'screencast/frame.jpeg': frame,
  });
  await writeFile(path.join(entrada, 'data', 'trace.zip'), trace);
  await writeFile(path.join(entrada, 'data', 'anexo.png'), frame);
  await escreverRelatorio(entrada, [{
    testId: 'id', title: '</script><script>alert(1)</script>', projectName: 'chromium', path: [], outcome: 'flaky',
    results: [
      { retry: 0, status: 'failed', steps: [{ title: 'passo', steps: [{ title: 'subpasso' }] }], errors: [{ message: 'falhou' }], attachments: [{ name: 'trace', path: 'data/trace.zip' }, { name: 'anexo', contentType: 'image/png', path: 'data/anexo.png' }] },
      { retry: 1, status: 'passed', steps: [], attachments: [] },
    ],
  }, { testId: 'ignorado', title: 'ignorado', outcome: 'skipped', results: [] }]);
  execFileSync(process.execPath, [script, entrada, saida]);
  const html = await readFile(path.join(saida, 'index.html'), 'utf8');
  assert.ok(!html.includes('</script><script>alert(1)</script>'));
  const dados = JSON.parse(html.match(/const relatorio = (.*);/)[1]);
  assert.equal(dados.testes.length, 2);
  assert.equal(dados.testes[0].titulo, '</script><script>alert(1)</script>');
  assert.equal(dados.testes[0].resultados[0].steps[0].steps[0].title, 'subpasso');
  assert.equal(dados.testes[0].resultados[0].errors[0].message, 'falhou');
  assert.equal(dados.testes[0].resultados[0].imagens.length, 2);
  assert.equal(dados.testes[0].resultados[1].retry, 1);
  assert.equal(dados.testes[1].resultados.length, 0);
  for (const imagem of dados.testes[0].resultados[0].imagens) {
    assert.deepEqual(await readFile(path.join(saida, imagem.url)), Buffer.from(frame));
  }
});

test('falha explicitamente para relatório inválido e anexos fora da pasta', async (t) => {
  const { pasta, entrada, saida } = await fixture(t);
  await writeFile(path.join(entrada, 'index.html'), 'inválido');
  let resultado = spawnSync(process.execPath, [script, entrada, saida], { encoding: 'utf8' });
  assert.notEqual(resultado.status, 0);
  assert.match(resultado.stderr, /relatório incorporado/);
  await writeFile(path.join(pasta, 'fora.png'), 'imagem');
  await escreverRelatorio(entrada, [{
    title: 'teste', outcome: 'expected',
    results: [{ attachments: [{ name: 'imagem', contentType: 'image/png', path: '../fora.png' }] }],
  }]);
  resultado = spawnSync(process.execPath, [script, entrada, saida], { encoding: 'utf8' });
  assert.notEqual(resultado.status, 0);
  assert.match(resultado.stderr, /Anexo fora do relatório/);
});
