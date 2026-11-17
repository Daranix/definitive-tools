import {
  Component,
  inject,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MetadataService } from '@/app/services/metadata.service';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, from } from 'rxjs';
import { marked } from 'marked';
import fm from 'front-matter';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { LanguageSwitcherComponent } from '@/app/components/language-switcher/language-switcher.component';
import { LocalizeUrlPipe } from '@/app/pipes/localize-url.pipe';
import { I18nService } from '@/app/i18n/i18n.service';
import { DEFAULT_LANGUAGE, type Language } from '@/app/i18n/languages';

interface LegalMetadata {
  title: string;
  description: string;
  slug: string;
  date?: string;
  keywords?: string;
  [key: string]: unknown;
}

/** Request key of the legal document resource: document + active language. */
interface LegalDocParams {
  doc: string | undefined;
  language: Language;
}

import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-legal',
  imports: [
    CommonModule,
    RouterLink,
    LucideIconComponent,
    FooterComponent,
    LanguageSwitcherComponent,
    LocalizeUrlPipe,
    TranslatePipe,
  ],
  templateUrl: './legal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './legal.component.scss',
})
export class LegalComponent {
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);
  private metadataService = inject(MetadataService);
  private readonly i18n = inject(I18nService);

  readonly doc = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('doc') ?? undefined)),
  );

  readonly docResource = rxResource({
    // The language is part of the key so switching language re-fetches the
    // translated document instead of keeping the previous one cached.
    params: (): LegalDocParams => ({
      doc: this.doc(),
      language: this.i18n.language(),
    }),
    stream: ({ params }) => this.loadDoc(params),
  });

  private loadDoc({ doc, language }: LegalDocParams) {
    if (!doc) throw new Error('No doc parameter provided');
    if (doc.endsWith('.md')) {
      throw new Error('Invalid document name (recursion guard)');
    }
    const path =
      language === DEFAULT_LANGUAGE
        ? `/legal/${doc}.md`
        : `/legal/${language}/${doc}.md`;
    return this.http
      .get(path, { responseType: 'text' })
      .pipe(
        switchMap((rawMarkdown) => from(this.parseDocContent(rawMarkdown))),
      );
  }

  private async parseDocContent(rawMarkdown: string) {
    if (rawMarkdown.trim().startsWith('<')) {
      throw new Error('Document not found (SPA fallback)');
    }
    const parsed = fm<LegalMetadata>(rawMarkdown);
    const html = await marked.parse(parsed.body);
    return {
      metadata: parsed.attributes,
      content: this.sanitizer.bypassSecurityTrustHtml(html),
    };
  }

  readonly metadata = computed(() => {
    if (this.error()) return null;
    return this.docResource.value()?.metadata ?? null;
  });

  readonly content = computed(() => {
    if (this.error()) return null;
    return this.docResource.value()?.content ?? null;
  });

  readonly error = computed(() => this.docResource.error() !== undefined);

  readonly errorCode = computed(() => {
    const err = this.docResource.error();
    if (err instanceof HttpErrorResponse) {
      return err.status;
    }
    return 500;
  });

  readonly isLoading = computed(() => this.docResource.isLoading());

  constructor() {
    // Read the resource value to trigger it
    this.docResource.value;
    this.updateLegalMetadata();
  }

  private updateLegalMetadata(): void {
    effect(() => {
      // Keep the SEO metadata in sync with the active language, so switching
      // language updates the title/description to the translated document.
      this.i18n.language();

      const docValue = this.docResource.value();
      if (!docValue?.metadata) return;

      const meta = docValue.metadata;

      this.metadataService.updateMetadata({
        title: meta.title,
        description:
          meta.description ||
          this.i18n.t('common.legal.defaultDescription', { title: meta.title }),
        keywords:
          meta.keywords ||
          this.i18n.t('common.legal.defaultKeywords', { title: meta.title }),
      });
    });
  }
}
