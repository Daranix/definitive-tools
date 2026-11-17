import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';

/**
 * Prefixes router links with the active language.
 *
 * English (the default language) keeps unprefixed URLs, so the pipe is a no-op
 * there. Every other language receives its `/es` style prefix.
 *
 * @example
 * <a [routerLink]="'/tool/qr-generator' | localizeUrl">QR</a>
 * <a [routerLink]="['/tool', tool.id] | localizeUrl">Tool</a>
 */
@Pipe({
  name: 'localizeUrl',
  pure: false,
})
export class LocalizeUrlPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform<T extends string | readonly unknown[] | null | undefined>(
    url: T,
  ): T {
    if (url === null || url === undefined) return url;
    return this.i18n.localizeUrl(url as string) as T;
  }
}
