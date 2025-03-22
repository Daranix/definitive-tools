import { AfterViewInit, Component, ElementRef, forwardRef, inject, input, model, OnDestroy, OnInit, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectButtonComponent } from '../select-button/select-button.component';
import { isPlatformBrowser } from '@angular/common';
import { MonacoLoaderService } from './monarco-loader.service';
import type * as monaco from 'monaco-editor';


@Component({
  selector: 'app-code-editor',
  imports: [],
  templateUrl: './code-editor.component.html',
  styleUrl: './code-editor.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CodeEditorComponent),
      multi: true
    }
  ]
})
export class CodeEditorComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {

  private editor?: monaco.editor.IStandaloneCodeEditor;

  readonly language = input<string>();

  private readonly platform = inject(PLATFORM_ID);
  private readonly monacoLoader = inject(MonacoLoaderService);

  private readonly editorContainer = viewChild<ElementRef<HTMLDivElement>>('editorContainer');
  private onChanged: (value: string) => void = () => { };
  private onTouched: () => void = () => { };

  readonly disabled = model(false);

  ngAfterViewInit(): void {
    if(isPlatformBrowser(this.platform)) {
      this.setupEditor();
    }
  }

  private async setupEditor() {

    const monaco = await this.monacoLoader.loadMonaco();
    this.editor = monaco!.editor.create(this.editorContainer()!.nativeElement, {
      language: this.language(),
      theme: 'vs-light', // You can change to 'vs-light'
      automaticLayout: true,
      tabSize: 2,
      minimap: {
        enabled: false
      }
    });

    this.editor.onDidChangeModelContent(() => {
      const value = this.editor?.getValue();
      if(!value) return;
      this.onChanged(value);
      this.onTouched();
    });
  }

  ngOnDestroy(): void {
    this.editor?.dispose();
  }

  writeValue(obj: string): void {
    if(!obj) return;
    this.editor?.setValue(obj);
  }

  registerOnChange(fn: any): void {
    this.onChanged = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
