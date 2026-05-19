/// <reference path="../../../types/swagger-ui-dist.d.ts" />
/// <reference path="../../../types/cheerpj.d.ts" />
import { AfterContentInit, Component, computed, effect, ElementRef, inject, model, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { MonacoEditorComponent } from "@/app/components/monaco-editor/monaco-editor.component";
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import YAML from 'yaml';
import { FormsModule } from '@angular/forms';
import { SwaggerGenerationModalComponent } from './components/swagger-generation-modal/swagger-generation-modal.component';
import { ToastService } from '@/app/services/toast.service';

import { CheerpjService } from '@/app/core/services/cheerpj.service';
import { SwaggerEditorToolbarComponent } from './components/swagger-editor-toolbar/swagger-editor-toolbar.component';

interface GeneratorConfig {
  type: 'client' | 'server';
  lang: string;
}

const PETSTORE_API_DEFINITION = '/swagger-editor/examples/petstore.yaml';
const OPENAPI_GENERATOR_JAR = '/swagger-editor/openapi-generator-cli-7.22.0.jar';
const CHEERPJ_LOADER_URL = 'https://cjrtnc.leaningtech.com/4.3/loader.js';
const RENDER_DEBOUNCE_MS = 500;

@Component({
  selector: 'app-swagger-editor',
  imports: [MonacoEditorComponent, SwaggerEditorToolbarComponent, SwaggerGenerationModalComponent, FormsModule, CommonModule],
  providers: [CheerpjService],
  templateUrl: './swagger-editor.component.html',
  styleUrl: './swagger-editor.component.scss'
})
export class SwaggerEditorComponent implements AfterContentInit {

  private readonly platformId = inject(PLATFORM_ID);
  private readonly httpClient = inject(HttpClient);
  private readonly cheerpjService = inject(CheerpjService);
  private readonly toastService = inject(ToastService);

  readonly isBrowser = computed(() => isPlatformBrowser(this.platformId));
  readonly editorContainer = viewChild(MonacoEditorComponent);
  readonly custApiDocElement = viewChild<ElementRef<HTMLDivElement>>('custApiDocElement');
  readonly editorOptions = signal<monaco.editor.IStandaloneEditorConstructionOptions | undefined>({
    language: 'yaml',
    theme: 'vs-dark',
    contextmenu: false
  });

  readonly definitionSpec = model<string>('');
  readonly hasSpec = signal<boolean>(false);
  readonly isLoading = signal<boolean>(true);
  readonly isImportModalOpen = signal<boolean>(false);
  readonly importUrlInput = signal<string>('');

  readonly activeGenerator = signal<GeneratorConfig | null>(null);

  constructor() { }

  /** Debounce subject — prevents re-rendering on every keystroke */
  private readonly contentChange$ = new Subject<string>();

  ngAfterContentInit(): void {
    this.contentChange$.pipe(
      debounceTime(RENDER_DEBOUNCE_MS)
    ).subscribe(content => this.renderSwaggerUI(content));
  }

  handleEditorLoaded(_editor: monaco.editor.IStandaloneCodeEditor) {
    if (this.isBrowser()) {
      this.loadExampleDefinition().then();
    }
  }

  handleOnPaste(pasteEvent: { event: monaco.editor.IPasteEvent, pastedText?: string, fullText?: string }) {
    try {
      JSON.parse(pasteEvent.fullText!);
      (window as any).monaco.editor.setModelLanguage((window as any).monaco.editor.getModels()[0], 'json');
    } catch {
      (window as any).monaco.editor.setModelLanguage((window as any).monaco.editor.getModels()[0], 'yaml');
    }

    setTimeout(() => {
      this.editorContainer()?.formatCode();
    }, 250);
  }

  /** Called by the template on every editor change — feeds the debounce subject */
  onContentChanges(content: string) {
    this.contentChange$.next(content);
  }

  handleClear() {
    this.definitionSpec.set('');
    this.hasSpec.set(false);
  }

  handleImportUrl() {
    this.importUrlInput.set('');
    this.isImportModalOpen.set(true);
  }

  async confirmImportUrl() {
    const url = this.importUrlInput();
    if (!url) return;

    this.isImportModalOpen.set(false);
    this.isLoading.set(true);
    try {
      const content = await lastValueFrom(this.httpClient.get(url, { responseType: 'text' }));
      this.definitionSpec.set(content);
    } catch (ex) {
      console.error('Failed to import from URL', ex);
      if (ex instanceof HttpErrorResponse && ex.status === 0) {
        alert('CORS Error: The external server blocked the request. This usually happens when the server doesn\'t allow cross-origin requests. Try downloading the file and using "Import file" instead.');
      } else {
        alert('Failed to load the definition from the provided URL. Please check the URL and try again.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  handleFileImport(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.definitionSpec.set(content);
      input.value = ''; // Reset input
    };
    reader.readAsText(file);
  }

  handleSaveYaml() {
    const content = this.definitionSpec() || '';
    if (!content) {
      alert('Editor is empty. Nothing to save.');
      return;
    }
    // Normalize line endings to LF for consistent file output
    const normalizedContent = content.replace(/\r\n/g, '\n');
    const blob = new Blob([normalizedContent], { type: 'text/yaml' });
    this.downloadFile(blob, 'swagger.yaml');
  }

  handleSaveJson() {
    try {
      const content = this.definitionSpec() || '';
      if (!content) {
        alert('Editor is empty. Nothing to save.');
        return;
      }

      let jsonContent: string;
      try {
        const parsed = JSON.parse(content);
        jsonContent = JSON.stringify(parsed, null, 2);
      } catch {
        const parsed = YAML.parse(content);
        jsonContent = JSON.stringify(parsed, null, 2);
      }

      const blob = new Blob([jsonContent], { type: 'application/json' });
      this.downloadFile(blob, 'swagger.json');
    } catch (ex) {
      console.error('Failed to convert to JSON', ex);
      alert('Failed to convert current content to valid JSON.');
    }
  }

  private downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Use a small timeout to ensure the browser has started the download
    // before revoking the URL and removing the element.
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  async loadExampleDefinition() {
    this.isLoading.set(true);
    try {
      const definition = await lastValueFrom(this.httpClient.get(PETSTORE_API_DEFINITION, { responseType: 'text' }));
      this.definitionSpec.set(definition);
    } catch (ex) {
      console.error('Failed to load example definition', ex);
    } finally {
      this.isLoading.set(false);
    }
  }

  async handleGenerateClient(lang: string) {
    if (this.cheerpjService.isGenerating()) {
      // If already generating, maximize the modal so the user sees the active process
      this.cheerpjService.isMinimized.set(false);
      this.toastService.warning({
        message: `A generation process is already active. Please wait or cancel it.`
      });
      return;
    }
    // Ensure modal is maximized for new generation
    this.cheerpjService.isMinimized.set(false);
    this.activeGenerator.set({
      type: 'client',
      lang: lang
    });
  }

  private async renderSwaggerUI(content: string) {
    let spec: Record<string, any> | null = null;

    try {
      try {
        spec = JSON.parse(content);
      } catch {
        spec = YAML.parse(content);
      }
    } catch (ex) {
      console.error('Failed to parse spec', ex);
    }

    if (!spec) {
      this.hasSpec.set(false);
      return;
    }

    this.hasSpec.set(true);

    try {
      // Import directly from the ES bundle file, bypassing index.js.
      // index.js unconditionally requires absolute-path.js → require("path") → Node built-in
      // which breaks esbuild's browser bundle. swagger-ui-dist has no exports map,
      // so this subpath import resolves freely.
      // The file exports the SwaggerUI factory as the CJS module.exports (default).
      const SwaggerUIBundle = (await import('swagger-ui-dist/swagger-ui-es-bundle.js')).default;

      const container = this.custApiDocElement()?.nativeElement;
      if (!container) return;

      // Clear previous render before mounting a new instance
      container.innerHTML = '';

      SwaggerUIBundle({
        spec,
        domNode: container,
        deepLinking: true,
      });
    } catch (ex) {
      console.error('Failed to render Swagger UI', ex);
    } finally {
      this.isLoading.set(false);
    }
  }
}
