import {
  Component,
  computed,
  inject,
  model,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  BACKGROUND_OVERLAY_COLORS,
  BACKGROUND_OVERLAY_PATTERNS,
  BACKGROUND_OVERLAY_PATTERNS_VIEW,
  BackgroundOverlayPattern,
} from '../../constants';
import { OpenGraphBackgroundOverlay } from '../../types';
import { NgClass, NgStyle } from '@angular/common';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  Observable,
} from 'rxjs';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@/app/i18n/i18n.service';

@Component({
  selector: 'app-opengraph-background-overlay-options',
  imports: [NgStyle, NgClass, LucideIconComponent, FormsModule, TranslatePipe],
  templateUrl: './opengraph-background-overlay-options.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './opengraph-background-overlay-options.component.scss',
})
export class OpengraphBackgroundOverlayOptionsComponent {
  private readonly i18n = inject(I18nService);

  readonly BACKGROUND_OVERLAY_PATTERNS = BACKGROUND_OVERLAY_PATTERNS;
  readonly BACKGROUND_OVERLAY_COLORS = BACKGROUND_OVERLAY_COLORS;
  readonly BACKGROUND_OVERLAY_PATTERNS_VIEW = BACKGROUND_OVERLAY_PATTERNS_VIEW;

  readonly BACKGROUND_OVERLAY_PATTERN_LABELS = computed<
    Record<BackgroundOverlayPattern, string>
  >(() => ({
    none: this.i18n.t('opengraph-generator.background.overlay.patterns.none'),
    grid: this.i18n.t('opengraph-generator.background.overlay.patterns.grid'),
    graph: this.i18n.t('opengraph-generator.background.overlay.patterns.graph'),
    dots: this.i18n.t('opengraph-generator.background.overlay.patterns.dots'),
  }));

  readonly overlayPattern = model<BackgroundOverlayPattern>();
  readonly overlayColor = model<string>();
  readonly overlayOpacity = model<number>();
  readonly overlayBlurRadius = model<number>();
  readonly overlayOptions = model<OpenGraphBackgroundOverlay>();

  private readonly updateBackgroundOverlayOptions$: Observable<OpenGraphBackgroundOverlay> =
    combineLatest([
      toObservable(this.overlayPattern),
      toObservable(this.overlayColor),
      toObservable(this.overlayOpacity),
      toObservable(this.overlayBlurRadius),
    ]).pipe(
      filter((v) => !v.some((v) => v === undefined)),
      map(
        ([overlayPattern, overlayColor, overlayOpacity, overlayBlurRadius]) =>
          ({
            pattern: overlayPattern!,
            color: overlayColor!,
            opacity: overlayOpacity!,
            blurRadius: overlayBlurRadius!,
          }) satisfies OpenGraphBackgroundOverlay,
      ),
      distinctUntilChanged(
        (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
      ),
    );

  constructor() {
    this.updateBackgroundOverlayOptions$.subscribe((value) => {
      this.overlayOptions.set(value);
    });

    toObservable(this.overlayOptions)
      .pipe(
        takeUntilDestroyed(),
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
        ),
      )
      .subscribe((value) => {
        this.overlayColor.set(value!.color);
        this.overlayPattern.set(value!.pattern);
        this.overlayOpacity.set(value!.opacity);
        this.overlayBlurRadius.set(value!.blurRadius);
      });
  }
}
