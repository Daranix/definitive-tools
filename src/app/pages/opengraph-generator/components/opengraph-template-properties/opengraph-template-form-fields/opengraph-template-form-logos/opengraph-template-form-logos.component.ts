import { OpenGraphImage, OpenGraphTemplateFormInputFontOptions, OpenGraphTemplateLogos } from '@/app/pages/opengraph-generator/types';
import { Component, effect, model, output } from '@angular/core';
import { FONT_TYPES, OpengraphFontOptionsComponent } from '../../../opengraph-font-options/opengraph-font-options.component';
import { DragAndDropFileComponent } from '@/app/components/drag-and-drop-file/drag-and-drop-file.component';
import { LucideAngularComponent, LucideAngularModule } from 'lucide-angular';
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
  selector: 'app-opengraph-template-form-logos',
  imports: [DragAndDropFileComponent, LucideAngularModule, FormsModule, OpengraphFontOptionsComponent, ContextMenuDirective],
  templateUrl: './opengraph-template-form-logos.component.html',
  styleUrl: './opengraph-template-form-logos.component.scss'
})
export class OpengraphTemplateFormLogosComponent {

  readonly onFormUpdated = output<OpenGraphTemplateLogos>();
  readonly TAG_DEFAULT_FONT_OPTIONS = TAG_DEFAULT_FONT_OPTIONS;
  readonly TITLE_DEFAULT_FONT_OPTIONS = TITLE_DEFAULT_FONT_OPTIONS;
  readonly tagFontOptions = model<OpenGraphTemplateFormInputFontOptions>(TAG_DEFAULT_FONT_OPTIONS);
  readonly titleFontOptions = model<OpenGraphTemplateFormInputFontOptions>(TITLE_DEFAULT_FONT_OPTIONS);
  readonly tag = model<string>('Easy Storage');
  readonly title = model<string>('Managed Databases for Everyone');

  readonly firstLogo = model<OpenGraphImage | undefined>({ name: 'logo.png', url: '/img/opengraph-examples/logo-1.png' });
  readonly secondLogo = model<OpenGraphImage | undefined>({ name: 'logo.png', url: '/img/opengraph-examples/logo-1.png' });
  readonly thirdLogo = model<OpenGraphImage | undefined>({ name: 'logo.png', url: '/img/opengraph-examples/logo-1.png' });


  constructor() {
    effect(() => {
      this.onFormUpdated.emit({
        type: 'logos',
        tag: {
          value: this.tag() ?? '',
          fontOptions: this.tagFontOptions()
        },
        title: {
          value: this.title() ?? '',
          fontOptions: this.titleFontOptions()
        },
        firstLogo: this.firstLogo(),
        secondLogo: this.secondLogo(),
        thirdLogo: this.thirdLogo()
      });
    });
  }

  onImageFileChanged(logo: 'firstLogo' | 'secondLogo' | 'thirdLogo', event?: File) {
    const data = event ? { name: event.name, url: URL.createObjectURL(event) } : undefined;
    if (logo === 'firstLogo') {
      this.firstLogo.set(data);
    } else if (logo === 'secondLogo') {
      this.secondLogo.set(data);
    } else {
      this.thirdLogo.set(data);
    }
  }


}
