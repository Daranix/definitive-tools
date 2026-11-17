import {
  EnvironmentProviders,
  inject,
  provideAppInitializer,
  Provider,
} from '@angular/core';
import {
  provideTranslateService,
  TranslateLoader,
  TranslateService,
} from '@ngx-translate/core';
import { from, map, Observable, of } from 'rxjs';

import en from './translations/en.json';
import { DEFAULT_LANGUAGE } from './languages';
import { I18nService } from './i18n.service';

/**
 * Loader backed by the bundles that ship with the application.
 *
 * English — the default language — is bundled inline so it is available on the
 * very first render without any extra request. Every other language is a
 * separate lazily imported chunk, so visitors who never switch language never
 * download the extra copy. The initializer below awaits the load, so server
 * rendering and prerendering still emit the correct language on the first byte.
 */
export class StaticTranslateLoader extends TranslateLoader {
  getTranslation(language: string): Observable<TranslationObjectDomain> {
    if (language === DEFAULT_LANGUAGE) {
      return of(en);
    }

    return from(
      import(
        /* webpackChunkName: "i18n-es" */
        './translations/es.json'
      ),
    ).pipe(map((module) => module.default));
  }
}

/** Shape accepted by `TranslateService.setTranslation`. */
type TranslationObjectDomain = typeof en;

/**
 * Registers `@ngx-translate/core` and resolves the URL language before the
 * first render.
 */
export function provideI18n(): (Provider | EnvironmentProviders)[] {
  return [
    provideTranslateService({
      lang: DEFAULT_LANGUAGE,
      fallbackLang: DEFAULT_LANGUAGE,
      loader: () => new StaticTranslateLoader(),
    }),
    provideAppInitializer(() => {
      const translate = inject(TranslateService);
      translate.setTranslation(DEFAULT_LANGUAGE, en, true);
      translate.addLangs(['en', 'es']);
    }),
    provideAppInitializer(() => inject(I18nService).initialize()),
  ];
}
