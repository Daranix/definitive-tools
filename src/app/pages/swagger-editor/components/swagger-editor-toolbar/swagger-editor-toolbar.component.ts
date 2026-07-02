import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-swagger-editor-toolbar',
  imports: [LucideIconComponent],
  templateUrl: './swagger-editor-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './swagger-editor-toolbar.component.scss',
})
export class SwaggerEditorToolbarComponent {
  readonly onImportUrl = output<void>();
  readonly onImportFile = output<void>();
  readonly onSaveYaml = output<void>();
  readonly onSaveJson = output<void>();
  readonly onLoadExample = output<void>();
  readonly onClear = output<void>();

  readonly onGenerateServer = output<string>();
  readonly onGenerateClient = output<string>();

  readonly serverGenerators = ['aspnetcore', 'go-server', 'spring'];

  readonly clientGenerators = ['go', 'csharp', 'java', 'typescript-angular'];
}
