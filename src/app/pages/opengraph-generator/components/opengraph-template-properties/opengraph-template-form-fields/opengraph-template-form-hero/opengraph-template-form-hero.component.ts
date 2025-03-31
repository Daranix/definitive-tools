import { OpenGraphTemplateHero } from '@/app/pages/opengraph-generator/types';
import { Component, output } from '@angular/core';

@Component({
  selector: 'app-opengraph-template-form-hero',
  imports: [],
  templateUrl: './opengraph-template-form-hero.component.html',
  styleUrl: './opengraph-template-form-hero.component.scss'
})
export class OpengraphTemplateFormHeroComponent {

    readonly onFormUpdated = output<OpenGraphTemplateHero>();


}
