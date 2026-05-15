import { AfterContentInit, Component, computed, ElementRef, inject, model, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { MonacoEditorComponent } from "@/app/components/monaco-editor/monaco-editor.component";
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import YAML from 'yaml';
import { SwaggerEditorToolbarComponent } from './components/swagger-editor-toolbar/swagger-editor-toolbar.component';

const PETSTORE_API_DEFINITION = '/examples/swagger/petstore.yaml';
const RENDER_DEBOUNCE_MS = 500;

@Component({
  selector: 'app-swagger-editor',
  imports: [MonacoEditorComponent, SwaggerEditorToolbarComponent],
  templateUrl: './swagger-editor.component.html',
  styleUrl: './swagger-editor.component.scss'
})
export class SwaggerEditorComponent implements AfterContentInit {

  private readonly platformId = inject(PLATFORM_ID);
  private readonly httpClient = inject(HttpClient);

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

  private async loadExampleDefinition() {
    try {
      const definition = await lastValueFrom(this.httpClient.get(PETSTORE_API_DEFINITION, { responseType: 'text' }));
      this.definitionSpec.set(definition);
    } catch (ex) {
      console.error('Failed to load example definition', ex);
    }
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
