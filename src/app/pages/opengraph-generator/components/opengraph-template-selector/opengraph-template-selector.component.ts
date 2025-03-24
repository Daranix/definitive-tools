import { NgClass } from '@angular/common';
import { Component, signal } from '@angular/core';
import { TEMPLATES_TYPES } from '../../constants';

@Component({
  selector: 'app-opengraph-template-selector',
  imports: [NgClass],
  templateUrl: './opengraph-template-selector.component.html',
  styleUrl: './opengraph-template-selector.component.scss'
})
export class OpengraphTemplateSelectorComponent {

  readonly selectedTemplate = signal<string>('image-right');
  readonly TEMPLATES = TEMPLATES_TYPES;

}
