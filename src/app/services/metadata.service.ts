import { inject, Injectable, DOCUMENT } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { TopNavbarService } from './top-navbar.service';
import { I18nService } from '../i18n/i18n.service';
import {
  SUPPORTED_LANGUAGES,
  withLanguagePrefix,
  type Language,
} from '../i18n/languages';

interface MetaInfo {
  title: string;
  description: string;
  updateCanonical?: boolean;
  keywords?: string;
  thumbnail?: string;
}

/** Production origin used when rendering on the server. */
const FALLBACK_ORIGIN = 'https://tools.mpesteban.dev';

@Injectable({
  providedIn: 'root',
})
export class MetadataService {
  private readonly titleService = inject(Title);
  private readonly metadataService = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly topNavbarService = inject(TopNavbarService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  updateMetadata({
    title,
    description,
    updateCanonical = true,
    keywords,
    thumbnail,
  }: MetaInfo) {
    this.topNavbarService.title.set(title);
    this.titleService.setTitle(title);
    this.metadataService.updateTag({ property: 'og:title', content: title });
    this.metadataService.updateTag({
      property: 'og:description',
      content: description,
    });
    this.metadataService.updateTag({
      property: 'twitter:description',
      content: description,
    });
    this.metadataService.updateTag({ name: 'description', content: description });

    if (keywords) {
      this.metadataService.updateTag({ name: 'keywords', content: keywords });
    }

    if (thumbnail) {
      this.metadataService.updateTag({
        property: 'og:image',
        content: thumbnail,
      });
      this.metadataService.updateTag({
        name: 'twitter:image',
        content: thumbnail,
      });
    }

    this.updateLanguageTags();

    if (updateCanonical) {
      this.updateCanonnicalUrl();
    }
  }

  /**
   * Publishes the language of the current page (`og:locale`) and the
   * `hreflang` alternates for every supported language, so crawlers can
   * discover the translation of the page they are on.
   */
  private updateLanguageTags(): void {
    const active = this.i18n.language();
    this.metadataService.updateTag({
      property: 'og:locale',
      content: active === 'es' ? 'es_ES' : 'en_GB',
    });

    const path = this.localizedPath();
    const origin = this.origin();

    for (const language of SUPPORTED_LANGUAGES) {
      this.upsertAlternate(
        language,
        `${origin}${withLanguagePrefix(path, language)}`,
      );
    }

    // English is the default, so it doubles as the x-default target.
    this.upsertAlternate(
      'x-default',
      `${origin}${withLanguagePrefix(path, 'en')}`,
    );
  }

  private upsertAlternate(hreflang: Language | 'x-default', href: string) {
    const head = this.document.head;
    if (!head) return;

    let link = head.querySelector<HTMLLinkElement>(
      `link[rel="alternate"][hreflang="${hreflang}"]`,
    );

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', hreflang);
      head.appendChild(link);
    }

    link.setAttribute('href', href);
  }

  /** Current route without query, fragment or language prefix. */
  private localizedPath(): string {
    return this.i18n.pathWithoutLanguage(this.router.url);
  }

  private origin(): string {
    try {
      const location = this.document.location;
      if (location?.origin) return location.origin;
    } catch {
      // Server rendering may not expose a location object.
    }
    return FALLBACK_ORIGIN;
  }

  private updateCanonnicalUrl(url?: string) {
    const head = this.document.head;
    const link = head?.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) return;

    if (url) {
      link.setAttribute('href', url);
      return;
    }

    const path = this.localizedPath();
    link.setAttribute(
      'href',
      `${this.origin()}${withLanguagePrefix(path, this.i18n.language())}`,
    );
  }
}
