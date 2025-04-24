import { AfterViewInit, Component, computed, inject, Injector, input, PLATFORM_ID, runInInjectionContext, signal, ViewEncapsulation } from '@angular/core';
import { FontData, OpenGraphData, SatoriFontOptions } from '../../types';
import { TemplateType } from '../../constants';
import { environment } from '@/environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import satori from 'satori';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { BasicRenderFn, HeroRenderFn, ImageRightRenderFn, LogosRenderFn, NoticeRenderFn, RenderFunction } from './templates';
@Component({
  selector: 'app-opengraph-template-builder',
  imports: [],
  templateUrl: './opengraph-template-builder.component.html',
  styleUrl: './opengraph-template-builder.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class OpengraphTemplateBuilderComponent implements AfterViewInit {

  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);

  readonly data = input.required<Partial<OpenGraphData>>();

  readonly templateSelected = computed(() => this.data().templateProperties?.type);

  readonly outputSvgUrl = signal<string | undefined>(undefined);

  readonly RENDER_FUNCTIONS = {
    'image-right': ImageRightRenderFn,
    'hero': HeroRenderFn,
    'logos': LogosRenderFn,
    'basic': BasicRenderFn,
    'notice': NoticeRenderFn
  } as const satisfies Record<TemplateType, RenderFunction>;

  ngAfterViewInit(): void {
    runInInjectionContext(this.injector, () => {
      if (isPlatformBrowser(this.platformId)) {
        toObservable(this.data).pipe(
          debounceTime(100),
          distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
          takeUntilDestroyed()
        ).subscribe(async (data) => {
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
    console.log(vdom);
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
    const renderData = renderFn(data);
    return renderData;
  }

  private async fontLoader(fontData: FontData[]): Promise<SatoriFontOptions[]> {

    // Avoid duplicate requests

    const fontMap = new Map<string, FontData>();
    for (const font of fontData) {
      fontMap.set(`${font.fontFamily.key}-${font.fontWeight}`, font);
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
