import { NgClass, NgStyle } from '@angular/common';
import { Component, effect, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontTypesDefinition, OpenGraphFontWeight, OpenGraphTemplateFormInputFontOptions } from '../../types';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, distinctUntilChanged, filter, map, merge, Observable } from 'rxjs';

export const DEFAULT_VALUES: OpenGraphTemplateFormInputFontOptions = {
  fontFamily: {
    key: 'inter',
    label: 'Inter',
    lang: 'latin'
  },
  fontWeight: 400,
  fontSize: 20,
  fontColor: '#030712'
}

export const FONT_TYPES = [
  { key: 'inter', label: 'Inter' },
  { key: 'open-sans', label: 'Open Sans' },
  { key: 'noto-sans', label: 'Noto Sans' },
  { key: 'noto-sans-jp', label: 'Noto Sans (Japanese)', lang: 'japanese' },
  { key: 'noto-sans-tc', label: 'Noto Sans (Traditional Chinese)', lang: 'chinese-traditional' },
  { key: 'noto-sans-sc', label: 'Noto Sans (Simplified Chinese)', lang: 'chinese-simplified' },
  { key: 'roboto', label: 'Roboto' },
  { key: 'poppins', label: 'Poppins' },
  { key: 'montserrat', label: 'Montserrat' },
  { key: 'lato', label: 'Lato' },
  { key: 'manrope', label: 'Manrope' },
  { key: 'ubuntu', label: 'Ubuntu' },
  { key: 'figtree', label: 'Figtree' },
  { key: 'fira-sans', label: 'Fira Sans' },
  { key: 'fira-code', label: 'Fira Code' },
  { key: 'fira-mono', label: 'Fira Mono' },
  { key: 'source-code-pro', label: 'Source Code Pro' },
  { key: 'ibm-plex-mono', label: 'IBM Plex Mono' },
  { key: 'jetbrains-mono', label: 'JetBrains Mono' }
] as const satisfies FontTypesDefinition[];

export type FontType = typeof FONT_TYPES[number]['key'];

const FONT_WEIGHTS = [
  { key: '100', label: 'Thin' },
  { key: '200', label: 'Extra Light' },
  { key: '300', label: 'Light' },
  { key: '400', label: 'Regular' },
  { key: '500', label: 'Medium' },
  { key: '600', label: 'Semi Bold' },
  { key: '700', label: 'Bold' },
  { key: '800', label: 'Extra Bold' },
  { key: '900', label: 'Black' }
] as const;

export type FontWeight = typeof FONT_WEIGHTS[number]['key'];

export const FONT_COLORS = [
  "#030712",
  "#1f2937",
  "#374151",
  "#4b5563",
  "#9ca3af",
  "#d1d5db",
  "#f3f4f6",
  "#f9fafb"
];

@Component({
  selector: 'app-opengraph-font-options',
  imports: [FormsModule, NgStyle, NgClass],
  templateUrl: './opengraph-font-options.component.html',
  styleUrl: './opengraph-font-options.component.scss'
})
export class OpengraphFontOptionsComponent {

  readonly FONT_COLORS = FONT_COLORS;
  readonly FONT_WEIGHT = FONT_WEIGHTS;
  readonly FONT_TYPES = FONT_TYPES;

  // readonly defaultFontOptions = input.required<OpenGraphTemplateFormInputFontOptions>();
  readonly onFontOptionsUpdated = output<OpenGraphTemplateFormInputFontOptions>();
  
  readonly fontWeight = model<OpenGraphFontWeight>();
  readonly fontSize = model<number>();
  readonly fontColor = model<string>();
  readonly fontFamily = model<FontTypesDefinition>();

  readonly fontOptions = model<OpenGraphTemplateFormInputFontOptions>(DEFAULT_VALUES);

  private readonly updateFontOptions$: Observable<OpenGraphTemplateFormInputFontOptions> = combineLatest([
    toObservable(this.fontFamily),
    toObservable(this.fontWeight),
    toObservable(this.fontSize),
    toObservable(this.fontColor)
  ]).pipe(
    filter((v) => !(v.some((v) => v === undefined))),
    map(([fontFamily, fontWeight, fontSize, fontColor]) => ({ 
      fontFamily: fontFamily!,
      fontWeight: fontWeight!,
      fontSize: fontSize!,
      fontColor: fontColor!
    })),
    distinctUntilChanged((prev, curr) => 
      JSON.stringify(prev) === JSON.stringify(curr)
    )
  );

  constructor() {

    this.updateFontOptions$.subscribe((value) => {
      this.fontOptions.set(value);
    });

    toObservable(this.fontOptions).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged((prev, curr) => 
        JSON.stringify(prev) === JSON.stringify(curr)
      )
    ).subscribe((value) => {
      this.fontFamily.set(value.fontFamily);
      this.fontWeight.set(value.fontWeight);
      this.fontSize.set(value.fontSize);
      this.fontColor.set(value.fontColor);
    });

  }

}

