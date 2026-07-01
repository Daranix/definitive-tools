import {
  AfterViewInit,
  Component,
  computed,
  inject,
  Injector,
  input,
  output,
  PLATFORM_ID,
  runInInjectionContext,
  signal,
  ViewEncapsulation,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FontData, OpenGraphData, SatoriFontOptions } from '../../types';
import { TemplateType } from '../../constants';
import { environment } from '@/environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  BasicRenderFn,
  HeroRenderFn,
  ImageRightRenderFn,
  LogosRenderFn,
  NoticeRenderFn,
  RenderFunction,
} from './templates';
@Component({
  selector: 'app-opengraph-template-builder',
  imports: [],
  templateUrl: './opengraph-template-builder.component.html',
  styleUrl: './opengraph-template-builder.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  encapsulation: ViewEncapsulation.None,
})
export class OpengraphTemplateBuilderComponent implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly cachedFonts = new Map<string, SatoriFontOptions>();

  readonly previewUpdated = output<string>();
  readonly data = input.required<Partial<OpenGraphData>>();

  readonly templateSelected = computed(
    () => this.data().templateProperties?.type,
  );

  readonly outputSvgUrl = signal<string | undefined>(undefined);

  readonly RENDER_FUNCTIONS = {
    'image-right': ImageRightRenderFn,
    hero: HeroRenderFn,
    logos: LogosRenderFn,
    basic: BasicRenderFn,
    notice: NoticeRenderFn,
  } as const satisfies Record<TemplateType, RenderFunction>;

  ngAfterViewInit(): void {
    runInInjectionContext(this.injector, () => {
      if (isPlatformBrowser(this.platformId)) {
        toObservable(this.data)
          .pipe(
            debounceTime(100),
            distinctUntilChanged(
              (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
            ),
            takeUntilDestroyed(),
          )
          .subscribe(async (data) => {
            const svgStr = await this.generateSvgStringFromHtml(data);
            const blob = new Blob([svgStr], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            this.outputSvgUrl.set(url);
            this.previewUpdated.emit(url);
          });
      }
    });
  }

  private async generateSvgStringFromHtml(data: Partial<OpenGraphData>) {
    const { vdom, fontsData } = this.renderVDom(data);
    const fonts = await this.fontLoader(fontsData);
    (window as any).process = {
      env: { DEBUG: undefined },
    };
    const { default: satori } = await import('satori');
    const svg = await satori(vdom, {
      width: data.dimensions?.width || 1200,
      height: data.dimensions?.height || 630,
      fonts,
    });
    return svg;
  }

  private renderVDom(data: Partial<OpenGraphData>) {
    const renderFn = this.RENDER_FUNCTIONS[this.templateSelected()!];
    const renderData = renderFn(data);
    return renderData;
  }

  private async fontLoader(fontData: FontData[]): Promise<SatoriFontOptions[]> {
    // Avoid duplicate requests and preload fonts
    // FIXME: Save the map of cachedFonts outside of the component
    const fontMap = new Map<string, FontData>();
    const preloadedFonts = new Map<string, SatoriFontOptions>();
    for (const font of fontData) {
      const key = `${font.fontFamily.key}-${font.fontWeight}`;
      if (!this.cachedFonts.has(key)) {
        fontMap.set(key, font);
      } else {
        preloadedFonts.set(key, this.cachedFonts.get(key)!);
      }
    }
    const fontsToLoad = Array.from(fontMap.entries());
    // ---

    const result = fontsToLoad.map(async ([key, font]) => {
      const response = await fetch(
        `https://cdn.jsdelivr.net/fontsource/fonts/${font.fontFamily.key}@latest/${font.fontFamily.lang ?? 'latin'}-${font.fontWeight}-normal.woff`,
      );
      const buffer = await response.arrayBuffer();
      const fontData = {
        data: buffer,
        name: font.fontFamily.label,
        weight: font.fontWeight,
      } satisfies SatoriFontOptions;
      this.cachedFonts.set(key, fontData);
      return fontData;
    });

    const externalFonts = await Promise.all(result);
    return [...preloadedFonts.values(), ...externalFonts];
  }
}
