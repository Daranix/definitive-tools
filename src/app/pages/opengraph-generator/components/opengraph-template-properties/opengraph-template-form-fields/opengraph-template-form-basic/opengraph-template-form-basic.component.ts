import { Component, effect, input, model, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FONT_TYPES, OpengraphFontOptionsComponent } from '../../../opengraph-font-options/opengraph-font-options.component';
import { FormGroup, FormsModule } from '@angular/forms';
import { OpenGraphImage, OpenGraphTemplateBasic, OpenGraphTemplateFormInputFontOptions } from '@/app/pages/opengraph-generator/types';
import { ContextMenuDirective } from '@/app/directives/context-menu.directive';
import { DragAndDropFileComponent } from '@/app/components/drag-and-drop-file/drag-and-drop-file.component';


const DESCRIPTION_DEFAULT_FONT_OPTIONS: OpenGraphTemplateFormInputFontOptions = {
  fontFamily: FONT_TYPES[0],
  fontWeight: 400,
  fontSize: 20,
  fontColor: '#030712'
} as const satisfies OpenGraphTemplateFormInputFontOptions;

const TITLE_DEFAULT_FONT_OPTIONS: OpenGraphTemplateFormInputFontOptions = {
  fontFamily: FONT_TYPES[0],
  fontWeight: 600,
  fontSize: 42,
  fontColor: '#030712'
} as const satisfies OpenGraphTemplateFormInputFontOptions;

@Component({
  selector: 'app-opengraph-template-form-basic',
  imports: [LucideAngularModule, OpengraphFontOptionsComponent, ContextMenuDirective, DragAndDropFileComponent, FormsModule],
  templateUrl: './opengraph-template-form-basic.component.html',
  styleUrl: './opengraph-template-form-basic.component.scss'
})
export class OpengraphTemplateFormBasicComponent {

  readonly onFormUpdated = output<OpenGraphTemplateBasic>();
  readonly TAG_DEFAULT_FONT_OPTIONS = DESCRIPTION_DEFAULT_FONT_OPTIONS;
  readonly TITLE_DEFAULT_FONT_OPTIONS = TITLE_DEFAULT_FONT_OPTIONS;
  readonly descriptionFontOptions = model<OpenGraphTemplateFormInputFontOptions>(DESCRIPTION_DEFAULT_FONT_OPTIONS);
  readonly titleFontOptions = model<OpenGraphTemplateFormInputFontOptions>(TITLE_DEFAULT_FONT_OPTIONS);
  readonly description = model<string>('Easy Storage');
  readonly title = model<string>('Managed Databases for Everyone');
  readonly image = model<OpenGraphImage | undefined>({ name: 'logo.png', url: '/img/opengraph-examples/logo-1.png' });

  constructor() {
    effect(() => {
      this.onFormUpdated.emit({
        type: 'basic',
        description: {
          value: this.description() ?? '',
          fontOptions: this.descriptionFontOptions()
        },
        title: {
          value: this.title() ?? '',
          fontOptions: this.titleFontOptions()
        },
        image: this.image()
      });
    });
  }

  onImageFileChanged(event?: File) {
    const data = event ? { name: event.name, url: URL.createObjectURL(event) } : undefined;
    this.image.set(data);
  }

}
