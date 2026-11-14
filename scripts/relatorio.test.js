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

async function escreverRelatorio(entrada, testes, arquivosExtras = []) {
  const arquivos = [{ fileId: 'arquivo', fileName: 'teste.js', tests: testes }, ...arquivosExtras];
  const resumo = { startTime: 123, files: arquivos.map(({ fileId, fileName }) => ({ fileId, fileName })) };
  const dados = { 'report.json': strToU8(JSON.stringify(resumo)) };
  for (const { fileId, tests } of arquivos) dados[`${fileId}.json`] = strToU8(JSON.stringify({ tests }));
  const zip = zipSync(dados);
  await writeFile(path.join(entrada, 'index.html'), `<template id="playwrightReportBase64">data:application/zip;base64,${Buffer.from(zip).toString('base64')}</template>`);
}

test('gera passos, capturas e tentativas sem inserir HTML executável #relatorio', async (t) => {
  const { entrada, saida } = await fixture(t);
  const frame = Uint8Array.from([1, 2, 3]);
  const trace = zipSync({
    '1-trace.trace': strToU8(JSON.stringify({ type: 'screencast-frame', timestamp: 2, file: 'screencast/frame.jpeg' })),
    'screencast/frame.jpeg': frame,
  });
  await writeFile(path.join(entrada, 'data', 'trace.zip'), trace);
  await writeFile(path.join(entrada, 'data', 'anexo.png'), frame);
  await escreverRelatorio(entrada, [{
    testId: 'id', title: '</script><script>alert(1)</script> #fixture #xss', projectName: 'chromium', path: [], outcome: 'flaky',
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
  assert.deepEqual(dados.testes[0].hashtags, ['#fixture', '#xss']);
  assert.equal(dados.testes[0].resultados[0].steps[0].steps[0].title, 'subpasso');
  assert.equal(dados.testes[0].resultados[0].errors[0].message, 'falhou');
  assert.equal(dados.testes[0].resultados[0].imagens.length, 2);
  assert.equal(dados.testes[0].resultados[1].retry, 1);
  assert.equal(dados.testes[1].resultados.length, 0);
  for (const imagem of dados.testes[0].resultados[0].imagens) {
    assert.deepEqual(await readFile(path.join(saida, imagem.url)), Buffer.from(frame));
  }
});

test('falha explicitamente para relatório inválido e anexos fora da pasta #relatorio #validacao', async (t) => {
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

test('marca e prioriza testes de arquivos novos ou modificados no PR #relatorio #pull-request', async (t) => {
  const { entrada, saida, pasta } = await fixture(t);
  await escreverRelatorio(entrada, [
    { testId: 'modificado', title: 'Teste modificado', outcome: 'expected', results: [] },
  ], [
    { fileId: 'novo', fileName: 'tests/novo.spec.js', tests: [
      { testId: 'novo-teste', title: 'Teste novo', outcome: 'expected', results: [] },
    ] },
    { fileId: 'inalterado', fileName: 'tests/inalterado.spec.js', tests: [
      { testId: 'inalterado', title: 'Teste inalterado', outcome: 'expected', results: [] },
    ] },
  ]);
  const alterados = path.join(pasta, 'arquivos-alterados.txt');
  await writeFile(alterados, 'teste.js\ntests/novo.spec.js\n');
  execFileSync(process.execPath, [script, entrada, saida, alterados]);
  const html = await readFile(path.join(saida, 'index.html'), 'utf8');
  const dados = JSON.parse(html.match(/const relatorio = (.*);/)[1]);
  assert.deepEqual(dados.testes.map(({ titulo, modificadoNoPR }) => [titulo, modificadoNoPR]), [
    ['Teste modificado', true],
    ['Teste novo', true],
    ['Teste inalterado', false],
  ]);
  assert.match(html, /Teste novo\/modificado neste PR/);
});
