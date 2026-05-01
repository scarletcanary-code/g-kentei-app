/**
 * import-learn-chapters-from-csv.mjs
 *
 * Usage:
 *   node scripts/import-learn-chapters-from-csv.mjs [--dry-run]
 *
 * Reads .harness/imports/learn-chapters-3tier-2026-05-01_releveled.csv
 * and overwrites body fields (overview, beginnerOverview, intermediateOverview,
 * and per-section heading/body/beginnerBody/intermediateBody) in
 * src/data/learn/ch1.ts ~ ch8.ts.
 *
 * Meta fields (termIds, keyTermIds, keyPoints, exampleQuestionIds, source_refs,
 * source_ref_supplements, categoryId, title, prerequisites, difficulty,
 * relatedChapters) are NOT changed.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');

const DRY_RUN = process.argv.includes('--dry-run');

// ---- CSV Parsing (RFC 4180) -------------------------------------------------

function parseCsv(raw) {
  // Remove BOM if present
  const text = raw.replace(/^﻿/, '');
  // Normalize line endings
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const records = [];
  for (const line of lines) {
    if (line.trim() === '') continue;
    records.push(parseRow(line));
  }
  return records;
}

function parseRow(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field
      let val = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            val += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          val += line[i];
          i++;
        }
      }
      fields.push(val);
      if (i < line.length && line[i] === ',') i++;
    } else {
      // Unquoted field
      const end = line.indexOf(',', i);
      if (end === -1) {
        fields.push(line.slice(i));
        i = line.length;
      } else {
        fields.push(line.slice(i, end));
        i = end + 1;
      }
    }
  }
  return fields;
}

// ---- Chapter Loader (same pattern as export script) ------------------------

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

// ---- String Escaping for template literals ---------------------------------

function escapeTemplateLiteral(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

// ---- Regex-based in-place replacers ----------------------------------------

/**
 * Replace overview: '...' or overview: `...`  (single or multi-line)
 * Also handles overview:\n    '...' patterns
 */
function replaceOverview(src, newValue) {
  const escaped = escapeTemplateLiteral(newValue);
  // Pattern: overview:\s*(backtick...backtick | '...' | multi-line '...')
  // We use a robust approach: find `overview:` then replace the string value
  // that follows until the next field at the same indentation level.

  // Match: overview: `...` (template literal, possibly multiline)
  src = src.replace(
    /(\boverview:\s*)(`(?:[^`\\]|\\.)*`)/s,
    (_, prefix) => `${prefix}\`${escaped}\``
  );

  // Match: overview: '...' single line (with possible line continuation)
  src = src.replace(
    /(\boverview:\s*)('(?:[^'\\]|\\.)*')/,
    (_, prefix) => `${prefix}\`${escaped}\``
  );

  // Match: overview:\n    '...' (multi-line with leading whitespace, possible continuation)
  src = src.replace(
    /(\boverview:\s*\n(?:\s+'[^']*'\s*\+\s*)*\s*)'([^']*)'/s,
    (match, prefix) => {
      // This is a multi-line concatenated string pattern - handle differently
      return match; // fall through, handled below
    }
  );

  return src;
}

/**
 * More robust replacement that handles the actual patterns in ch files.
 * overview can be:
 *   overview:\n    'long text...',
 *   overview: 'text',
 *   overview: `text`,
 */
function replaceField(src, fieldName, newValue) {
  const escaped = escapeTemplateLiteral(newValue);
  const replacement = `\`${escaped}\``;

  // Pattern 1: field: `...` (template literal, possibly multiline)
  const pat1 = new RegExp(`(\\b${fieldName}:\\s*)(\`(?:[^\`\\\\]|\\\\.)*\`)`, 's');
  if (pat1.test(src)) {
    return src.replace(pat1, (_, prefix) => `${prefix}${replacement}`);
  }

  // Pattern 2: field: 'single line string',
  const pat2 = new RegExp(`(\\b${fieldName}:\\s*)('(?:[^'\\\\]|\\\\.)*')`);
  if (pat2.test(src)) {
    return src.replace(pat2, (_, prefix) => `${prefix}${replacement}`);
  }

  // Pattern 3: field:\n    'line1'\n    + 'line2' (multi-line concatenation)
  // e.g. overview:\n    'first part ...',
  const pat3 = new RegExp(
    `(\\b${fieldName}:)\\s*\\n((?:\\s*'[^']*'\\s*\\n)*\\s*'[^']*')`,
    's'
  );
  if (pat3.test(src)) {
    return src.replace(pat3, (_, keyword) => `${keyword}\n    ${replacement}`);
  }

  // Pattern 4: field:\n    'text with\n    continuation'
  // Overview in ch1 spans multiple lines within single quotes
  // Find the field followed by newline and indented string
  const pat4 = new RegExp(
    `(\\b${fieldName}:\\s*\\n\\s*)('[^']*(?:\\n[^']*)*?')`,
    's'
  );
  if (pat4.test(src)) {
    return src.replace(pat4, (_, prefix) => `${prefix}${replacement}`);
  }

  console.warn(`  WARNING: Could not find pattern for field "${fieldName}"`);
  return src;
}

/**
 * Replace a section's field within its block.
 * We locate the section by its heading, then replace the field within that block.
 */
function replaceSectionField(src, heading, fieldName, newValue) {
  const escaped = escapeTemplateLiteral(newValue);
  const replacement = `\`${escaped}\``;
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Find the section block that contains this heading
  // Strategy: find `heading: '...<heading>...'` then look for fieldName after it
  // until the next `heading:` or end of sections array

  // We'll use a position-based approach
  const headingPattern = new RegExp(
    `(heading:\\s*'${escapedHeading}'|heading:\\s*\`${escapedHeading}\`)`,
    's'
  );
  const headingMatch = headingPattern.exec(src);
  if (!headingMatch) {
    console.warn(`  WARNING: Could not find heading "${heading}"`);
    return src;
  }

  const headingPos = headingMatch.index;

  // Find the next heading after this one (or end of sections)
  const nextHeadingPattern = /heading:\s*(?:'[^']*'|`[^`]*`)/gs;
  nextHeadingPattern.lastIndex = headingPos + headingMatch[0].length;
  const nextHeadingMatch = nextHeadingPattern.exec(src);
  const sectionEnd = nextHeadingMatch ? nextHeadingMatch.index : src.length;

  const sectionSrc = src.slice(headingPos, sectionEnd);

  // Now replace the field in this section slice
  const fieldPat1 = new RegExp(`(\\b${fieldName}:\\s*)(\`(?:[^\`\\\\]|\\\\.)*\`)`, 's');
  const fieldPat2 = new RegExp(`(\\b${fieldName}:\\s*)('(?:[^'\\\\]|\\\\.)*')`);
  const fieldPat3 = new RegExp(
    `(\\b${fieldName}:\\s*\\n\\s*)('(?:[^']|\\n)*?')(?=,?\\s*\\n)`,
    's'
  );

  let newSection;
  if (fieldName === 'heading') {
    // heading is always a simple single-line string
    newSection = sectionSrc.replace(
      new RegExp(`(\\bheading:\\s*)('${escapedHeading}'|\`${escapedHeading}\`)`),
      (_, prefix) => `${prefix}${replacement}`
    );
  } else if (fieldPat1.test(sectionSrc)) {
    newSection = sectionSrc.replace(fieldPat1, (_, prefix) => `${prefix}${replacement}`);
  } else if (fieldPat2.test(sectionSrc)) {
    newSection = sectionSrc.replace(fieldPat2, (_, prefix) => `${prefix}${replacement}`);
  } else if (fieldPat3.test(sectionSrc)) {
    newSection = sectionSrc.replace(fieldPat3, (_, prefix) => `${prefix}${replacement}`);
  } else {
    console.warn(`  WARNING: Could not find field "${fieldName}" in section "${heading}"`);
    newSection = sectionSrc;
  }

  return src.slice(0, headingPos) + newSection + src.slice(sectionEnd);
}

// ---- Main ------------------------------------------------------------------

const csvPath = join(repoRoot, '.harness/imports/learn-chapters-3tier-2026-05-01_releveled.csv');
const dataDir = join(projectRoot, 'src/data/learn');
const chapters = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];

// Expected header
const EXPECTED_HEADER = 'type,chapterId,chapterTitle,sectionIndex,heading,beginner,intermediate,advanced';

// Read and parse CSV
const csvRaw = readFileSync(csvPath, 'utf8');
const csvRows = parseCsv(csvRaw);

if (csvRows.length === 0) {
  console.error('ERROR: CSV is empty');
  process.exit(1);
}

// Verify header
const headerRow = csvRows[0];
const headerStr = headerRow.join(',');
if (headerStr !== EXPECTED_HEADER) {
  console.error('ERROR: CSV header mismatch');
  console.error('  Expected:', EXPECTED_HEADER);
  console.error('  Got:     ', headerStr);
  process.exit(1);
}

const dataRows = csvRows.slice(1);
if (dataRows.length !== 44) {
  console.error(`ERROR: Expected 44 data rows, got ${dataRows.length}`);
  process.exit(1);
}

// Map column names to indices
const colIndex = {};
headerRow.forEach((col, i) => { colIndex[col] = i; });

// Group rows by chapterId
const byChapter = {};
for (const row of dataRows) {
  const chId = row[colIndex['chapterId']];
  if (!byChapter[chId]) byChapter[chId] = [];
  byChapter[chId].push(row);
}

// Backup original file contents
const originals = {};
for (const chId of chapters) {
  const filePath = join(dataDir, `${chId}.ts`);
  originals[chId] = readFileSync(filePath, 'utf8');
}

// Pre-check: validate that CSV headings match existing chapter sections
console.log('Pre-checking section headings...');
for (const chId of chapters) {
  const filePath = join(dataDir, `${chId}.ts`);
  let chap;
  try {
    chap = loadChapter(filePath, chId);
  } catch (e) {
    console.error(`ERROR: Failed to load ${chId}.ts: ${e.message}`);
    process.exit(1);
  }

  const rows = byChapter[chId] || [];
  const csvSections = rows.filter(r => r[colIndex['type']] === 'section');
  const csvOverviews = rows.filter(r => r[colIndex['type']] === 'overview');

  if (csvOverviews.length !== 1) {
    console.error(`ERROR: ${chId} should have exactly 1 overview row, got ${csvOverviews.length}`);
    process.exit(1);
  }

  if (csvSections.length !== chap.sections.length) {
    console.error(`ERROR: ${chId} has ${chap.sections.length} sections in TS but ${csvSections.length} in CSV`);
    process.exit(1);
  }

  for (let i = 0; i < csvSections.length; i++) {
    const csvHeading = csvSections[i][colIndex['heading']];
    const tsHeading = chap.sections[i].heading;
    if (csvHeading !== tsHeading) {
      console.error(`ERROR: ${chId} section[${i}] heading mismatch`);
      console.error(`  CSV: "${csvHeading}"`);
      console.error(`  TS:  "${tsHeading}"`);
      process.exit(1);
    }
  }

  const sectionCount = csvSections.length;
  const overviewRow = csvOverviews[0];
  const overviewAdvanced = overviewRow[colIndex['advanced']];
  const overviewBeginner = overviewRow[colIndex['beginner']];
  const overviewIntermediate = overviewRow[colIndex['intermediate']];

  if (DRY_RUN) {
    console.log(`\n[DRY-RUN] ${chId}:`);
    console.log(`  overview (advanced) preview: "${overviewAdvanced.slice(0, 40)}..."`);
    console.log(`  beginnerOverview preview: "${overviewBeginner.slice(0, 40)}..."`);
    console.log(`  intermediateOverview preview: "${overviewIntermediate.slice(0, 40)}..."`);
    for (let i = 0; i < sectionCount; i++) {
      console.log(`  section[${i}] heading: "${csvSections[i][colIndex['heading']]}"`);
      console.log(`    body (advanced) preview: "${csvSections[i][colIndex['advanced']].slice(0, 40)}..."`);
    }
  }
}

if (DRY_RUN) {
  console.log('\nDry-run complete. No files were modified.');
  process.exit(0);
}

// --- Apply changes ---

const writtenFiles = [];
const rollbackNeeded = [];

try {
  for (const chId of chapters) {
    const filePath = join(dataDir, `${chId}.ts`);
    let src = originals[chId];

    const rows = byChapter[chId] || [];
    const csvSections = rows.filter(r => r[colIndex['type']] === 'section');
    const overviewRow = rows.find(r => r[colIndex['type']] === 'overview');

    // Replace overview (= advanced column)
    const newOverview = overviewRow[colIndex['advanced']];
    src = replaceField(src, 'overview', newOverview);

    // Replace beginnerOverview
    const newBeginnerOverview = overviewRow[colIndex['beginner']];
    src = replaceField(src, 'beginnerOverview', newBeginnerOverview);

    // Replace intermediateOverview
    const newIntermediateOverview = overviewRow[colIndex['intermediate']];
    src = replaceField(src, 'intermediateOverview', newIntermediateOverview);

    // Replace each section's fields
    for (const csvRow of csvSections) {
      const heading = csvRow[colIndex['heading']];
      const newBody = csvRow[colIndex['advanced']];
      const newBeginnerBody = csvRow[colIndex['beginner']];
      const newIntermediateBody = csvRow[colIndex['intermediate']];

      src = replaceSectionField(src, heading, 'heading', heading);
      src = replaceSectionField(src, heading, 'body', newBody);
      src = replaceSectionField(src, heading, 'beginnerBody', newBeginnerBody);
      src = replaceSectionField(src, heading, 'intermediateBody', newIntermediateBody);
    }

    // Validate the modified source by loading it
    let testSrc = src;
    testSrc = testSrc.replace(/^import\s+type\s+.*$/gm, '');
    testSrc = testSrc.replace(/:\s*LearnChapter\b/g, '');
    testSrc = testSrc.replace(/:\s*CategoryId(\[\])?\b/g, '');
    testSrc = testSrc.replace(/^export\s+const\s+/gm, 'const ');
    const varName = 'learnCh' + chId.replace('ch', '');
    testSrc += `\nreturn ${varName};`;

    let chap;
    try {
      chap = new Function(testSrc)();
    } catch (e) {
      console.error(`ERROR: Validation failed for ${chId}.ts after modification: ${e.message}`);
      throw e;
    }

    // Verify required fields exist
    if (!chap.overview || !chap.sections || !Array.isArray(chap.sections)) {
      throw new Error(`${chId}: missing required fields after modification`);
    }

    // Verify termIds are preserved (compare with original)
    const origChap = loadChapter(filePath, chId);
    const origTermIds = JSON.stringify(origChap.sections.map(s => s.termIds));
    const newTermIds = JSON.stringify(chap.sections.map(s => s.termIds));
    if (origTermIds !== newTermIds) {
      throw new Error(`${chId}: termIds changed! This should not happen.`);
    }

    // Write file
    writeFileSync(filePath, src, 'utf8');
    writtenFiles.push(filePath);
    rollbackNeeded.push(chId);

    // Post-write summary
    console.log(`[OK] ${chId}.ts written`);
    console.log(`  overview chars: ${chap.overview.length}`);
    console.log(`  beginnerOverview chars: ${(chap.beginnerOverview || '').length}`);
    console.log(`  intermediateOverview chars: ${(chap.intermediateOverview || '').length}`);
    console.log(`  sections: ${chap.sections.length}`);
  }

  console.log(`\nDone. Updated ${writtenFiles.length} chapter files.`);

} catch (err) {
  console.error(`\nERROR during processing: ${err.message}`);
  console.error('Rolling back all written files...');

  for (const chId of rollbackNeeded) {
    const filePath = join(dataDir, `${chId}.ts`);
    writeFileSync(filePath, originals[chId], 'utf8');
    console.error(`  Rolled back: ${chId}.ts`);
  }

  process.exit(1);
}
