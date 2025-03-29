import { NgStyle } from '@angular/common';
import { Component, input, model, OnInit, signal, Signal, WritableSignal } from '@angular/core';
import { ControlValueAccessor, FormControl, FormGroup, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators } from '@angular/forms';

export interface FontTypesDefinition {
  key: string;
  label: string;
  lang?: string;
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

export interface FontOptions {
  fontFamily: FontTypesDefinition;
  fontWeight: FontWeight;
  fontSize: number;
  fontColor: string;
}


@Component({
  selector: 'app-opengraph-font-options',
  imports: [ReactiveFormsModule, NgStyle],
  templateUrl: './opengraph-font-options.component.html',
  styleUrl: './opengraph-font-options.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: OpengraphFontOptionsComponent,
      multi: true
    }
  ]
})
export class OpengraphFontOptionsComponent implements OnInit, ControlValueAccessor {

  private onChanged: (value: FontOptions) => void = () => {};
  private onTouched: () => void = () => {};

  readonly FONT_COLORS = FONT_COLORS;
  readonly FONT_WEIGHT = FONT_WEIGHTS;
  readonly FONT_TYPES = FONT_TYPES;

  readonly fontFormOptions = new FormGroup({
    fontFamily: new FormControl(FONT_TYPES[0] as FontTypesDefinition),
    fontWeight: new FormControl(FONT_WEIGHTS[0].key as string),
    fontSize: new FormControl(20, [Validators.required, Validators.min(10), Validators.max(100)]),
    fontColor: new FormControl(FONT_COLORS[0])
  });

  ngOnInit() {
    this.fontFormOptions.valueChanges.subscribe((value) => {
      this.onChanged(value as any);
      this.onTouched();
    });
  }

  readonly disabled = signal(false);

  writeValue(obj: FontOptions): void {
   this.fontFormOptions.patchValue(obj);
  }

  registerOnChange(fn: any): void {
    this.onChanged = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

}

