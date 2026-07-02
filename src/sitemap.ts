import type { Request, Response } from 'express';
import type { Routes } from '@angular/router';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { routes } from './app/app.routes';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = process.env['HOST'] ?? 'https://tools.mpesteban.dev';

/** Cache TTL in milliseconds. Defaults to 24 hours. */
const CACHE_TTL_MS = Number(process.env['SITEMAP_CACHE_TTL_MS'] ?? 86_400_000);

// Resolved at module load — same logic as server.ts.
// In production: dist/definitive-tools/server/ → browser/ is one level up.
// In dev (ng serve): falls back to process.cwd()/public.
const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserFolder = resolve(serverDistFolder, '../browser');

// ---------------------------------------------------------------------------
// Route walker
// ---------------------------------------------------------------------------

/**
 * Recursively walks an Angular `Routes` array and returns every resolvable
 * static path. Dynamic segments (`:param`), wildcard routes (`**`), and
 * pure redirect entries are skipped automatically.
 *
 * Routes that have `children` are NOT added themselves — they are treated as
 * layout wrappers and only their children contribute URLs.
 */
function extractStaticPaths(routeList: Routes, prefix = ''): string[] {
  const result: string[] = [];

  for (const route of routeList) {
    const seg = route.path ?? '';

    // Skip wildcards, redirects and dynamic segments
    if (seg === '**') continue;
    if (route.redirectTo !== undefined) continue;
    if (seg.includes(':')) continue;

    const fullPath = [prefix, seg].filter(Boolean).join('/');

    if (route.children?.length) {
      // Layout route — descend into children without adding this path
      result.push(...extractStaticPaths(route.children, fullPath));
    } else {
      // Leaf route — the empty-string home path becomes '/'
      result.push(fullPath || '/');
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Dynamic segments — legal docs resolved from the filesystem
// ---------------------------------------------------------------------------

/**
 * Returns the list of legal doc slugs by reading the actual markdown files.
 * Tries the production `browser/legal/` folder first; falls back to
 * `public/legal/` relative to `process.cwd()` (dev / project root).
 */
function getLegalSlugs(): string[] {
  const candidates = [
    resolve(browserFolder, 'legal'),
    resolve(process.cwd(), 'public', 'legal'),
  ];

  for (const dir of candidates) {
    try {
      return readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, ''));
    } catch {
      // Try next candidate
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// Priority / changefreq helpers
// ---------------------------------------------------------------------------

interface SitemapEntry {
  loc: string;
  priority: string;
  changefreq: string;
}

function entryMeta(path: string): Pick<SitemapEntry, 'priority' | 'changefreq'> {
  if (path === '/') return { priority: '1.0', changefreq: 'weekly' };
  if (path.startsWith('tool/')) return { priority: '0.8', changefreq: 'monthly' };
  return { priority: '0.5', changefreq: 'yearly' };
}

// ---------------------------------------------------------------------------
// Entry builder
// ---------------------------------------------------------------------------

function buildEntries(): SitemapEntry[] {
  const staticPaths = extractStaticPaths(routes);
  const legalSlugs = getLegalSlugs();

  const staticEntries: SitemapEntry[] = staticPaths.map((path) => ({
    loc: path === '/' ? `${BASE_URL}/` : `${BASE_URL}/${path}`,
    ...entryMeta(path),
  }));

  const legalEntries: SitemapEntry[] = legalSlugs.map((slug) => ({
    loc: `${BASE_URL}/legal/${slug}`,
    priority: '0.5',
    changefreq: 'yearly',
  }));

  return [...staticEntries, ...legalEntries];
}

// ---------------------------------------------------------------------------
// XML generation
// ---------------------------------------------------------------------------

function generateXml(): string {
  const today = new Date().toISOString().split('T')[0];

  const urlNodes = buildEntries()
    .map(
      ({ loc, priority, changefreq }) => `
  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlNodes}
</urlset>`;
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

interface SitemapCache {
  xml: string;
  generatedAt: number;
}

let cache: SitemapCache | null = null;

function isCacheValid(): boolean {
  return cache !== null && Date.now() - cache.generatedAt < CACHE_TTL_MS;
}

function getCachedXml(): string {
  if (!isCacheValid()) {
    cache = { xml: generateXml(), generatedAt: Date.now() };
  }
  return cache!.xml;
}

/** Invalidates the sitemap cache, forcing regeneration on the next request. */
export function invalidateSitemapCache(): void {
  cache = null;
}

// ---------------------------------------------------------------------------
// Express handler
// ---------------------------------------------------------------------------

/**
 * Express request handler for GET /sitemap.xml.
 * Serves a cached sitemap, regenerating it when the TTL expires.
 */
export function sitemapHandler(_req: Request, res: Response): void {
  const xml = getCachedXml();

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', `public, max-age=${CACHE_TTL_MS / 1000}`);
  res.send(xml);
}
