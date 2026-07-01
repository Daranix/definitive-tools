import {
  Component,
  input,
  ViewEncapsulation,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-markdown-preview',
  standalone: true,
  template: ` <div [innerHTML]="safeContent()"></div> `,
  changeDetection: ChangeDetectionStrategy.Eager,
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class MarkdownPreviewComponent {
  private readonly sanitizer = inject(DomSanitizer);

  // Dynamic input signals from parent converter page
  readonly html = input<string>('');
  readonly css = input<string>('');

  // Combine HTML & CSS, bypassing sanitizer as a single trusted string to prevent style tag stripping
  readonly safeContent = computed<SafeHtml>(() => {
    const cssContent = this.css() ? `<style>${this.css()}</style>` : '';
    const htmlContent = `<div class="markdown-body">${this.html()}</div>`;
    return this.sanitizer.bypassSecurityTrustHtml(cssContent + htmlContent);
  });
}
