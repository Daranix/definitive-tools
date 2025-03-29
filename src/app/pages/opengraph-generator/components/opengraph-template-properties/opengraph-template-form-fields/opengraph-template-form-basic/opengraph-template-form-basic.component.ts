import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { OpengraphFontOptionsComponent } from '../../../opengraph-font-options/opengraph-font-options.component';

@Component({
  selector: 'app-opengraph-template-form-basic',
  imports: [LucideAngularModule, OpengraphFontOptionsComponent],
  templateUrl: './opengraph-template-form-basic.component.html',
  styleUrl: './opengraph-template-form-basic.component.scss'
})
export class OpengraphTemplateFormBasicComponent {

}
