import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const dataDir = join(projectRoot, 'src/data/questions');
const outDir = join(repoRoot, '.harness/exports');
mkdirSync(outDir, { recursive: true });

const chapters = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];

const cols = [
  'id', '章', 'question',
  'choice0', 'choice1', 'choice2', 'choice3',
  'correctIndex', '正答テキスト',
  'explanation',
  'difficulty', 'tags',
  'source_ref',
  'learningObjective', 'cognitiveLevel', 'misconceptionTarget',
  'optionRationales',
];

const esc = (v) => {
  if (v === undefined || v === null) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};

const lines = [cols.join(',')];
let total = 0;
for (const ch of chapters) {
  const qs = JSON.parse(readFileSync(join(dataDir, ch + '.json'), 'utf8'));
  for (const q of qs) {
    total++;
    const choices = q.choices.map((c) => c.text);
    const row = [
      q.id,
      ch,
      q.question,
      choices[0] ?? '',
      choices[1] ?? '',
      choices[2] ?? '',
      choices[3] ?? '',
      q.correctIndex,
      choices[q.correctIndex] ?? '',
      q.explanation,
      q.difficulty,
      (q.tags || []).join('; '),
      q.source_ref ?? '',
      q.learningObjective ?? '',
      q.cognitiveLevel ?? '',
      q.misconceptionTarget ?? '',
      (q.optionRationales || []).join(' || '),
    ].map(esc).join(',');
    lines.push(row);
  }
}

const BOM = '﻿';
const CRLF = '\r\n';
const outPath = join(outDir, 'questions-2026-04-30.csv');
writeFileSync(outPath, BOM + lines.join(CRLF) + CRLF, 'utf8');
console.log('total:', total);
console.log('output:', outPath);
