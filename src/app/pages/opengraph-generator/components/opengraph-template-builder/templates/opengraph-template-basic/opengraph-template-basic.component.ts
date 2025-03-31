import { OpenGraphData } from '@/app/pages/opengraph-generator/types';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-opengraph-template-basic',
  imports: [],
  templateUrl: './opengraph-template-basic.component.html',
  styleUrl: './opengraph-template-basic.component.scss'
})
export class OpengraphTemplateBasicComponent {
  readonly data = input.required<Partial<OpenGraphData>>();
}
