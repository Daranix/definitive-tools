import {
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  model,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { OpengraphTemplateSelectorComponent } from './components/opengraph-template-selector/opengraph-template-selector.component';
import { OpengraphTemplatePropertiesComponent } from './components/opengraph-template-properties/opengraph-template-properties.component';
import { TemplateType } from './constants';
import { OpenGraphData } from './types';
import { OpengraphTemplateBuilderComponent } from './components/opengraph-template-builder/opengraph-template-builder.component';
import { MetadataService } from '@/app/services/metadata.service';
import { SelectButtonComponent } from '@/app/components/select-button/select-button.component';
import { FormsModule } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import { I18nService } from '@/app/i18n/i18n.service';

import { FooterComponent } from '../../components/footer/footer.component';

type Platform = 'opengraph' | 'twitter';
@Component({
  selector: 'app-opengraph-generator',
  imports: [
    LucideIconComponent,
    TopNavbarComponent,
    OpengraphTemplateSelectorComponent,
    OpengraphTemplatePropertiesComponent,
    OpengraphTemplateBuilderComponent,
    SelectButtonComponent,
    FormsModule,
    FooterComponent,
    TranslatePipe,
  ],
  templateUrl: './opengraph-generator.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './opengraph-generator.component.scss',
})
export class OpengraphGeneratorComponent {
  private readonly metadataService = inject(MetadataService);
  private readonly i18n = inject(I18nService);
  readonly templateSelected = model<TemplateType>('image-right');
  readonly data = signal<Partial<OpenGraphData>>({});
  readonly outputSvgUrl = signal<string | undefined>(undefined);

  readonly platforms = computed<Array<{ label: string; value: Platform }>>(
    () => [
      {
        label: this.i18n.t('opengraph-generator.platforms.openGraph'),
        value: 'opengraph',
      },
      {
        label: this.i18n.t('opengraph-generator.platforms.twitter'),
        value: 'twitter',
      },
    ],
  );

  readonly dimensionsByPlatform: Record<
    Platform,
    { width: number; height: number }
  > = {
    opengraph: { width: 1200, height: 630 },
    twitter: { width: 1500, height: 500 },
  };

  readonly dimensions = linkedSignal(
    () => this.dimensionsByPlatform[this.selectedPlatform()],
  );

  readonly dimensionsLabel = computed(() => {
    const { width, height } =
      this.dimensionsByPlatform[this.selectedPlatform()];
    return {
      width: this.i18n.formatNumber(width),
      height: this.i18n.formatNumber(height),
    };
  });

  readonly selectedPlatform = model<Platform>('opengraph');

  constructor() {
    this.updateMetadata();
    effect(() => {
      this.i18n.language();
      this.updateMetadata();
    });

    toObservable(this.selectedPlatform).subscribe((platform) => {
      this.data.set({
        ...this.data(),
        dimensions: this.dimensionsByPlatform[platform],
      });
    });
  }

  onPropertiesUpdated(data: OpenGraphData) {
    this.data.set(data);
  }

  onPreviewUpdated(blobSvgUrl: string) {
    this.outputSvgUrl.set(blobSvgUrl);
  }

  async downloadImage() {
    // Create a canvas element
    const canvas = document.createElement('canvas');

    canvas.width = this.dimensionsByPlatform[this.selectedPlatform()].width;
    canvas.height = this.dimensionsByPlatform[this.selectedPlatform()].height;

    // Set canvas context
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const fileName = `${this.i18n.t('opengraph-generator.download.fileName')}.png`;
    img.onload = function () {
      // Draw image to canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert canvas to JPG data URL
      const quality = 0.9;
      canvas.toBlob((blob) => {
        const blobUrl = URL.createObjectURL(blob!);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(blobUrl);
      }, 'image/png');
    };

    img.src = this.outputSvgUrl()!;
  }

  private updateMetadata(): void {
    this.metadataService.updateMetadata({
      title: this.i18n.t('opengraph-generator.seo.title'),
      description: this.i18n.t('opengraph-generator.seo.description'),
      keywords: this.i18n.t('opengraph-generator.seo.keywords'),
    });
  }
}
