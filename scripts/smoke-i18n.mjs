// Final smoke test: renders every route in both languages over SSR and reports
// HTTP status, <html lang>, document title and any leftover raw translation key.
const BASE = process.env['SMOKE_BASE'] ?? 'http://127.0.0.1:4321';

const TOOLS = [
  'meme-generator', 'qr-generator', 'qr-reader', 'background-remover',
  'image-converter', 'base64-encoder-decoder', 'image-base64-converter',
  'text-to-speech', 'audio-speech-to-text', 'random-password-generator',
  'jwt-decode-encode', 'opengraph-generator', 'swagger-editor',
  'markdown-to-excel', 'markdown-to-pdf', 'markdown-to-html', 'audio-editor',
  'madrid-transport-map', 'madrid-zbe-map', 'regla-de-tres',
  'salario-neto-espana', 'indemnizacion-despido-espana',
  'calculadora-hipoteca', 'calculadora-cientifica',
];

const LEGAL = ['about', 'privacy', 'terms', 'cookies', 'gdpr'];
const ROUTES = ['/', ...TOOLS.map((tool) => `/tool/${tool}`), ...LEGAL.map((doc) => `/legal/${doc}`)];

const { readdirSync } = await import('node:fs');
const namespaces = readdirSync('src/app/i18n/messages/en')
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.replace(/\.json$/, ''))
  .join('|');

const keyPattern = new RegExp(`>\\s*(?:${namespaces})\\.[a-zA-Z0-9_.]+\\s*<`);
const failures = [];

async function check(path) {
  const response = await fetch(`${BASE}${path}`);
  const html = await response.text();
  const lang = /<html[^>]*lang="([^"]*)"/.exec(html)?.[1];
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
  const leftover = keyPattern.exec(html)?.[0]?.trim();
  const expectedLang = path.startsWith('/es') ? 'es' : 'en';

  const problems = [];
  if (response.status !== 200) problems.push(`status ${response.status}`);
  if (lang !== expectedLang) problems.push(`lang=${lang}`);
  if (leftover) problems.push(`raw key ${leftover}`);
  if (!title || title === 'Definitive Tools - Free Digital Utilities') {
    if (path !== '/' && path !== '/es') problems.push(`generic title "${title}"`);
  }
  if (problems.length) failures.push(`${path} → ${problems.join(', ')}`);
}

for (const route of ROUTES) {
  await check(route);
  await check(route === '/' ? '/es' : `/es${route}`);
}

console.log(`${ROUTES.length * 2} pages checked, ${failures.length} failure(s)`);
if (failures.length) {
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exitCode = 1;
}
