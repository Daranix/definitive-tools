/**
 * Language catalogue and URL helpers for the application i18n layer.
 *
 * URL strategy
 * ------------
 * English is the default language and is served **without** a URL prefix
 * (`/`, `/tool/qr-generator`, `/legal/privacy`). Every other language is
 * served under its own prefix (`/es`, `/es/tool/qr-generator`,
 * `/es/legal/privacy`).
 *
 * The helpers in this file are deliberately dependency free so they can be
 * used from route definitions, the sitemap generator and components alike.
 */

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Language used when the URL carries no prefix. */
export const DEFAULT_LANGUAGE: Language = 'en';

/** `localStorage` key holding the visitor's explicit language choice. */
export const LANGUAGE_STORAGE_KEY = 'definitive-tools:language';

/** Human readable language names, always written in their own language. */
export const LANGUAGE_LABELS: Readonly<Record<Language, string>> = {
  en: 'English',
  es: 'Español',
};

/** Compact labels used by the language switcher button. */
export const LANGUAGE_SHORT_LABELS: Readonly<Record<Language, string>> = {
  en: 'EN',
  es: 'ES',
};

/** BCP 47 locale used for `Intl` number, currency and date formatting. */
export const LANGUAGE_LOCALES: Readonly<Record<Language, string>> = {
  en: 'en-GB',
  es: 'es-ES',
};

export function isLanguage(value: unknown): value is Language {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

/** Splits `path?query#fragment` into its path part and the `?query#fragment` suffix. */
function splitUrl(url: string): { path: string; suffix: string } {
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');
  const cut = [queryIndex, hashIndex].filter((index) => index >= 0);
  const index = cut.length ? Math.min(...cut) : -1;
  if (index < 0) return { path: url, suffix: '' };
  return { path: url.slice(0, index), suffix: url.slice(index) };
}

/** Returns the first path segment of a URL path (`/es/tool/x` → `es`). */
function firstSegment(path: string): string {
  return path.split('/').filter(Boolean)[0] ?? '';
}

/**
 * Resolves the language encoded in a URL.
 * `/es`, `/es/`, `/es/tool/x` → `es`; anything else → the default language.
 */
export function languageFromUrl(url: string): Language {
  const { path } = splitUrl(url);
  const segment = firstSegment(path);
  return isLanguage(segment) ? segment : DEFAULT_LANGUAGE;
}

/**
 * Removes the language prefix from a URL, leaving a root relative path.
 * `/es/tool/x?y=1` → `/tool/x?y=1`; `/es` → `/`.
 */
export function stripLanguagePrefix(url: string): string {
  const { path, suffix } = splitUrl(url);
  const segment = firstSegment(path);
  if (!isLanguage(segment)) return url;

  const stripped = path
    .split('/')
    .filter(Boolean)
    .slice(1)
    .join('/');

  return `${stripped ? `/${stripped}` : '/'}${suffix}`;
}

/**
 * Prefixes (or un-prefixes) a URL for the requested language.
 * English returns the bare path, every other language gets `/<lang>`.
 */
export function withLanguagePrefix(url: string, language: Language): string {
  const { path, suffix } = splitUrl(stripLanguagePrefix(url));

  if (language === DEFAULT_LANGUAGE) {
    return `${path}${suffix}`;
  }

  const prefixed = path === '/' ? `/${language}` : `/${language}${path}`;
  return `${prefixed}${suffix}`;
}

/** Absolute, canonical URL for a path in a given language. */
export function canonicalUrl(origin: string, path: string, language: Language): string {
  const base = origin.replace(/\/$/, '');
  return `${base}${withLanguagePrefix(path, language)}`;
}
