import {
  computed,
  DOCUMENT,
  effect,
  inject,
  Injectable,
  isDevMode,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser, PlatformLocation } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { catchError, filter, firstValueFrom, map, of } from 'rxjs';

import {
  DEFAULT_LANGUAGE,
  isLanguage,
  LANGUAGE_LOCALES,
  LANGUAGE_SHORT_LABELS,
  LANGUAGE_STORAGE_KEY,
  languageFromUrl,
  stripLanguagePrefix,
  SUPPORTED_LANGUAGES,
  withLanguagePrefix,
  type Language,
} from './languages';

export type TranslateParams = Record<string, unknown>;

export interface SetLanguageOptions {
  /** Push the language-prefixed URL through the router. Defaults to `false`. */
  navigate?: boolean;
  /** Remember the choice in `localStorage`. Defaults to `navigate`. */
  persist?: boolean;
  /** Replace the current history entry instead of pushing a new one. */
  replaceUrl?: boolean;
}

/**
 * Central i18n service: owns the active language, keeps it in sync with the
 * URL, and exposes translation and `Intl` formatting helpers.
 *
 * Templates normally use the `translate` pipe (`'key' | translate`); TypeScript
 * code uses {@link I18nService.t}, which is signal aware so it can be called
 * inside `computed()`/`effect()` and re-evaluates when the language changes.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly platformLocation = inject(PlatformLocation);
  private readonly meta = inject(Meta);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _language = signal<Language>(DEFAULT_LANGUAGE);
  private readonly numberFormatters = new Map<string, Intl.NumberFormat>();
  private readonly dateFormatters = new Map<string, Intl.DateTimeFormat>();

  private started = false;
  private handledFirstVisit = false;

  /** Currently active language. */
  readonly language = this._language.asReadonly();

  /** All languages the application ships with. */
  readonly languages = SUPPORTED_LANGUAGES;

  /** Compact label of the active language (`EN`, `ES`). */
  readonly shortLabel = computed(() => LANGUAGE_SHORT_LABELS[this._language()]);

  /** BCP 47 locale of the active language, for `Intl` APIs. */
  readonly locale = computed(() => LANGUAGE_LOCALES[this._language()]);

  readonly isDefaultLanguage = computed(
    () => this._language() === DEFAULT_LANGUAGE,
  );

  constructor() {
    // Keep the document language attribute in sync with the active language.
    effect(() => {
      const language = this._language();
      this.document.documentElement?.setAttribute('lang', language);
      this.meta.updateTag({
        property: 'og:locale',
        content: language === 'es' ? 'es_ES' : 'en_GB',
      });
    });
  }

  /**
   * Boots the language layer. Must run once, before the first render, so the
   * very first paint already uses the language encoded in the URL. Resolves
   * once the bundle for that language is available.
   */
  async initialize(): Promise<void> {
    if (this.started) return;
    this.started = true;

    await this.apply(languageFromUrl(this.initialUrl()), { persist: false });
    this.watchRouter();
  }

  /** Adopts the language encoded in a URL without navigating. */
  syncWithUrl(url: string): void {
    const next = languageFromUrl(url);
    if (next !== this._language()) {
      void this.apply(next, { persist: false });
    }
  }

  /**
   * Switches the application language, optionally navigating to the matching
   * URL and persisting the choice.
   */
  async setLanguage(
    language: Language,
    options: SetLanguageOptions = {},
  ): Promise<boolean> {
    if (!isLanguage(language)) return false;

    const {
      navigate = false,
      persist = navigate,
      replaceUrl = false,
    } = options;
    await this.apply(language, { persist });

    if (!navigate) return true;

    const current = this.currentUrl();
    const target = withLanguagePrefix(current, language);
    if (target === current) return true;

    return this.router.navigateByUrl(target, { replaceUrl });
  }

  /** Switches to the other supported language. */
  toggle(): Promise<boolean> {
    const next: Language = this._language() === 'en' ? 'es' : 'en';
    return this.setLanguage(next, { navigate: true });
  }

  /**
   * Translates a key for the active language.
   *
   * Reading the language signal inside keeps `computed()`/`effect()` callers
   * reactive, so labels defined in TypeScript follow language switches.
   */
  t(key: string, params?: TranslateParams): string {
    // Read the signal so callers inside computed()/effect() stay reactive.
    this._language();
    const value = this.translate.instant(key, params);
    if (typeof value === 'string') return value;
    if (isDevMode()) {
      console.warn(`[i18n] Missing or non-string translation for "${key}"`);
    }
    return key;
  }

  /** `true` when the active language (or its fallback) defines `key`. */
  has(key: string): boolean {
    this._language();
    return this.translate.instant(key) !== key;
  }

  /**
   * Prefixes a router link with the active language.
   * Accepts a string (`/tool/qr-generator`) or a router command array
   * (`['/tool', id]`).
   */
  localizeUrl(url: string): string;
  localizeUrl(url: readonly unknown[]): readonly unknown[];
  localizeUrl(url: string | readonly unknown[]): string | readonly unknown[] {
    const language = this._language();

    if (typeof url === 'string') {
      if (!url.startsWith('/')) return url;
      return withLanguagePrefix(url, language);
    }

    if (Array.isArray(url) && url.length > 0 && typeof url[0] === 'string') {
      return [withLanguagePrefix(url[0], language), ...url.slice(1)];
    }

    return url;
  }

  /**
   * Canonical, language aware absolute URL for the current page.
   */
  canonicalUrlFor(path: string = this.currentUrl()): string {
    const origin = this.origin();
    return `${origin}${withLanguagePrefix(path, this._language())}`;
  }

  // ---------------------------------------------------------------------------
  // Intl formatting
  // ---------------------------------------------------------------------------

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return this.getNumberFormatter(options).format(value);
  }

  formatCurrency(
    value: number,
    currency = 'EUR',
    options?: Intl.NumberFormatOptions,
  ): string {
    return this.getNumberFormatter({
      style: 'currency',
      currency,
      ...options,
    }).format(value);
  }

  formatPercent(value: number, options?: Intl.NumberFormatOptions): string {
    return this.getNumberFormatter({
      style: 'percent',
      maximumFractionDigits: 2,
      ...options,
    }).format(value);
  }

  formatDate(
    value: Date | number | string,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const key = `${this.locale()}|${JSON.stringify(options ?? {})}`;
    let formatter = this.dateFormatters.get(key);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(
        this.locale(),
        options ?? { dateStyle: 'medium' },
      );
      this.dateFormatters.set(key, formatter);
    }
    return formatter.format(date);
  }

  private getNumberFormatter(
    options?: Intl.NumberFormatOptions,
  ): Intl.NumberFormat {
    const key = `${this.locale()}|${JSON.stringify(options ?? {})}`;
    let formatter = this.numberFormatters.get(key);
    if (!formatter) {
      formatter = new Intl.NumberFormat(this.locale(), options);
      this.numberFormatters.set(key, formatter);
    }
    return formatter;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private apply(
    language: Language,
    options: { persist: boolean },
  ): Promise<boolean> {
    this._language.set(language);
    if (options.persist) this.storeLanguage(language);

    return firstValueFrom(
      this.translate.use(language).pipe(
        map(() => true),
        catchError(() => of(false)),
      ),
    );
  }

  private watchRouter(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;
        this.syncWithUrl(url);
        this.detectPreferredLanguage(url);
      });
  }

  /**
   * The URL is the single source of truth for the active language: an explicit
   * `/es` prefix means Spanish, everything else means the default language.
   * Only the bare home URL honours a previously saved choice, so a returning
   * visitor who picked Spanish lands on `/es` again instead of being dropped
   * back into English.
   */
  private detectPreferredLanguage(url: string): void {
    if (this.handledFirstVisit || !this.isBrowser) return;
    this.handledFirstVisit = true;

    // Only the unprefixed home page is redirected.
    if (languageFromUrl(url) !== DEFAULT_LANGUAGE) return;
    if (stripLanguagePrefix(url) !== '/') return;

    const stored = this.readStoredLanguage();
    if (stored === null || stored === DEFAULT_LANGUAGE) return;

    void this.setLanguage(stored, {
      navigate: true,
      persist: false,
      replaceUrl: true,
    });
  }

  /** URL the application was opened on, available during SSR too. */
  private initialUrl(): string {
    const pathname = this.platformLocation.pathname ?? '/';
    const search = this.platformLocation.search ?? '';
    return `${pathname}${search}`;
  }

  private currentUrl(): string {
    return this.router.url;
  }

  private origin(): string {
    if (!this.isBrowser) return 'https://tools.mpesteban.dev';
    return this.document.location.origin;
  }

  private readStoredLanguage(): Language | null {
    if (!this.isBrowser) return null;
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return isLanguage(stored) ? stored : null;
    } catch {
      return null;
    }
  }

  private storeLanguage(language: Language): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Storage can be unavailable (private mode, blocked cookies). Ignore.
    }
  }

  /** Root relative path without the language prefix, used for hreflang links. */
  pathWithoutLanguage(url: string = this.currentUrl()): string {
    return stripLanguagePrefix(url);
  }
}
