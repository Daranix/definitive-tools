import { Component } from '@angular/core';

@Component({
  selector: 'app-swagger-editor-toolbar',
  imports: [],
  templateUrl: './swagger-editor-toolbar.component.html',
  styleUrl: './swagger-editor-toolbar.component.scss'
})
export class SwaggerEditorToolbarComponent {

  readonly serverGenerators = [
    'aspnetcore',
    'go-server',
    'spring'
  ];

  readonly clientGenerators = [
    'go',
    'csharp',
    'java',
    'typescript-angular'
  ]

}
