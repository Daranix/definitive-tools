import { DragAndDropFileComponent } from '@/app/components/drag-and-drop-file/drag-and-drop-file.component';
import { OpenGraphImage, OpenGraphTemplateFormInputFontOptions, OpenGraphTemplateHero } from '@/app/pages/opengraph-generator/types';
import { Component, effect, model, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FONT_TYPES, OpengraphFontOptionsComponent } from '../../../opengraph-font-options/opengraph-font-options.component';
import { FormsModule } from '@angular/forms';
import { ContextMenuDirective } from '@/app/directives/context-menu.directive';


const TAG_DEFAULT_FONT_OPTIONS: OpenGraphTemplateFormInputFontOptions = {
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
  selector: 'app-opengraph-template-form-hero',
  imports: [
    LucideAngularModule,
    DragAndDropFileComponent,
    OpengraphFontOptionsComponent,
    FormsModule,
    ContextMenuDirective
  ],
  templateUrl: './opengraph-template-form-hero.component.html',
  styleUrl: './opengraph-template-form-hero.component.scss'
})
export class OpengraphTemplateFormHeroComponent {


  readonly onFormUpdated = output<OpenGraphTemplateHero>();
  readonly TAG_DEFAULT_FONT_OPTIONS = TAG_DEFAULT_FONT_OPTIONS;
  readonly TITLE_DEFAULT_FONT_OPTIONS = TITLE_DEFAULT_FONT_OPTIONS;
  readonly tagFontOptions = model<OpenGraphTemplateFormInputFontOptions>(TAG_DEFAULT_FONT_OPTIONS);
  readonly titleFontOptions = model<OpenGraphTemplateFormInputFontOptions>(TITLE_DEFAULT_FONT_OPTIONS);
  readonly tag = model<string>('Easy Storage');
  readonly title = model<string>('Managed Databases for Everyone');
  readonly image = model<OpenGraphImage | undefined>({ name: 'image.png', url: '/img/opengraph-examples/hero-example.png' });

  constructor() {
    effect(() => {
      this.onFormUpdated.emit({
        type: 'hero',
        tag: {
          value: this.tag() ?? '',
          fontOptions: this.tagFontOptions()
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
