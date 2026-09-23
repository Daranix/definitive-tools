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

// Configure marked with highlight.js for syntax rendering, preserving raw mermaid blocks
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      if (lang === 'mermaid') {
        return code;
      }
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
  readonly mobilePanel = signal<'editor' | 'preview'>('editor');
  readonly isStylesDrawerOpen = signal<boolean>(false);
  readonly selectedPreset = signal<'github' | 'indigo' | 'warm'>('github');
  readonly leftWidthPercent = signal<number>(50);

  // Load initial welcome template and mermaid script resource using httpResource.text (Browser Only, bypassed on SSR)
  readonly welcomeResource = httpResource.text(() =>
    this.isBrowser() ? '/presets/welcome.md' : undefined,
  );
  readonly mermaidScriptResource = httpResource.text(() =>
    this.isBrowser() ? '/scripts/mermaid-interactivity.js' : undefined,
  );

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

    // Reactive effect to initialize Mermaid window handlers (Strict Client-Side / Browser Only, bypassed during SSR)
    effect(() => {
      if (!this.isBrowser() || typeof window === 'undefined') return;
      const scriptCode = this.mermaidScriptResource.value();
      if (
        scriptCode &&
        !(window as any).__mermaidHandlersInitialized
      ) {
        try {
          const fn = new Function(scriptCode);
          fn();
        } catch (e) {
          console.error('Failed to initialize mermaid interactivity script:', e);
        }
      }
    });
  }

  ngAfterViewInit() {
    // Load the default stylesheet preset and initialize diagram handlers
    if (this.isBrowser()) {
      this.initMermaidGlobalHandlers();
      this.loadPresetCss('github');
    }
  }

  private initMermaidGlobalHandlers() {
    if (!this.isBrowser()) return;
    const win = window as any;
    if (win.__mermaidHandlersInitialized) return;

    const scriptCode = this.mermaidScriptResource.value();
    if (scriptCode) {
      try {
        const fn = new Function(scriptCode);
        fn();
      } catch (e) {
        console.error('Failed to initialize mermaid interactivity script:', e);
      }
    }
  }

  private getMermaidThemeForPreset(): 'default' | 'dark' | 'neutral' {
    switch (this.selectedPreset()) {
      case 'github':
        return 'default';
      case 'warm':
        return 'neutral';
      case 'indigo':
      default:
        return 'dark';
    }
  }

  onMarkdownChanges(content: string) {
    this.markdownText.set(content);
    this.updatePreview(content);
  }

  onCssChanges(content: string) {
    this.customCss.set(content);
  }

  private mermaidCounter = 0;

  private async updatePreview(content: string) {
    if (!content) {
      this.previewHtml.set('');
      return;
    }
    try {
      let html = await marked.parse(content);
      if (
        this.isBrowser() &&
        (html.includes('class="mermaid"') || html.includes('language-mermaid'))
      ) {
        html = await this.renderMermaidDiagrams(html);
      }
      this.previewHtml.set(html);
    } catch (error) {
      console.error('Markdown compilation failed:', error);
    }
  }

  private async renderMermaidDiagrams(html: string): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const mermaidNodes = doc.querySelectorAll(
      '.mermaid, code.language-mermaid, .language-mermaid',
    );

    if (mermaidNodes.length === 0) {
      return html;
    }

    try {
      const mermaidModule = await import('mermaid');
      const mermaid = mermaidModule.default;
      const theme = this.getMermaidThemeForPreset();

      // Inject self-contained interactive handlers script into HTML output for standalone export & preview
      const scriptCode = this.mermaidScriptResource.value();
      if (scriptCode) {
        const script = doc.createElement('script');
        script.textContent = scriptCode;
        doc.body.appendChild(script);
      }

      for (let i = 0; i < mermaidNodes.length; i++) {
        const node = mermaidNodes[i];
        const diagramCode = node.textContent?.trim() || '';
        if (!diagramCode) continue;

        const uniqueId = `mermaid-diag-${Date.now()}-${this.mermaidCounter++}`;
        try {
          const { svg } = await mermaid.render(uniqueId, diagramCode);

          const card = doc.createElement('div');
          card.className = 'mermaid-diagram-card';
          card.style.position = 'relative';
          card.style.margin = '1.5rem 0';
          card.style.borderRadius = '0.75rem';
          card.style.backgroundColor =
            theme === 'default'
              ? '#ffffff'
              : theme === 'neutral'
                ? '#fdfbf7'
                : 'rgba(15, 23, 42, 0.6)';
          card.style.overflow = 'hidden';

          const isLight = theme === 'default' || theme === 'neutral';
          const textColor = isLight ? '#475569' : '#94a3b8';
          const btnBg = isLight ? '#e2e8f0' : '#334155';
          const btnText = isLight ? '#1e293b' : '#f8fafc';
          const btnBorder = isLight ? '#cbd5e1' : '#475569';

          const toolbar = doc.createElement('div');
          toolbar.className = 'mermaid-toolbar';
          toolbar.style.position = 'absolute';
          toolbar.style.top = '0.75rem';
          toolbar.style.right = '0.75rem';
          toolbar.style.zIndex = '20';
          toolbar.style.display = 'flex';
          toolbar.style.alignItems = 'center';
          toolbar.style.gap = '0.35rem';
          toolbar.style.padding = '0.35rem 0.6rem';
          toolbar.style.borderRadius = '0.5rem';
          toolbar.style.backdropFilter = 'blur(8px)';
          toolbar.style.backgroundColor = isLight
            ? 'rgba(241, 245, 249, 0.95)'
            : 'rgba(15, 23, 42, 0.95)';
          toolbar.style.border = isLight
            ? '1px solid rgba(203, 213, 225, 0.8)'
            : '1px solid rgba(51, 65, 85, 0.8)';
          toolbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';

          toolbar.innerHTML = `
            <button onclick="window.__mermaidZoom(this, 0.8)" title="Zoom Out" style="padding: 0.2rem 0.45rem; background: ${btnBg}; color: ${btnText}; border: 1px solid ${btnBorder}; border-radius: 0.375rem; cursor: pointer; font-size: 0.75rem; font-weight: 700;">-</button>
            <button onclick="window.__mermaidResetZoom(this)" title="Reset Zoom" style="padding: 0.2rem 0.45rem; background: ${btnBg}; color: ${btnText}; border: 1px solid ${btnBorder}; border-radius: 0.375rem; cursor: pointer; font-size: 0.75rem; font-weight: 600;">1:1</button>
            <button onclick="window.__mermaidZoom(this, 1.2)" title="Zoom In" style="padding: 0.2rem 0.45rem; background: ${btnBg}; color: ${btnText}; border: 1px solid ${btnBorder}; border-radius: 0.375rem; cursor: pointer; font-size: 0.75rem; font-weight: 700;">+</button>
            <div style="width: 1px; height: 0.9rem; background: ${btnBorder}; margin: 0 0.2rem;"></div>
            <button onclick="window.__mermaidDownloadSvg(this)" title="Download SVG" style="padding: 0.2rem 0.5rem; background: #4f46e5; color: #ffffff; border: 1px solid #6366f1; border-radius: 0.375rem; cursor: pointer; font-size: 0.7rem; font-weight: 600;">SVG</button>
            <button onclick="window.__mermaidDownloadPng(this)" title="Download PNG" style="padding: 0.2rem 0.5rem; background: #059669; color: #ffffff; border: 1px solid #10b981; border-radius: 0.375rem; cursor: pointer; font-size: 0.7rem; font-weight: 600;">PNG</button>
          `;

          const viewport = doc.createElement('div');
          viewport.className = 'mermaid-svg-viewport';
          viewport.setAttribute('onwheel', 'window.__mermaidWheel(event, this)');
          viewport.setAttribute('onmousedown', 'window.__mermaidPanStart(event, this)');
          viewport.style.padding = '1.25rem';
          viewport.style.display = 'flex';
          viewport.style.justifyContent = 'center';
          viewport.style.overflow = 'auto';
          viewport.style.maxHeight = '650px';
          viewport.style.transition = 'transform 0.2s ease-out';
          viewport.innerHTML = svg;

          card.appendChild(toolbar);
          card.appendChild(viewport);

          const targetToReplace =
            node.parentElement?.tagName === 'PRE' ? node.parentElement : node;
          targetToReplace.replaceWith(card);
        } catch (err) {
          const errSvg =
            document.getElementById(uniqueId) ||
            document.getElementById(`d${uniqueId}`);
          if (errSvg) errSvg.remove();

          const errContainer = doc.createElement('div');
          errContainer.className = 'mermaid-error-container';
          errContainer.style.padding = '0.75rem 1rem';
          errContainer.style.border = '1px dashed #ef4444';
          errContainer.style.borderRadius = '0.5rem';
          errContainer.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          errContainer.style.color = '#f87171';
          errContainer.style.fontFamily = 'monospace';
          errContainer.style.fontSize = '0.85rem';
          errContainer.style.margin = '1rem 0';
          errContainer.textContent = `Mermaid Diagram Syntax Error: ${err instanceof Error ? err.message : String(err)}`;

          const targetToReplace =
            node.parentElement?.tagName === 'PRE' ? node.parentElement : node;
          targetToReplace.replaceWith(errContainer);
        }
      }

      return doc.body.innerHTML;
    } catch (err) {
      console.error('Failed to load or render mermaid:', err);
      return html;
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
            .mermaid-toolbar {
              display: none !important;
            }
            .mermaid-diagram-card {
              border: none !important;
              box-shadow: none !important;
              background: transparent !important;
            }
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
