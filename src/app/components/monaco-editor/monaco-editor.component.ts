/// <reference path="../../../../node_modules/monaco-editor/monaco.d.ts" />
import { Component, Input, AfterViewInit, ElementRef, Output, EventEmitter, OnChanges, OnDestroy, viewChild, model, output } from '@angular/core';

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

  readonly onPaste = output<{ event: monaco.editor.IPasteEvent, pastedText?: string, fullText?: string }>();
  readonly onEditorLoaded = output<monaco.editor.IStandaloneCodeEditor>();

  @Input() code = '';
  @Output() codeChange = new EventEmitter<string>();

  private resizeObserver?: ResizeObserver;

  // Holds instance of the current code editor
  private codeEditorInstance?: monaco.editor.IStandaloneCodeEditor;

  constructor() { }
  ngOnDestroy(): void {
    this.monacoScriptTag?.remove();
    this.resizeObserver?.disconnect();
    this.codeEditorInstance?.dispose();
  }

  // supports two-way binding
  ngOnChanges() {
    if (this.codeEditorInstance) {
      const currentEditorValue = this.codeEditorInstance.getValue();
      // Normalize line endings to prevent false-positive inequality that triggers setValue
      const normalizedNewCode = (this.code || '').replace(/\r\n/g, '\n');
      const normalizedEditorValue = currentEditorValue.replace(/\r\n/g, '\n');

      if (normalizedNewCode !== normalizedEditorValue) {
        // If we really must update the editor from the outside
        this.codeEditorInstance.setValue(this.code);
      }
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

    /*
    const monaco = (<any>window).monaco;
    configureMonacoYaml(monaco);*/

    const options = this.options();

    this.codeEditorInstance = monaco.editor.create(this.editorContainer()!.nativeElement, {
      ...options,
      value: this.code || ''
    });

    // To support two-way binding of the code
    this.codeEditorInstance!.getModel()!.onDidChangeContent(e => {
      this.codeChange.emit(this.codeEditorInstance!.getValue());
    });

    // Attach resize observer to adjust layout automatically
    this.resizeObserver = new ResizeObserver(() => {
      this.codeEditorInstance!.layout();
    });

    this.resizeObserver.observe(this.editorContainer()!.nativeElement);

    this.codeEditorInstance.onDidPaste((pasteEvent) => {
      pasteEvent.clipboardEvent?.preventDefault();
      // Monaco gives you the range + pasted text
      const pastedText = pasteEvent.range
        ? this.codeEditorInstance!.getModel()!.getValueInRange(pasteEvent.range)
        : '';
      this.onPaste.emit({ event: pasteEvent, pastedText: pastedText, fullText: this.codeEditorInstance!.getValue() });
    });

    this.onEditorLoaded.emit(this.codeEditorInstance!);

  }

  getEditorInstance(): monaco.editor.IStandaloneCodeEditor | undefined {
    return this.codeEditorInstance;
  }

  removeContextMenuElement() {
    // const keepIds = [];
    const contextmenu = this.codeEditorInstance!.getContribution('editor.contrib.contextmenu')! as any;
    const realMethod = contextmenu._getMenuActions;
    console.log(realMethod())
    contextmenu._getMenuActions = function () {
      const items = realMethod.apply(contextmenu, arguments);
      /*return items.filter(function (item) {
        return keepIds.includes(item.id);
      });*/
      return items;
    };
  }

  formatCode() {
    this.codeEditorInstance?.getAction('editor.action.formatDocument')?.run();
  }

}
