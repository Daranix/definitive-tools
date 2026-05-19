import { Component, inject, computed, effect } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MetadataService } from '@/app/services/metadata.service';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, from } from 'rxjs';
import { marked } from 'marked';
import fm from 'front-matter';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

interface LegalMetadata {
  title: string;
  description: string;
  slug: string;
  date?: string;
  keywords?: string;
  [key: string]: unknown;
}

@Component({
  selector: 'app-legal',
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.scss'
})
export class LegalComponent {
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);
  private metadataService = inject(MetadataService);

  readonly doc = toSignal(this.route.paramMap.pipe(map(params => params.get('doc')!)));

  readonly docResource = rxResource({
    params: () => this.doc(),
    stream: (params) => this.loadDoc(params)
  });

  private loadDoc({ params: doc }: { params: string | null | undefined }) {
    if (!doc) throw new Error('No doc parameter provided');
    return this.http.get(`/legal/${doc}.md`, { responseType: 'text' }).pipe(
      switchMap(rawMarkdown => from(this.parseDocContent(rawMarkdown)))
    );
  }

  private async parseDocContent(rawMarkdown: string) {
    const parsed = fm<LegalMetadata>(rawMarkdown);
    const html = await marked.parse(parsed.body);
    return {
      metadata: parsed.attributes,
      content: this.sanitizer.bypassSecurityTrustHtml(html)
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
      const docValue = this.docResource.value();
      if (!docValue?.metadata) return;

      const meta = docValue.metadata;
      const description = meta.description || `${meta.title} - Definitive Tools. Free, secure, client-side online tools.`;
      
      this.metadataService.updateMetadata({
        title: meta.title,
        description,
        keywords: meta.keywords || `${meta.title}, definitive tools, open source`
      });
    });
  }
}
