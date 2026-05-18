import { Component, inject, signal, viewChild, AfterViewInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MonacoEditorComponent } from "@/app/components/monaco-editor/monaco-editor.component";
import { MetadataService } from '@/app/services/metadata.service';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

// Configure marked with highlight.js
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

@Component({
  selector: 'app-markdown-to-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, MonacoEditorComponent],
  templateUrl: './markdown-to-pdf.component.html',
  styleUrl: './markdown-to-pdf.component.scss'
})
export class MarkdownToPdfComponent implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = signal(isPlatformBrowser(this.platformId));
  private readonly metadataService = inject(MetadataService);

  readonly editorContainer = viewChild(MonacoEditorComponent);
  readonly markdownText = signal<string>('');
  readonly previewHtml = signal<string>('');
  readonly isGenerating = signal<boolean>(false);

  readonly editorOptions = signal<monaco.editor.IStandaloneEditorConstructionOptions>({
    language: 'markdown',
    theme: 'vs-dark',
    wordWrap: 'on',
    minimap: { enabled: false },
    automaticLayout: true,
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    padding: { top: 10, bottom: 10 }
  });

  private readonly contentChange$ = new Subject<string>();

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Markdown to PDF Converter',
      description: 'Convert your Markdown text to professional PDF documents instantly. Live preview, premium styling, and easy download.',
      keywords: 'markdown, pdf, converter, documentation, markdown editor, professional pdf, online tools'
    });

    this.contentChange$.pipe(
      debounceTime(300)
    ).subscribe(content => {
      this.updatePreview(content);
    });
  }

  ngAfterViewInit() {
    // Initial preview if needed
    if (this.markdownText()) {
      this.updatePreview(this.markdownText());
    }
  }

  onContentChanges(content: string) {
    this.markdownText.set(content);
    this.contentChange$.next(content);
  }

  private async updatePreview(content: string) {
    if (!content) {
      this.previewHtml.set('');
      return;
    }
    const html = await marked.parse(content);
    this.previewHtml.set(html);
  }

  handleClear() {
    this.markdownText.set('');
    this.previewHtml.set('');
    // Note: We might need to call setValue on the monaco instance if two-way binding isn't enough
    this.editorContainer()?.getEditorInstance()?.setValue('');
  }

  handleCopy() {
    navigator.clipboard.writeText(this.markdownText());
    // Could add a toast here if ToastService is available
  }

  async downloadPdf() {
    const element = document.getElementById('preview-content');
    if (!element || !this.markdownText()) return;

    this.isGenerating.set(true);

    const opt = {
      margin: 15,
      filename: 'document.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    } as const;

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      this.isGenerating.set(false);
    }
  }
}
