import { KeyValuePipe, NgClass, NgStyle, TitleCasePipe } from '@angular/common';
import { Component, model } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { BACKGROUND_TYPES, BackgroundType, GRADIENT_DIRECTIONS, GRADIENT_COMBINATIONS, SOLID_COLORS, GradientDirection } from '../../constants';


@Component({
  selector: 'app-opengraph-template-properties',
  imports: [LucideAngularModule, NgClass, NgStyle],
  templateUrl: './opengraph-template-properties.component.html',
  styleUrl: './opengraph-template-properties.component.scss'
})
export class OpengraphTemplatePropertiesComponent {

  readonly BACKGROUND_GRADIENT_COMBINATIONS = GRADIENT_COMBINATIONS;
  readonly BACKGROUND_SOLID_COLORS = SOLID_COLORS;
  readonly GRADIENT_DIRECTIONS = GRADIENT_DIRECTIONS;

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

  readonly backgroundTypeSelected = model<BackgroundType>('gradient');
  readonly backgroundColorSelected = model<string | string[]>(GRADIENT_COMBINATIONS[0]);
  readonly gradientDirectionSelected = model<string>(GRADIENT_DIRECTIONS[0]);

  gradientStyle(gradient: string[]) {
    return `linear-gradient(to ${this.gradientDirectionSelected()}, ${gradient.join(', ')})`;
  }

}
