/// <reference path="../../../../node_modules/monaco-editor/monaco.d.ts" />
import { Component, Input, AfterViewInit, ElementRef, ViewChild, Output, EventEmitter, OnChanges, OnDestroy, viewChild, model } from '@angular/core';

let loadedMonaco = false;
let loadPromise: Promise<void>;

@Component({
  selector: 'app-monaco-editor',
  templateUrl: './monaco-editor.component.html',
  styleUrls: ['./monaco-editor.component.scss']
})
export class MonacoEditorComponent implements AfterViewInit, OnChanges, OnDestroy {

  //@ViewChild('editorContainer') _editorContainer?: ElementRef<HTMLDivElement>;
  private readonly editorContainer = viewChild<ElementRef<HTMLDivElement>>('editorContainer');
  readonly options = model<monaco.editor.IStandaloneEditorConstructionOptions | undefined>({
    theme: 'vs-dark'
  });

  private monacoScriptTag?: HTMLScriptElement;

  @Input() code = '';
  @Output() codeChange = new EventEmitter<String>();

  private resizeObserver?: ResizeObserver;

  // Holds instance of the current code editor
  codeEditorInstance?: monaco.editor.IStandaloneCodeEditor;

  constructor() { }
  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }

  // supports two-way binding
  ngOnChanges() {
    if (this.codeEditorInstance) {
      this.codeEditorInstance.setValue(this.code);
    }
  }

  ngAfterViewInit() {
    if (loadedMonaco) {
      // Wait until monaco editor is available
      loadPromise.then(() => {
        this.initMonaco();
      });
    } else {
      loadedMonaco = true;
      loadPromise = this.loadMonacoModule();
    }
  }

  private loadMonacoModule(): Promise<void> {
    return new Promise<void>((resolve: any) => {

      if (typeof ((<any>window).monaco) === 'object') {
        resolve();
        return;
      }

      const onAmdLoader: any = () => {
        // Load monaco
        (<any>window).require.config({ paths: { 'vs': 'assets/monaco/vs' } });

        (<any>window).require(['vs/editor/editor.main'], () => {
          this.initMonaco();
          resolve();
        });
      };

      // Load AMD loader if necessary
      if (!(<any>window).require) {
        const loaderScript: HTMLScriptElement = document.createElement('script');
        loaderScript.type = 'text/javascript';
        loaderScript.src = 'assets/monaco/vs/loader.js';
        loaderScript.addEventListener('load', onAmdLoader);
        this.monacoScriptTag = loaderScript;
        document.body.appendChild(loaderScript);
      } else {
        onAmdLoader();
      }
    });
  }

  private initMonaco(): void {
    // configure the monaco editor to understand custom language - customLang
    // monaco.languages.register(this.configService.getCustomLangExtensionPoint());
    // monaco.languages.setMonarchTokensProvider('CustomLang', this.configService.getCustomLangTokenProviders());
    // monaco.editor.defineTheme('customLangTheme', this.configService.getCustomLangTheme());   // add your custom theme here

    this.codeEditorInstance = monaco.editor.create(this.editorContainer()!.nativeElement, this.options());

    // To support two-way binding of the code
    this.codeEditorInstance!.getModel()!.onDidChangeContent(e => {
      this.codeChange.emit(this.codeEditorInstance!.getValue());
    });

    // Attach resize observer to adjust layout automatically
    this.resizeObserver = new ResizeObserver(() => {
      this.codeEditorInstance!.layout();
    });

    this.resizeObserver.observe(this.editorContainer()!.nativeElement);
  }

}
