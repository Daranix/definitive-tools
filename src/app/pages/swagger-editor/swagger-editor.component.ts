import { AfterViewInit, Component, computed, inject, model, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { MonacoEditorComponent } from "@/app/components/monaco-editor/monaco-editor.component";
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-swagger-editor',
  imports: [MonacoEditorComponent],
  templateUrl: './swagger-editor.component.html',
  styleUrl: './swagger-editor.component.scss'
})
export class SwaggerEditorComponent {


  readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = computed(() => isPlatformBrowser(this.platformId));
  readonly editorContainer = viewChild(MonacoEditorComponent);
  readonly editorOptions = signal<monaco.editor.IStandaloneEditorConstructionOptions | undefined>({
    language: 'yaml',
    theme: 'vs-dark'
  });

  handleEditorLoaded(editor: monaco.editor.IStandaloneCodeEditor) {
    if(this.isBrowser()) {

      editor.getContribution('editor.contrib.contextmenu')?.dispose();
      /*// @ts-ignore
      const realMethod = contextmenu!._getMenuActions!;
      // @ts-ignore
      contextmenu!._getMenuActions = function () {
        const items = realMethod.apply(contextmenu, arguments);
        return items.filter(function (item: any) {
          return keepIds.includes(item.id);
        });
      };*/
    }
  }

  handleOnPaste(pasteEvent: { event: monaco.editor.IPasteEvent, pastedText?: string, fullText?: string }) {

    console.log(pasteEvent);
    try {
      JSON.parse(pasteEvent.fullText!);
      this.editorOptions.update((options) => {
        return Object.assign(options ?? {}, { language: 'yaml' });
      });
    } catch (e) {
      this.editorOptions.update((options) => {
        return Object.assign(options ?? {}, { language: 'yaml' });
      });
    }
  }

}
