import { NgClass } from '@angular/common';
import {
  Component,
  model,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TEMPLATES_TYPES, TemplateType } from '../../constants';

@Component({
  selector: 'app-opengraph-template-selector',
  imports: [NgClass],
  templateUrl: './opengraph-template-selector.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './opengraph-template-selector.component.scss',
})
export class OpengraphTemplateSelectorComponent {
  readonly selectedTemplate = model<TemplateType>();
  readonly TEMPLATES = TEMPLATES_TYPES;
}
