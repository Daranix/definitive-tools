import { OpenGraphData } from '@/app/pages/opengraph-generator/types';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-opengraph-template-hero',
  imports: [],
  templateUrl: './opengraph-template-hero.component.html',
  styleUrl: './opengraph-template-hero.component.scss'
})
export class OpengraphTemplateHeroComponent {
  readonly data = input.required<Partial<OpenGraphData>>();

}
