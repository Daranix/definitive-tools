import { Component, model, signal } from '@angular/core';

import { LucideAngularModule } from 'lucide-angular';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { OpengraphTemplateSelectorComponent } from './components/opengraph-template-selector/opengraph-template-selector.component';
import { OpengraphTemplatePropertiesComponent } from './components/opengraph-template-properties/opengraph-template-properties.component';
import { TemplateType } from './constants';
import { OpenGraphData } from './types';
import { OpengraphTemplateBuilderComponent } from './components/opengraph-template-builder/opengraph-template-builder.component';

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



  readonly templateSelected = model<TemplateType>('image-right');
  readonly data = signal<Partial<OpenGraphData>>({});

  readonly outputSvgUrl = signal<string | undefined>(undefined);

  constructor() {
    /*if (isPlatformBrowser(this.platformId)) {
      toObservable(this.data).pipe(takeUntilDestroyed()).subscribe(async (data) => {
        afterNextRender(async () => {
          if(this.outputSvg()) {
            URL.revokeObjectURL(this.outputSvg()!);
          }
          const previewDrawer = this.previewDrawer()!.nativeElement;
          const htmlStr = previewDrawer.outerHTML;
          const svgStr = await this.generateSvgStringFromHtml(htmlStr);
          const blob = new Blob([svgStr], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          this.outputSvg.set(url);
        }, { injector: this.injector });
      });
    }*/

  }

  /*
  async generateExample() {
    const content = `<div class="w-full rounded-lg flex items-center justify-center mb-6" style="background: linear-gradient(to right, rgb(255, 77, 77), rgb(255, 213, 128));"><h2 class="text-3xl font-bold text-white">Loading...</h2></div>`;
    const svgStr = await this.generateSvgStringFromHtml(content);
    this.content.set(svgStr);
  }*/
  
  /*private async generatePreviewImage() {
    const previewDrawer = this.previewDrawer()!.nativeElement;
    const htmlStr = previewDrawer.outerHTML;
    const svgStr = await this.generateSvgStringFromHtml(htmlStr);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    this.outputSvg.set(url);
  }*/

  private svgStringToElement(svgString: string) {
    // Create a DOM parser
    const parser = new DOMParser();
    
    // Parse the SVG string to a document
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    
    // Get the SVG element from the document
    const svgElement = doc.documentElement;
    return svgElement;
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
