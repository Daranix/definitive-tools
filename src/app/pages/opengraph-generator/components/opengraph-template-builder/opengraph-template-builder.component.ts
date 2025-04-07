import { afterNextRender, AfterViewInit, Component, computed, ElementRef, inject, Injector, input, output, PLATFORM_ID, runInInjectionContext, signal, viewChild, ViewEncapsulation } from '@angular/core';
import { FontData, FontTypesDefinition, OpenGraphData, SatoriFontOptions } from '../../types';
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
import { debounce, debounceTime, delay, Subject } from 'rxjs';
import { RenderFunction } from './templates/v2';
import ImageRightRenderFn from './templates/v2/image-right';

@Component({
  selector: 'app-opengraph-template-builder',
  imports: [],
  templateUrl: './opengraph-template-builder.component.html',
  styleUrl: './opengraph-template-builder.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class OpengraphTemplateBuilderComponent implements AfterViewInit {

  readonly DEBUG = environment.production;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);

  readonly data = input.required<Partial<OpenGraphData>>();

  readonly templateSelected = computed(() => this.data().templateProperties?.type);

  readonly outputSvgUrl = signal<string | undefined>(undefined);

  readonly RENDER_FUNCTIONS = {
    'image-right': ImageRightRenderFn,
    'hero': ImageRightRenderFn,
    'logos': ImageRightRenderFn,
    'basic': ImageRightRenderFn,
    'notice': ImageRightRenderFn
  } as const satisfies Record<TemplateType, RenderFunction>;

  constructor() {

  }

  ngAfterViewInit(): void {
    runInInjectionContext(this.injector, () => {
      if (isPlatformBrowser(this.platformId)) {
        toObservable(this.data).pipe(debounceTime(100), takeUntilDestroyed()).subscribe(async (data) => {
          const svgStr = await this.generateSvgStringFromHtml(data);
          const blob = new Blob([svgStr], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          this.outputSvgUrl.set(url);
        });
      }
    });
  }




  private async generateSvgStringFromHtml(data: Partial<OpenGraphData>) {
    const { vdom, fontsData } = this.renderVDom(data);
    const fonts = await this.fontLoader(fontsData);
    const svg = await satori(vdom, {
      width: 1200,
      height: 600,
      fonts
    });
    return svg;
  }

  private renderVDom(data: Partial<OpenGraphData>) {
    const renderFn = this.RENDER_FUNCTIONS[this.templateSelected()!];
    const vdom = renderFn(data);
    return vdom;
  }

  private async fontLoader(fontData: FontData[]): Promise<SatoriFontOptions[]> {

    // Avoid duplicate requests

    const fontMap = new Map<string, FontData>();
    for (const font of fontData) {
      fontMap.set(font.fontFamily.key, font);
    }
    const fontsToLoad = Array.from(fontMap.values());
    // ---

    const result = fontsToLoad.map(async (font) => {
      const response = await fetch(`https://cdn.jsdelivr.net/fontsource/fonts/${font.fontFamily.key}@latest/${font.fontFamily.lang ?? 'latin'}-${font.fontWeight}-normal.woff`);
      const buffer = await response.arrayBuffer();
      return { data: buffer, name: font.fontFamily.label, weight: font.fontWeight } satisfies SatoriFontOptions;
    });

    return await Promise.all(result);
  }
}
