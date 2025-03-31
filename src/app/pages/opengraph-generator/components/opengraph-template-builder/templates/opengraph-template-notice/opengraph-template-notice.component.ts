import { OpenGraphData } from '@/app/pages/opengraph-generator/types';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-opengraph-template-notice',
  imports: [],
  templateUrl: './opengraph-template-notice.component.html',
  styleUrl: './opengraph-template-notice.component.scss'
})
export class OpengraphTemplateNoticeComponent {

  readonly data = input.required<Partial<OpenGraphData>>();

}
