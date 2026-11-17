#!/usr/bin/env node
/**
 * Builds the runtime translation bundles from per-feature message fragments.
 *
 * Layout
 * ------
 *   src/app/i18n/messages/<language>/<namespace>.json   ← edited by hand
 *   src/app/i18n/translations/<language>.json           ← generated, committed
 *
 * Every fragment file corresponds to one top-level namespace (`home.json` →
 * `home.*`, `tools.json` → `tools.*`). Fragments are deep merged and key sorted
 * so the generated files stay stable in diffs.
 *
 * The script also verifies that both languages expose exactly the same keys and
 * exits with a non-zero status when a key is missing on either side, which
 * keeps English and Spanish in sync.
 *
 * Usage:
 *   node scripts/build-i18n.mjs            # build + verify
 *   node scripts/build-i18n.mjs --check    # verify only, never writes
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const messagesDir = join(projectRoot, 'src', 'app', 'i18n', 'messages');
const outputDir = join(projectRoot, 'src', 'app', 'i18n', 'translations');
const LANGUAGES = ['en', 'es'];
const checkOnly = process.argv.includes('--check');

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(target[key])) {
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function sortKeys(value) {
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortKeys(value[key])]),
  );
}

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

async function readLanguage(language) {
  const dir = join(messagesDir, language);
  let files;
  try {
    files = (await readdir(dir)).filter((file) => file.endsWith('.json')).sort();
  } catch {
    throw new Error(`Missing messages directory for "${language}": ${dir}`);
  }
  if (files.length === 0) {
    throw new Error(`No message fragments found in ${dir}`);
  }

  const merged = {};
  let keyCount = 0;

  for (const file of files) {
    const raw = await readFile(join(dir, file), 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(`${language}/${file} is not valid JSON: ${error.message}`);
    }
    if (!isPlainObject(parsed)) {
      throw new Error(`${language}/${file} must contain a JSON object`);
    }
    // The fragment file name is the top level namespace of its keys.
    const namespace = file.replace(/\.json$/, '');
    deepMerge(merged, { [namespace]: parsed });
    keyCount += flatten(parsed).size;
  }

  return { merged, files, keyCount };
}

async function main() {
  const bundles = {};
  const problems = [];

  for (const language of LANGUAGES) {
    const { merged, files, keyCount } = await readLanguage(language);
    const flat = flatten(merged);

    for (const [key, value] of flat) {
      if (value === '') problems.push(`[${language}] "${key}" is empty`);
      if (typeof value === 'string' && value.trim() !== value) {
        problems.push(`[${language}] "${key}" has leading/trailing whitespace`);
      }
    }

    bundles[language] = { merged, flat, files, keyCount };
  }

  const [primary, ...others] = LANGUAGES;
  for (const language of others) {
    const baseline = bundles[primary].flat;
    const current = bundles[language].flat;

    for (const key of baseline.keys()) {
      if (!current.has(key)) {
        problems.push(`Missing in "${language}": ${key}`);
      }
    }
    for (const key of current.keys()) {
      if (!baseline.has(key)) {
        problems.push(`Missing in "${primary}": ${key}`);
      }
    }
  }

  if (!checkOnly) {
    await mkdir(outputDir, { recursive: true });
    for (const language of LANGUAGES) {
      const output = join(outputDir, `${language}.json`);
      await writeFile(
        output,
        `${JSON.stringify(sortKeys(bundles[language].merged), null, 2)}\n`,
        'utf8',
      );
    }
  }

  const summary = LANGUAGES.map(
    (language) =>
      `${language}: ${bundles[language].flat.size} keys from ${bundles[language].files.length} fragments`,
  ).join('\n');

  console.log(`i18n build ${checkOnly ? '(check only)' : 'complete'}\n${summary}`);

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }

  console.log('All languages are in sync.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
