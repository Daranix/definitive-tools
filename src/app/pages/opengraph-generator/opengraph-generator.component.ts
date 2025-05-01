import { Component, inject, linkedSignal, model, signal } from '@angular/core';

import { LucideAngularModule } from 'lucide-angular';
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

type Platform = 'opengraph' | 'twitter';
@Component({
  selector: 'app-opengraph-generator',
  imports: [
    LucideAngularModule,
    TopNavbarComponent,
    OpengraphTemplateSelectorComponent,
    OpengraphTemplatePropertiesComponent,
    OpengraphTemplateBuilderComponent,
    SelectButtonComponent,
    FormsModule
  ],
  templateUrl: './opengraph-generator.component.html',
  styleUrl: './opengraph-generator.component.scss'
})
export class OpengraphGeneratorComponent {



  private readonly metadataService = inject(MetadataService);
  readonly templateSelected = model<TemplateType>('image-right');
  readonly data = signal<Partial<OpenGraphData>>({});
  readonly outputSvgUrl = signal<string | undefined>(undefined);

  readonly platforms: Array<{ label: string, value: Platform }> = [
    { label: 'Open Graph', value: 'opengraph' },
    { label: 'Twitter / X', value: 'twitter' }
  ];

  readonly dimensionsByPlatform: Record<Platform, { width: number, height: number }> = {
    'opengraph': { width: 1200, height: 630 },
    'twitter': { width: 1500, height: 500 }
  };

  readonly dimensions = linkedSignal(() => this.dimensionsByPlatform[this.selectedPlatform()]);

  readonly selectedPlatform = model<Platform>('opengraph');

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Opengraph Generator',
      description: `Create professional Opengraph images and Twitter Cards that boost your website's visibility on social media platforms. Easy-to-use tool for generating custom social previews.`,
      keywords: 'opengraph generator, twitter cards, social media preview, meta tags, social share images, open graph protocol, social media optimization, website metadata, custom social images'
    })

    toObservable(this.selectedPlatform).subscribe((platform) => {
      this.data.set({
        ...this.data(),
        dimensions: this.dimensionsByPlatform[platform]
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
    img.onload = function() {
      // Draw image to canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert canvas to JPG data URL
      const quality = 0.9;
      canvas.toBlob((blob) => {
        const blobUrl = URL.createObjectURL(blob!);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = 'opengraph-image.png';
        a.click();
        URL.revokeObjectURL(blobUrl)
      }, 'image/png');

    }

    img.src = this.outputSvgUrl()!;
  }
}
