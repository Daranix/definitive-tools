import { OpenGraphData, OpenGraphTemplateFormInputFontOptions, OpenGraphTemplateImageRight } from '@/app/pages/opengraph-generator/types';
import { NgStyle } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { getStylesFromFontOptions } from '../v2';

@Component({
  selector: 'app-opengraph-template-image-right',
  imports: [NgStyle],
  templateUrl: './opengraph-template-image-right.component.html',
  styleUrl: './opengraph-template-image-right.component.scss'
})
export class OpengraphTemplateImageRightComponent {
  readonly data = input.required<Partial<OpenGraphData>>();

  readonly templateProperties = computed(() => this.data().templateProperties as OpenGraphTemplateImageRight);

  getFontStyles(fontOptions: OpenGraphTemplateFormInputFontOptions) {
    return getStylesFromFontOptions(fontOptions);
  }

}
