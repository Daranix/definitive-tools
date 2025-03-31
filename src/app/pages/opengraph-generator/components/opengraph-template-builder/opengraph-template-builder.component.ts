import { afterNextRender, Component, computed, ElementRef, inject, Injector, input, output, PLATFORM_ID, viewChild, ViewEncapsulation } from '@angular/core';
import { OpenGraphData } from '../../types';
import { OpengraphTemplateBasicComponent } from './templates/opengraph-template-basic/opengraph-template-basic.component';
import { OpengraphTemplateHeroComponent } from './templates/opengraph-template-hero/opengraph-template-hero.component';
import { OpengraphTemplateLogosComponent } from './templates/opengraph-template-logos/opengraph-template-logos.component';
import { OpengraphTemplateImageRightComponent } from './templates/opengraph-template-image-right/opengraph-template-image-right.component';
import { OpengraphTemplateNoticeComponent } from './templates/opengraph-template-notice/opengraph-template-notice.component';
import { ComponentPortal, ComponentType, PortalModule } from '@angular/cdk/portal';
import { TemplateType } from '../../constants';
import { environment } from '@/environments/environment';
import { isPlatformBrowser, NgClass, NgStyle } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { createTemplateStringsArray, html } from '../../html-parser';
import satori from 'satori';

@Component({
  selector: 'app-opengraph-template-builder',
  imports: [
    OpengraphTemplateBasicComponent,
    OpengraphTemplateHeroComponent,
    OpengraphTemplateLogosComponent,
    OpengraphTemplateImageRightComponent,
    OpengraphTemplateNoticeComponent,
    PortalModule,
    NgClass,
    NgStyle
  ],
  templateUrl: './opengraph-template-builder.component.html',
  styleUrl: './opengraph-template-builder.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class OpengraphTemplateBuilderComponent {

  readonly DEBUG = environment.production;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);

  private readonly previewDrawer = viewChild<ElementRef<HTMLDivElement>>('previewDrawer');
  
  readonly data = input.required<Partial<OpenGraphData>>();

  readonly previewUpdated = output<string>();

  readonly templateSelected = computed(() => this.data().templateProperties?.type);

  readonly background = computed(() => {
    return this.getBackground();
  });

  readonly TEMPLATE_COMPONENTS = {
    'image-right': new ComponentPortal(OpengraphTemplateImageRightComponent),
    'hero': new ComponentPortal(OpengraphTemplateHeroComponent),
    'logos': new ComponentPortal(OpengraphTemplateLogosComponent),
    'basic': new ComponentPortal(OpengraphTemplateBasicComponent),
    'notice': new ComponentPortal(OpengraphTemplateNoticeComponent)
  } as const satisfies Record<TemplateType, ComponentPortal<any>>;

  readonly selectedPortal = computed(() => this.TEMPLATE_COMPONENTS[this.templateSelected()!]);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      toObservable(this.data).pipe(takeUntilDestroyed()).subscribe(async (data) => {
        afterNextRender(async () => {
          const previewDrawer = this.previewDrawer()!.nativeElement;
          const htmlStr = previewDrawer.outerHTML;
          const svgStr = await this.generateSvgStringFromHtml(htmlStr);
          this.previewUpdated.emit(svgStr);
          // const blob = new Blob([svgStr], { type: 'image/svg+xml' });
          // const url = URL.createObjectURL(blob);
          //this.outputSvg.set(url);
        }, { injector: this.injector });
      });
    }
  }

  private async generateSvgStringFromHtml(htmlStr: string) {
    const content = html(createTemplateStringsArray(htmlStr));
    const response = await fetch('/fonts/OpenSans-Regular.ttf');
    const fontData = await response.arrayBuffer();
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
    return svg;
  }

  private getBackground(): string {
    const bg = this.data().background;
    switch (bg?.type) {
      case 'gradient':
        return `linear-gradient(to ${bg.direction}, ${bg.color})`;
      case 'solid':
        return bg.color;
      case 'image':
        // return `url(${this.data().background?.url})`;
        return ``;
      default:
        return '';
    }
  }


}
