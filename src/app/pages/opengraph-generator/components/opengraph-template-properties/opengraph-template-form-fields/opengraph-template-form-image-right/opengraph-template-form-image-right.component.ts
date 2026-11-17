import {
  Component,
  effect,
  inject,
  model,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  FONT_TYPES,
  OpengraphFontOptionsComponent,
} from '../../../opengraph-font-options/opengraph-font-options.component';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { ContextMenuDirective } from '@/app/directives/context-menu.directive';
import { FormsModule } from '@angular/forms';
import {
  OpenGraphImage,
  OpenGraphTemplateFormInputFontOptions,
  OpenGraphTemplateImageRight,
} from '@/app/pages/opengraph-generator/types';
import { DragAndDropFileComponent } from '@/app/components/drag-and-drop-file/drag-and-drop-file.component';
import { I18nService } from '@/app/i18n/i18n.service';

const TAG_DEFAULT_FONT_OPTIONS: OpenGraphTemplateFormInputFontOptions = {
  fontFamily: FONT_TYPES[0],
  fontWeight: 400,
  fontSize: 20,
  fontColor: '#030712',
} as const satisfies OpenGraphTemplateFormInputFontOptions;

const TITLE_DEFAULT_FONT_OPTIONS: OpenGraphTemplateFormInputFontOptions = {
  fontFamily: FONT_TYPES[0],
  fontWeight: 600,
  fontSize: 58,
  fontColor: '#030712',
} as const satisfies OpenGraphTemplateFormInputFontOptions;

@Component({
  selector: 'app-opengraph-template-form-image-right',
  imports: [
    FormsModule,
    OpengraphFontOptionsComponent,
    LucideIconComponent,
    ContextMenuDirective,
    DragAndDropFileComponent,
    TranslatePipe,
  ],
  templateUrl: './opengraph-template-form-image-right.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './opengraph-template-form-image-right.component.scss',
})
export class OpengraphTemplateFormImageRightComponent {
  private readonly i18n = inject(I18nService);

  readonly onFormUpdated = output<OpenGraphTemplateImageRight>();
  readonly TAG_DEFAULT_FONT_OPTIONS = TAG_DEFAULT_FONT_OPTIONS;
  readonly TITLE_DEFAULT_FONT_OPTIONS = TITLE_DEFAULT_FONT_OPTIONS;
  readonly tagFontOptions = model<OpenGraphTemplateFormInputFontOptions>(
    TAG_DEFAULT_FONT_OPTIONS,
  );
  readonly titleFontOptions = model<OpenGraphTemplateFormInputFontOptions>(
    TITLE_DEFAULT_FONT_OPTIONS,
  );
  readonly tag = model<string>(
    this.i18n.t('opengraph-generator.defaults.marketing'),
  );
  readonly title = model<string>(
    this.i18n.t('opengraph-generator.defaults.openGraphImages'),
  );
  readonly logo = model<OpenGraphImage | undefined>({
    name: 'logo.png',
    url: '/img/opengraph-examples/logo-1.png',
  });
  readonly image = model<OpenGraphImage | undefined>({
    name: 'image.png',
    url: '/img/opengraph-examples/img-right-example.png',
  });

  constructor() {
    effect(() => {
      this.onFormUpdated.emit({
        type: 'image-right',
        tag: {
          value: this.tag() ?? '',
          fontOptions: this.tagFontOptions(),
        },
        title: {
          value: this.title() ?? '',
          fontOptions: this.titleFontOptions(),
        },
        image: this.image(),
        logo: this.logo(),
      });
    });
  }

  onImageFileChanged(img: 'logo' | 'image', event?: File) {
    const data = event
      ? { name: event.name, url: URL.createObjectURL(event) }
      : undefined;
    if (img === 'logo') {
      this.logo.set(data);
    } else {
      this.image.set(data);
    }
  }
}
