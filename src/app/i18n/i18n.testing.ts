import { EnvironmentProviders, Provider } from '@angular/core';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { TestBed } from '@angular/core/testing';
import { StaticTranslateLoader } from './i18n.providers';
import { DEFAULT_LANGUAGE } from './languages';

/**
 * Translation providers for unit tests.
 *
 * Specs never boot the real application initializers, so this registers the
 * bundled dictionaries synchronously against the default language:
 *
 * ```ts
 * await TestBed.configureTestingModule({
 *   imports: [MyComponent],
 *   providers: [provideRouter([]), ...provideI18nTesting()],
 * }).compileComponents();
 * ```
 */
export function provideI18nTesting(): (Provider | EnvironmentProviders)[] {
  return [
    provideTranslateService({
      lang: DEFAULT_LANGUAGE,
      fallbackLang: DEFAULT_LANGUAGE,
      loader: () => new StaticTranslateLoader(),
    }),
  ];
}

/** Primes the translation service inside a `TestBed` created context. */
export function useEnglishTranslations(): void {
  const translate = TestBed.inject(TranslateService);
  translate.use(DEFAULT_LANGUAGE).subscribe();
}
