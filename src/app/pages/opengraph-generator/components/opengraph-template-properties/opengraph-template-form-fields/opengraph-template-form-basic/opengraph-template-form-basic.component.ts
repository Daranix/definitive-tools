import { Component, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { OpengraphFontOptionsComponent } from '../../../opengraph-font-options/opengraph-font-options.component';
import { FormGroup } from '@angular/forms';
import { OpenGraphTemplateBasic } from '@/app/pages/opengraph-generator/types';

@Component({
  selector: 'app-opengraph-template-form-basic',
  imports: [LucideAngularModule],
  templateUrl: './opengraph-template-form-basic.component.html',
  styleUrl: './opengraph-template-form-basic.component.scss'
})
export class OpengraphTemplateFormBasicComponent {

  readonly onFormUpdated = output<OpenGraphTemplateBasic>();
  
  readonly form = input<FormGroup>();

}
