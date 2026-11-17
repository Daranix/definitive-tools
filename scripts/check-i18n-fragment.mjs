#!/usr/bin/env node
/**
 * Validates a single message fragment pair (`messages/en/<ns>.json` and
 * `messages/es/<ns>.json`) without touching the rest of the catalogue.
 *
 * Used while several features are being translated in parallel, where the full
 * `build-i18n.mjs` run would report unrelated, in-flight fragments.
 *
 * Usage:
 *   node scripts/check-i18n-fragment.mjs <namespace>
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const messagesDir = join(projectRoot, 'src', 'app', 'i18n', 'messages');
const languages = ['en', 'es'];

const namespace = process.argv[2];
if (!namespace) {
  console.error('Usage: node scripts/check-i18n-fragment.mjs <namespace>');
  process.exit(2);
}

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function flatten(value, prefix = '', out = new Map()) {
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    out.set(prefix, value);
  }
  return out;
}

async function load(language) {
  const file = join(messagesDir, language, `${namespace}.json`);
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch {
    throw new Error(`Missing fragment: ${file}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error.message}`);
  }
  if (!isPlainObject(parsed)) throw new Error(`${file} must be a JSON object`);
  return flatten(parsed);
}

const problems = [];
const maps = {};
for (const language of languages) {
  maps[language] = await load(language);
  for (const [key, value] of maps[language]) {
    if (typeof value !== 'string') {
      problems.push(`[${language}] "${key}" must be a string, got ${typeof value}`);
    } else if (value.trim() === '') {
      problems.push(`[${language}] "${key}" is empty`);
    } else if (value !== value.trim()) {
      problems.push(`[${language}] "${key}" has leading or trailing whitespace`);
    }
  }
}

const [primary, secondary] = languages;
for (const key of maps[primary].keys()) {
  if (!maps[secondary].has(key)) problems.push(`Missing in "${secondary}": ${key}`);
}
for (const key of maps[secondary].keys()) {
  if (!maps[primary].has(key)) problems.push(`Missing in "${primary}": ${key}`);
}

if (problems.length > 0) {
  console.error(`${namespace}: ${problems.length} problem(s)`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  `${namespace}: OK (${maps[primary].size} keys in en, ${maps[secondary].size} keys in es)`,
);
