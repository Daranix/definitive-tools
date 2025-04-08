import { NgClass } from '@angular/common';
import { Component, model, signal } from '@angular/core';
import { TEMPLATES_TYPES, TemplateType } from '../../constants';

@Component({
  selector: 'app-opengraph-template-selector',
  imports: [NgClass],
  templateUrl: './opengraph-template-selector.component.html',
  styleUrl: './opengraph-template-selector.component.scss'
})
export class OpengraphTemplateSelectorComponent {

  readonly selectedTemplate = model<TemplateType>();
  readonly TEMPLATES = TEMPLATES_TYPES;

}
