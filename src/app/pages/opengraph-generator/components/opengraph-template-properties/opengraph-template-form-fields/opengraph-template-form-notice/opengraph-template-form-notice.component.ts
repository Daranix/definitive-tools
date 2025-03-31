import { OpenGraphTemplateNotice } from '@/app/pages/opengraph-generator/types';
import { Component, output } from '@angular/core';

@Component({
  selector: 'app-opengraph-template-form-notice',
  imports: [],
  templateUrl: './opengraph-template-form-notice.component.html',
  styleUrl: './opengraph-template-form-notice.component.scss'
})
export class OpengraphTemplateFormNoticeComponent {

  readonly onFormUpdated = output<OpenGraphTemplateNotice>();

}
