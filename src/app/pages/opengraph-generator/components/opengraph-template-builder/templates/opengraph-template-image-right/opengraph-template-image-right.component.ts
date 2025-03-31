import { OpenGraphData } from '@/app/pages/opengraph-generator/types';
import { Component, input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-opengraph-template-image-right',
  imports: [],
  templateUrl: './opengraph-template-image-right.component.html',
  styleUrl: './opengraph-template-image-right.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class OpengraphTemplateImageRightComponent {
  readonly data = input.required<Partial<OpenGraphData>>();

}
