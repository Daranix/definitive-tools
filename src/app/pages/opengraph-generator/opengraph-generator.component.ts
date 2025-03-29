import { AfterViewInit, Component, inject, model, PLATFORM_ID, signal } from '@angular/core';

import satori from 'satori';
import { html } from './html-parser';
import { isPlatformBrowser } from '@angular/common';
import { SafeHtmlPipe } from '@/app/pipes/safe-html.pipe';
import { LucideAngularModule } from 'lucide-angular';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { OpengraphTemplateSelectorComponent } from './components/opengraph-template-selector/opengraph-template-selector.component';
import { OpengraphTemplatePropertiesComponent } from './components/opengraph-template-properties/opengraph-template-properties.component';
import { TemplateType } from './constants';

@Component({
  selector: 'app-opengraph-generator',
  imports: [
    SafeHtmlPipe,
    LucideAngularModule,
    TopNavbarComponent,
    OpengraphTemplateSelectorComponent,
    OpengraphTemplatePropertiesComponent
  ],
  templateUrl: './opengraph-generator.component.html',
  styleUrl: './opengraph-generator.component.scss'
})
export class OpengraphGeneratorComponent implements AfterViewInit {

  private readonly platformId = inject(PLATFORM_ID);

  readonly templateSelected = model<TemplateType>('image-right');

  content = signal<string>('');

  ngAfterViewInit(): void {
    if(isPlatformBrowser(this.platformId)) {
      this.generateExample();
    }
  }

  async generateExample() {

    const response = await fetch('/fonts/OpenSans-Regular.ttf');
    const fontData = await response.arrayBuffer();

    const content = html`<div class="w-full rounded-lg flex items-center justify-center mb-6" style="background: linear-gradient(to right, rgb(255, 77, 77), rgb(255, 213, 128));"><h2 class="text-3xl font-bold text-white">Loading...</h2></div>`;
    const svg = await satori(content as any, { 
      width: 1200,
      height: 600, 
      fonts: [
        {
          name: 'Open Sans',
          data: fontData,
          weight: 400,
          style: 'normal',
        },
      ]
    });
    this.content.set(svg);
  }



}
