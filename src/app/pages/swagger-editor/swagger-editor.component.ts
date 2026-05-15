import { AfterContentInit, Component, computed, ElementRef, inject, model, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { MonacoEditorComponent } from "@/app/components/monaco-editor/monaco-editor.component";
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import YAML from 'yaml';
import { SwaggerEditorToolbarComponent } from './components/swagger-editor-toolbar/swagger-editor-toolbar.component';

const PETSTORE_API_DEFINITION = '/examples/swagger/petstore.yaml';
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

  ngAfterContentInit(): void {
   
  }

  handleEditorLoaded(editor: monaco.editor.IStandaloneCodeEditor) {
    if (this.isBrowser()) {
      this.loadExampleDefinition().then();
    }
  }

  handleOnPaste(pasteEvent: { event: monaco.editor.IPasteEvent, pastedText?: string, fullText?: string }) {

    try {
      JSON.parse(pasteEvent.fullText!);
      (window as any).monaco.editor.setModelLanguage((window as any).monaco.editor.getModels()[0], 'json');
    } catch (e) {
      (window as any).monaco.editor.setModelLanguage((window as any).monaco.editor.getModels()[0], 'yaml');
    }

    setTimeout(() => {
        this.editorContainer()?.formatCode();
    }, 250);
  }

  private async loadExampleDefinition() {
    try {
      const definition = await lastValueFrom(this.httpClient.get(PETSTORE_API_DEFINITION, { responseType: 'text' }));
      this.definitionSpec.set(definition);
    } catch(ex) {
      console.error('Failed to load example definition', ex);
    }
  }

  async onContentChanges(content: string) {
    
    let spec: Record<string, any> | null = null;

    try {
      try {
        spec = JSON.parse(content);
      } catch (ex) {
        spec = YAML.parse(content);
      }
    } catch(ex) {
      console.error('Failed to parse example definition', ex);
    }

    if(!spec) {
      this.hasSpec.set(false);
      return;
    }

    this.hasSpec.set(true);
    const { SwaggerUIBundle } = await import('swagger-ui-dist');
    SwaggerUIBundle({
      spec,
      domNode: this.custApiDocElement()?.nativeElement,
      deepLinking: true,
    });

  }

}
