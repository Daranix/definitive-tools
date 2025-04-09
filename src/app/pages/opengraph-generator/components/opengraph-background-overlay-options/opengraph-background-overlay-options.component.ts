import { Component, model } from '@angular/core';
import { BACKGROUND_OVERLAY_COLORS, BACKGROUND_OVERLAY_PATTERNS, BACKGROUND_OVERLAY_PATTERNS_VIEW, BackgroundOverlayPattern } from '../../constants';
import { OpenGraphBackgroundOverlay } from '../../types';
import { NgClass, NgStyle } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, distinctUntilChanged, filter, map, Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-opengraph-background-overlay-options',
  imports: [NgStyle, NgClass, LucideAngularModule, FormsModule],
  templateUrl: './opengraph-background-overlay-options.component.html',
  styleUrl: './opengraph-background-overlay-options.component.scss'
})
export class OpengraphBackgroundOverlayOptionsComponent {

  readonly BACKGROUND_OVERLAY_PATTERNS = BACKGROUND_OVERLAY_PATTERNS;
  readonly BACKGROUND_OVERLAY_COLORS = BACKGROUND_OVERLAY_COLORS;
  readonly BACKGROUND_OVERLAY_PATTERNS_VIEW = BACKGROUND_OVERLAY_PATTERNS_VIEW;

  readonly overlayPattern = model<BackgroundOverlayPattern>();
  readonly overlayColor = model<string>();
  readonly overlayOpacity = model<number>();
  readonly overlayBlurRadius = model<number>();
  readonly overlayOptions = model<OpenGraphBackgroundOverlay>();



  private readonly updateBackgroundOverlayOptions$: Observable<OpenGraphBackgroundOverlay> = combineLatest([
    toObservable(this.overlayPattern),
    toObservable(this.overlayColor),
    toObservable(this.overlayOpacity),
    toObservable(this.overlayBlurRadius)
  ]).pipe(
    filter((v) => !(v.some((v) => v === undefined))),
    map(([overlayPattern, overlayColor, overlayOpacity, overlayBlurRadius]) => ({ 
      pattern: overlayPattern!,
      color: overlayColor!,
      opacity: overlayOpacity!,
      blurRadius: overlayBlurRadius!
    }) satisfies OpenGraphBackgroundOverlay),
    distinctUntilChanged((prev, curr) => 
      JSON.stringify(prev) === JSON.stringify(curr)
    )
  );

  constructor() {

    this.updateBackgroundOverlayOptions$.subscribe((value) => {
      this.overlayOptions.set(value);
    });

    toObservable(this.overlayOptions).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged((prev, curr) => 
        JSON.stringify(prev) === JSON.stringify(curr)
      )
    ).subscribe((value) => {
      this.overlayColor.set(value!.color);
      this.overlayPattern.set(value!.pattern);
      this.overlayOpacity.set(value!.opacity);
      this.overlayBlurRadius.set(value!.blurRadius);
    });
  }

}
