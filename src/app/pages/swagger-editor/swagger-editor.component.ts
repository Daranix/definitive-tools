import { Component, computed, inject, PLATFORM_ID } from '@angular/core';
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



}
