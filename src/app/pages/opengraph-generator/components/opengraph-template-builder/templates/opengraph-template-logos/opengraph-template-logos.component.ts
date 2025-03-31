import { OpenGraphData } from '@/app/pages/opengraph-generator/types';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-opengraph-template-logos',
  imports: [],
  templateUrl: './opengraph-template-logos.component.html',
  styleUrl: './opengraph-template-logos.component.scss'
})
export class OpengraphTemplateLogosComponent {

  readonly data = input.required<Partial<OpenGraphData>>();

}
