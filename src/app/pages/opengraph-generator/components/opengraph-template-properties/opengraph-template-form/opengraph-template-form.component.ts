import { Component, input, output } from '@angular/core';
import { OpengraphTemplateFormBasicComponent } from '../opengraph-template-form-fields/opengraph-template-form-basic/opengraph-template-form-basic.component';
import { OpengraphTemplateFormNoticeComponent } from '../opengraph-template-form-fields/opengraph-template-form-notice/opengraph-template-form-notice.component';
import { OpengraphTemplateFormImageRightComponent } from '../opengraph-template-form-fields/opengraph-template-form-image-right/opengraph-template-form-image-right.component';
import { OpengraphTemplateFormLogosComponent } from '../opengraph-template-form-fields/opengraph-template-form-logos/opengraph-template-form-logos.component';
import { OpengraphTemplateFormHeroComponent } from '../opengraph-template-form-fields/opengraph-template-form-hero/opengraph-template-form-hero.component';
import { TemplateType } from '../../../constants';
import { OpenGraphTemplate } from '../../../types';

@Component({
  selector: 'app-opengraph-template-form',
  imports: [
    OpengraphTemplateFormBasicComponent,
    OpengraphTemplateFormHeroComponent,
    OpengraphTemplateFormLogosComponent,
    OpengraphTemplateFormImageRightComponent,
    OpengraphTemplateFormNoticeComponent
  ],
  templateUrl: './opengraph-template-form.component.html',
  styleUrl: './opengraph-template-form.component.scss'
})
export class OpengraphTemplateFormComponent {

  readonly templateSelected = input.required<TemplateType>();
  readonly templatePropertiesChanged = output<OpenGraphTemplate>();

}
