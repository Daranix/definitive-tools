import { OpenGraphTemplateLogos } from '@/app/pages/opengraph-generator/types';
import { Component, output } from '@angular/core';

@Component({
  selector: 'app-opengraph-template-form-logos',
  imports: [],
  templateUrl: './opengraph-template-form-logos.component.html',
  styleUrl: './opengraph-template-form-logos.component.scss'
})
export class OpengraphTemplateFormLogosComponent {

    readonly onFormUpdated = output<OpenGraphTemplateLogos>();


}
