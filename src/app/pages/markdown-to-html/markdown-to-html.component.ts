/// <reference path="../../../../node_modules/monaco-editor/monaco.d.ts" />
import {
  Component,
  inject,
  signal,
  viewChild,
  AfterViewInit,
  PLATFORM_ID,
  ElementRef,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { MonacoEditorComponent } from '@/app/components/monaco-editor/monaco-editor.component';
import { MetadataService } from '@/app/services/metadata.service';
import { MarkdownPreviewComponent } from '@/app/components/markdown-preview/markdown-preview.component';

import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import { HttpClient, httpResource } from '@angular/common/http';

// Configure marked with highlight.js for premium syntax rendering
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
);

// Preset stylesheet asset paths
const PRESET_URLS = {
  github: '/presets/github.css',
  indigo: '/presets/indigo.css',
  warm: '/presets/warm.css',
};

@Component({
  selector: 'app-markdown-to-html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideIconComponent,
    MonacoEditorComponent,
    MarkdownPreviewComponent,
  ],
  templateUrl: './markdown-to-html.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './markdown-to-html.component.scss',
})
export class MarkdownToHtmlComponent implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = signal<boolean>(isPlatformBrowser(this.platformId));
  private readonly metadataService = inject(MetadataService);
  private readonly httpClient = inject(HttpClient);

  // Editor ViewChildren references
  readonly leftEditor = viewChild('leftEditor', {
    read: MonacoEditorComponent,
  });
  readonly codeEditor = viewChild('codeEditor', {
    read: MonacoEditorComponent,
  });
  readonly cssEditor = viewChild('cssEditor', { read: MonacoEditorComponent });

  // Core signals
  readonly markdownText = signal<string>('');
  readonly previewHtml = signal<string>('');
  readonly customCss = signal<string>('');
  readonly activeTab = signal<'preview' | 'code'>('code');
  readonly isStylesDrawerOpen = signal<boolean>(false);
  readonly selectedPreset = signal<'github' | 'indigo' | 'warm'>('github');
  readonly leftWidthPercent = signal<number>(50);

  // Load initial welcome template using httpResource.text
  readonly welcomeResource = httpResource.text(() => '/presets/welcome.md');

  // Monaco Editor configurations
  readonly markdownOptions =
    signal<monaco.editor.IStandaloneEditorConstructionOptions>({
      language: 'markdown',
      theme: 'vs-dark',
      wordWrap: 'on',
      minimap: { enabled: false },
      automaticLayout: true,
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      padding: { top: 10, bottom: 10 },
    });

  readonly htmlOptions =
    signal<monaco.editor.IStandaloneEditorConstructionOptions>({
      language: 'html',
      theme: 'vs-dark',
      wordWrap: 'on',
      minimap: { enabled: false },
      automaticLayout: true,
      fontSize: 14,
      lineNumbers: 'on',
      readOnly: true,
      scrollBeyondLastLine: false,
      padding: { top: 10, bottom: 10 },
    });

  readonly cssOptions =
    signal<monaco.editor.IStandaloneEditorConstructionOptions>({
      language: 'css',
      theme: 'vs-dark',
      wordWrap: 'on',
      minimap: { enabled: false },
      automaticLayout: true,
      fontSize: 13,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      padding: { top: 10, bottom: 10 },
    });

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Markdown to HTML Converter | definitive-tools',
      description:
        'Convert markdown text to clean HTML code instantly with real-time responsive browser side-by-side editing, customized CSS styling presets, and simple code exports.',
      keywords:
        'markdown to html, html generator, css preview, dynamic styling, inline css, markup editor, clean code',
    });

    // Reactive effect to load initial welcome markdown template via httpResource
    effect(() => {
      const welcomeText = this.welcomeResource.value();
      const editor = this.leftEditor();
      if (welcomeText) {
        this.markdownText.set(welcomeText);
        this.updatePreview(welcomeText);
        if (editor) {
          editor.getEditorInstance()?.setValue(welcomeText);
        }
      }
    });
  }

  ngAfterViewInit() {
    // Load the default stylesheet preset
    if (this.isBrowser()) {
      this.loadPresetCss('github');
    }
  }

  onMarkdownChanges(content: string) {
    this.markdownText.set(content);
    this.updatePreview(content);
  }

  onCssChanges(content: string) {
    this.customCss.set(content);
  }

  private async updatePreview(content: string) {
    if (!content) {
      this.previewHtml.set('');
      return;
    }
    try {
      const html = await marked.parse(content);
      this.previewHtml.set(html);
    } catch (error) {
      console.error('Markdown compilation failed:', error);
    }
  }

  handleClear() {
    this.markdownText.set('');
    this.previewHtml.set('');
    this.leftEditor()?.getEditorInstance()?.setValue('');
  }

  handleCopyMarkdown() {
    navigator.clipboard.writeText(this.markdownText());
  }

  handleCopyHtml() {
    navigator.clipboard.writeText(this.previewHtml());
  }

  toggleStylesDrawer() {
    this.isStylesDrawerOpen.update((val) => !val);
  }

  downloadMarkdown() {
    const mdText = this.markdownText();
    if (!mdText) return;
    
    const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'document.md';
    link.click();
    URL.revokeObjectURL(url);
  }

  downloadHtml() {
    const htmlText = this.previewHtml();
    if (!htmlText) return;
    
    // Construct a full HTML document including custom styles for premium preview
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Converted Document</title>
  <style>
    ${this.customCss()}
  </style>
</head>
<body class="markdown-body" style="padding: 2rem; max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  ${htmlText}
</body>
</html>`;
    
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'document.html';
    link.click();
    URL.revokeObjectURL(url);
  }

  printPreview() {
    const htmlText = this.previewHtml();
    if (!htmlText) return;

    // Create a hidden iframe for print preparation to avoid popup blockers and extra tabs
    let printFrame = document.getElementById('markdown-print-iframe') as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'markdown-print-iframe';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!frameDoc) return;

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Document</title>
        <style>
          ${this.customCss()}
          @media print {
            body { padding: 0; margin: 0; }
          }
        </style>
      </head>
      <body class="markdown-body" style="padding: 2rem;">
        ${htmlText}
      </body>
      </html>
    `);
    frameDoc.close();

    // Trigger printing once content is loaded
    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    }, 250);
  }

  private loadPresetCss(preset: 'github' | 'indigo' | 'warm') {
    this.httpClient
      .get(PRESET_URLS[preset], { responseType: 'text' })
      .subscribe({
        next: (css) => {
          this.customCss.set(css);
          this.cssEditor()?.getEditorInstance()?.setValue(css);
        },
        error: (err) => {
          console.error('Failed to load preset stylesheet: ' + preset, err);
        },
      });
  }

  applyPreset(preset: 'github' | 'indigo' | 'warm') {
    this.selectedPreset.set(preset);
    this.loadPresetCss(preset);
  }

  onCssFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (file.type !== 'text/css' && !file.name.endsWith('.css')) {
      alert('Please upload a valid CSS file (.css)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      if (content) {
        this.customCss.set(content);
        this.cssEditor()?.getEditorInstance()?.setValue(content);
        // Clear input to allow re-upload of same file name
        input.value = '';
      }
    };
    reader.onerror = () => {
      console.error('Failed to read file');
    };
    reader.readAsText(file);
  }

  resetStyles() {
    this.applyPreset('github');
  }

  onDragStart(event: MouseEvent | TouchEvent) {
    event.preventDefault();

    const onMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const clientX =
        'touches' in moveEvent
          ? moveEvent.touches[0].clientX
          : moveEvent.clientX;
      const mainElement = document.querySelector('main');
      if (!mainElement) return;

      const rect = mainElement.getBoundingClientRect();
      const percentage = ((clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, percentage));
      this.leftWidthPercent.set(clamped);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onMouseMove);
      document.removeEventListener('touchend', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onMouseMove);
    document.addEventListener('touchend', onMouseUp);
  }
}
