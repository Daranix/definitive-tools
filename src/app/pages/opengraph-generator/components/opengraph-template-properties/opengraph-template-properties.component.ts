import { JsonPipe, NgClass, NgStyle } from '@angular/common';
import { Component, computed, model } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { BackgroundType, GRADIENT_DIRECTIONS, GRADIENT_COMBINATIONS, SOLID_COLORS, GradientDirection, TemplateType } from '../../constants';
import { ContextMenuDirective } from '@/app/directives/context-menu.directive';
import { FONT_TYPES, FontOptions, OpengraphFontOptionsComponent } from '../opengraph-font-options/opengraph-font-options.component';
import { FormsModule } from '@angular/forms';
import { ComponentPortal, ComponentType, PortalModule } from '@angular/cdk/portal';
import { OpengraphTemplateFormBasicComponent } from './opengraph-template-form-fields/opengraph-template-form-basic/opengraph-template-form-basic.component';
import { OpengraphTemplateFormHeroComponent } from './opengraph-template-form-fields/opengraph-template-form-hero/opengraph-template-form-hero.component';
import { OpengraphTemplateFormLogosComponent } from './opengraph-template-form-fields/opengraph-template-form-logos/opengraph-template-form-logos.component';
import { OpengraphTemplateFormImageRightComponent } from './opengraph-template-form-fields/opengraph-template-form-image-right/opengraph-template-form-image-right.component';
import { OpengraphTemplateFormNoticeComponent } from './opengraph-template-form-fields/opengraph-template-form-notice/opengraph-template-form-notice.component';

@Component({
  selector: 'app-opengraph-template-properties',
  imports: [LucideAngularModule, NgClass, NgStyle, FormsModule, PortalModule],
  templateUrl: './opengraph-template-properties.component.html',
  styleUrl: './opengraph-template-properties.component.scss'
})
export class OpengraphTemplatePropertiesComponent {

  readonly BACKGROUND_GRADIENT_COMBINATIONS = GRADIENT_COMBINATIONS;
  readonly BACKGROUND_SOLID_COLORS = SOLID_COLORS;
  readonly GRADIENT_DIRECTIONS = GRADIENT_DIRECTIONS;

  private readonly TEMPLATE_FIELDS_COMPONENT = {
    'basic': new ComponentPortal(OpengraphTemplateFormBasicComponent),
    'hero': new ComponentPortal(OpengraphTemplateFormHeroComponent),
    'logos': new ComponentPortal(OpengraphTemplateFormLogosComponent),
    'image-right': new ComponentPortal(OpengraphTemplateFormImageRightComponent),
    'notice': new ComponentPortal(OpengraphTemplateFormNoticeComponent)
  } as const satisfies Record<TemplateType, ComponentPortal<any>>;

  readonly BACKGROUND_TYPES = [
    { key: 'gradient', value: 'Gradient' },
    { key: 'solid', value: 'Solid Color' },
    { key: 'image', value: 'Image' }
  ] as const;

  readonly ICON_GRADIENT_DIRECTIONS = {
    'bottom': 'move-down',
    'top': 'move-up',
    'left': 'move-left',
    'right': 'move-right',
    'top left': 'move-up-left',
    'top right': 'move-up-right',
    'bottom left': 'move-down-left',
    'bottom right': 'move-down-right',
  } as const satisfies Record<GradientDirection, string>;

  readonly templateSelectedFormPortal = computed(() => {
    return this.TEMPLATE_FIELDS_COMPONENT[this.selectedTemplate()];
  });

  readonly selectedTemplate = model<TemplateType>('image-right');
  readonly backgroundTypeSelected = model<BackgroundType>('gradient');
  readonly backgroundColorSelected = model<string | string[]>(GRADIENT_COMBINATIONS[0]);
  readonly gradientDirectionSelected = model<string>(GRADIENT_DIRECTIONS[0]);
  readonly tagFontOptions = model<FontOptions>({ fontFamily: FONT_TYPES[0], fontWeight: '400', fontSize: 20, fontColor: '#030712' });
  readonly titleFontOptions = model<FontOptions>({ fontFamily: FONT_TYPES[0], fontWeight: '400', fontSize: 20, fontColor: '#030712' });

  gradientStyle(gradient: string[]) {
    return `linear-gradient(to ${this.gradientDirectionSelected()}, ${gradient.join(', ')})`;
  }

}
