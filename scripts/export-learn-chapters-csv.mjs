import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const dataDir = join(projectRoot, 'src/data/learn');
const outDir = join(repoRoot, '.harness/exports');
mkdirSync(outDir, { recursive: true });

const chapters = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];

function loadChapter(filePath, chId) {
  let src = readFileSync(filePath, 'utf8');
  src = src.replace(/^import\s+type\s+.*$/gm, '');
  src = src.replace(/:\s*LearnChapter\b/g, '');
  src = src.replace(/:\s*CategoryId(\[\])?\b/g, '');
  src = src.replace(/^export\s+const\s+/gm, 'const ');
  const varName = 'learnCh' + chId.replace('ch', '');
  src += `\nreturn ${varName};`;
  return new Function(src)();
}

const cols = [
  'type', 'chapterId', 'chapterTitle',
  'sectionIndex', 'heading',
  'beginner', 'intermediate', 'advanced',
];

const esc = (v) => {
  if (v === undefined || v === null) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};

const lines = [cols.join(',')];
let total = 0;

for (const chId of chapters) {
  const filePath = join(dataDir, chId + '.ts');
  const chap = loadChapter(filePath, chId);

  lines.push([
    'overview',
    chId,
    chap.title,
    '',
    '（章全体の概要）',
    chap.beginnerOverview ?? '',
    chap.intermediateOverview ?? '',
    chap.overview,
  ].map(esc).join(','));
  total++;

  chap.sections.forEach((sec, idx) => {
    lines.push([
      'section',
      chId,
      chap.title,
      idx + 1,
      sec.heading,
      sec.beginnerBody ?? '',
      sec.intermediateBody ?? '',
      sec.body,
    ].map(esc).join(','));
    total++;
  });
}

const BOM = '﻿';
const CRLF = '\r\n';
const today = new Date().toISOString().slice(0, 10);
const outPath = join(outDir, `learn-chapters-3tier-${today}.csv`);
writeFileSync(outPath, BOM + lines.join(CRLF) + CRLF, 'utf8');
console.log('rows:', total);
console.log('output:', outPath);
