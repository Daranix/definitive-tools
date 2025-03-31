import { Component, effect, model, output, signal } from '@angular/core';
import { FONT_TYPES, OpengraphFontOptionsComponent } from '../../../opengraph-font-options/opengraph-font-options.component';
import { LucideAngularModule } from 'lucide-angular';
import { ContextMenuDirective } from '@/app/directives/context-menu.directive';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OpenGraphImage, OpenGraphTemplate, OpenGraphTemplateFormInputFontOptions, OpenGraphTemplateImageRight } from '@/app/pages/opengraph-generator/types';
import { DragAndDropFileComponent } from '@/app/components/drag-and-drop-file/drag-and-drop-file.component';


const TAG_DEFAULT_FONT_OPTIONS: OpenGraphTemplateFormInputFontOptions = {
  fontFamily: FONT_TYPES[0],
  fontWeight: '400',
  fontSize: 20,
  fontColor: '#030712'
} as const satisfies OpenGraphTemplateFormInputFontOptions;

const TITLE_DEFAULT_FONT_OPTIONS: OpenGraphTemplateFormInputFontOptions = {
  fontFamily: FONT_TYPES[0],
  fontWeight: '400',
  fontSize: 20,
  fontColor: '#030712'
} as const satisfies OpenGraphTemplateFormInputFontOptions;

@Component({
  selector: 'app-opengraph-template-form-image-right',
  imports: [
    FormsModule,
    OpengraphFontOptionsComponent,
    LucideAngularModule,
    ContextMenuDirective,
    DragAndDropFileComponent
  ],
  templateUrl: './opengraph-template-form-image-right.component.html',
  styleUrl: './opengraph-template-form-image-right.component.scss'
})
export class OpengraphTemplateFormImageRightComponent {

  readonly onFormUpdated = output<OpenGraphTemplateImageRight>();
  readonly TAG_DEFAULT_FONT_OPTIONS = TAG_DEFAULT_FONT_OPTIONS;
  readonly TITLE_DEFAULT_FONT_OPTIONS = TITLE_DEFAULT_FONT_OPTIONS;
  readonly tagFontOptions = signal<OpenGraphTemplateFormInputFontOptions>(TAG_DEFAULT_FONT_OPTIONS);
  readonly titleFontOptions = signal<OpenGraphTemplateFormInputFontOptions>(TITLE_DEFAULT_FONT_OPTIONS);
  readonly tag = model<string>('Marketing');
  readonly title = model<string>('Generate Beautiful Open Graph Images');
  readonly logo = model<OpenGraphImage | undefined>({ name: 'logo.png', url: '/img/opengraph-examples/logo.png' });
  readonly image = model<OpenGraphImage | undefined>({ name: 'image.png', url: '/img/opengraph-examples/image-right-example.png' });

  constructor() {
    effect(() => {
      this.onFormUpdated.emit({
        type: 'image-right',
        tag: {
          value: this.tag() ?? '',
          fontOptions: this.tagFontOptions()
        },
        title: {
          value: this.title() ?? '',
          fontOptions: this.titleFontOptions()
        },
        image: this.logo(),
        logo: this.image()
      });
    });
  }

  onImageFileChanged(img: 'logo' | 'image', event?: File) {
    const data = event ? { name: event.name, url: URL.createObjectURL(event) } : undefined;
    if(img === 'logo') {
      this.logo.set(data);
    } else {
      this.image.set(data);
    }
  }


}
