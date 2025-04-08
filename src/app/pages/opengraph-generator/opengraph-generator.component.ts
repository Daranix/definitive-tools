import { Component, inject, model, signal } from '@angular/core';

import { LucideAngularModule } from 'lucide-angular';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { OpengraphTemplateSelectorComponent } from './components/opengraph-template-selector/opengraph-template-selector.component';
import { OpengraphTemplatePropertiesComponent } from './components/opengraph-template-properties/opengraph-template-properties.component';
import { TemplateType } from './constants';
import { OpenGraphData } from './types';
import { OpengraphTemplateBuilderComponent } from './components/opengraph-template-builder/opengraph-template-builder.component';
import { MetadataService } from '@/app/services/metadata.service';

@Component({
  selector: 'app-opengraph-generator',
  imports: [
    LucideAngularModule,
    TopNavbarComponent,
    OpengraphTemplateSelectorComponent,
    OpengraphTemplatePropertiesComponent,
    OpengraphTemplateBuilderComponent
],
  templateUrl: './opengraph-generator.component.html',
  styleUrl: './opengraph-generator.component.scss'
})
export class OpengraphGeneratorComponent {



  private readonly metadataService = inject(MetadataService);
  readonly templateSelected = model<TemplateType>('image-right');
  readonly data = signal<Partial<OpenGraphData>>({});
  readonly outputSvgUrl = signal<string | undefined>(undefined);

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Opengraph Generator',
      description: `Create professional Opengraph images and Twitter Cards that boost your website's visibility on social media platforms. Easy-to-use tool for generating custom social previews.`, 
      keywords: 'opengraph generator, twitter cards, social media preview, meta tags, social share images, open graph protocol, social media optimization, website metadata, custom social images'
    })
  }


  onPropertiesUpdated(data: OpenGraphData) {
    this.data.set(data);
  }

  onPreviewUpdated(svgStr: string) {
    
    if(this.outputSvgUrl()) {
      URL.revokeObjectURL(this.outputSvgUrl()!);
    }

    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    this.outputSvgUrl.set(url);
  }

}
