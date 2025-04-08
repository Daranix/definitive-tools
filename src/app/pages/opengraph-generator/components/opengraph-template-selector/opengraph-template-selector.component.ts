import { NgClass } from '@angular/common';
import { Component, model, signal } from '@angular/core';
import { TEMPLATES_TYPES, TemplateType } from '../../constants';
import { SwiperCarrouselComponent } from '@/app/components/swiper/swiper-carrousel/swiper-carrousel.component';
import { SwiperCarrouselItemComponent } from '@/app/components/swiper/swiper-carrousel-item/swiper-carrousel-item.component';

@Component({
  selector: 'app-opengraph-template-selector',
  imports: [NgClass, SwiperCarrouselComponent, SwiperCarrouselItemComponent],
  templateUrl: './opengraph-template-selector.component.html',
  styleUrl: './opengraph-template-selector.component.scss'
})
export class OpengraphTemplateSelectorComponent {

  readonly selectedTemplate = model<TemplateType>();
  readonly TEMPLATES = TEMPLATES_TYPES;

}
