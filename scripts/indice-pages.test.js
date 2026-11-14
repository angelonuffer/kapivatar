import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./gerar-indice-pages.js', import.meta.url));

test('gera índice responsivo com o relatório principal e previews ordenados por PR', async (t) => {
  const pasta = await mkdtemp(path.join(os.tmpdir(), 'kapivatar-pages-'));
  t.after(() => rm(pasta, { recursive: true, force: true }));
  const site = path.join(pasta, 'site');
  await mkdir(path.join(site, 'latest'), { recursive: true });
  await mkdir(path.join(site, 'previews', 'pr-8'), { recursive: true });
  await mkdir(path.join(site, 'previews', 'pr-21'), { recursive: true });
  await mkdir(path.join(site, 'previews', 'pr-invalid'), { recursive: true });
  await writeFile(path.join(site, 'latest', 'index.html'), '');
  await writeFile(path.join(site, 'previews', 'pr-8', 'index.html'), '');
  await writeFile(path.join(site, 'previews', 'pr-21', 'index.html'), '');

  execFileSync(process.execPath, [script, site]);

  const html = await readFile(path.join(site, 'index.html'), 'utf8');
  assert.match(html, /lang="pt-BR"/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /href="latest\/"/);
  assert.match(html, /href="previews\/pr-21\/"/);
  assert.match(html, /href="previews\/pr-8\/"/);
  assert.ok(html.indexOf('pr-21') < html.indexOf('pr-8'));
  assert.doesNotMatch(html, /pr-invalid/);
  assert.match(html, /3 relatórios/);
});

test('mostra estado vazio quando não existem relatórios', async (t) => {
  const pasta = await mkdtemp(path.join(os.tmpdir(), 'kapivatar-pages-'));
  t.after(() => rm(pasta, { recursive: true, force: true }));
  const site = path.join(pasta, 'site');

  execFileSync(process.execPath, [script, site]);

  const html = await readFile(path.join(site, 'index.html'), 'utf8');
  assert.match(html, /0 relatórios/);
  assert.match(html, /Ainda não há relatórios publicados/);
  assert.doesNotMatch(html, /class="report-card/);
});
