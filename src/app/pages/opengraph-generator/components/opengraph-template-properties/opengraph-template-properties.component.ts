import { NgClass, NgStyle } from '@angular/common';
import { Component, effect, input, linkedSignal, model, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { BackgroundType, GRADIENT_DIRECTIONS, GRADIENT_COMBINATIONS, SOLID_COLORS, GradientDirection, TemplateType, BACKGROUND_OVERLAY_PATTERNS_VIEW, BACKGROUND_OVERLAY_COLORS } from '../../constants';
import { FormsModule } from '@angular/forms';
import { FONT_TYPES } from '../opengraph-font-options/opengraph-font-options.component';
import { OpenGraphBackgroundGradient, OpenGraphBackgroundImage, OpenGraphBackgroundOverlay, OpenGraphBackgroundSolid, OpenGraphData } from '../../types';
import { OpengraphTemplateFormComponent } from './opengraph-template-form/opengraph-template-form.component';
import { ContextMenuDirective } from '@/app/directives/context-menu.directive';
import { OpengraphBackgroundOverlayOptionsComponent } from '../opengraph-background-overlay-options/opengraph-background-overlay-options.component';
import { DragAndDropFileComponent } from '@/app/components/drag-and-drop-file/drag-and-drop-file.component';
import { getChecksumSha256 } from '@/app/utils/functions';

@Component({
  selector: 'app-opengraph-template-properties',
  imports: [LucideAngularModule, NgClass, NgStyle, FormsModule, OpengraphTemplateFormComponent, ContextMenuDirective, OpengraphBackgroundOverlayOptionsComponent, DragAndDropFileComponent],
  templateUrl: './opengraph-template-properties.component.html',
  styleUrl: './opengraph-template-properties.component.scss'
})
export class OpengraphTemplatePropertiesComponent {

  constructor() {
    effect(() => {
      this.propertiesUpdated.emit({
        background: this.getBackgroundData(),
        templateProperties: this.templateProperties(),
        gridOverlayPattern: this.gridOverlayPattern(),
        dimensions: this.dimensions()
      });
    });
  }

  readonly BACKGROUND_GRADIENT_COMBINATIONS = GRADIENT_COMBINATIONS;
  readonly BACKGROUND_SOLID_COLORS = SOLID_COLORS;
  readonly GRADIENT_DIRECTIONS = GRADIENT_DIRECTIONS;
  readonly BACKGROUND_OVERLAY_PATTERNS_VIEW = BACKGROUND_OVERLAY_PATTERNS_VIEW;


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

  readonly dimensions = input.required<{ width: number, height: number }>();
  readonly backgroundImage = signal<File | undefined>(undefined);
  readonly backgroundImageUrl = signal<{ url?: string, checksum?: string | undefined }>({
    url: undefined,
    checksum: undefined
  }, { equal: (a, b) => a.checksum === b.checksum });

  readonly propertiesUpdated = output<OpenGraphData>();

  readonly templateProperties = signal<OpenGraphData['templateProperties']>({
    type: 'image-right',
    tag: {
      value: '',
      fontOptions: {
        fontFamily: FONT_TYPES[0],
        fontWeight: 400,
        fontSize: 20,
        fontColor: '#030712'
      }
    },
    title: {
      value: '',
      fontOptions: {
        fontFamily: FONT_TYPES[0],
        fontWeight: 400,
        fontSize: 48,
        fontColor: '#030712'
      }
    },
    logo: { name: 'logo.png', url: '/img/opengraph-examples/logo.png' },
    image: { name: 'image.png', url: '/img/opengraph-examples/img-right-example.png' }
  });

  readonly selectedTemplate = model<TemplateType>('image-right');
  readonly backgroundTypeSelected = signal<BackgroundType>('gradient');
  readonly backgroundColorSelected = signal<string | string[]>(GRADIENT_COMBINATIONS[0]);
  readonly gradientDirectionSelected = signal<GradientDirection>(GRADIENT_DIRECTIONS[0]);
  readonly gridOverlayPattern = model<OpenGraphBackgroundOverlay>({
    pattern: 'grid',
    color: BACKGROUND_OVERLAY_COLORS[0],
    opacity: 50,
    blurRadius: 0
  });


  private getBackgroundData(): OpenGraphData['background'] {
    switch (this.backgroundTypeSelected()) {
      case 'gradient':
        return {
          type: 'gradient',
          color: this.backgroundColorSelected(),
          direction: this.gradientDirectionSelected()
        } satisfies OpenGraphBackgroundGradient;
      case 'solid':
        return {
          type: 'solid',
          color: this.backgroundColorSelected() as string
        } satisfies OpenGraphBackgroundSolid;
      case 'image':
        return {
          type: 'image',
          url: this.backgroundImageUrl().url || ''
        } satisfies OpenGraphBackgroundImage;
    }
  }

  gradientStyle(gradient: string[]) {
    return `linear-gradient(to ${this.gradientDirectionSelected()}, ${gradient.join(', ')})`;
  }

  async onImageFileChanged(file: File | undefined) {
    if(file) {
      const checksum = await getChecksumSha256(file);
      if(checksum !== this.backgroundImageUrl().checksum) {
        const oldUrl = this.backgroundImageUrl().url;
        this.backgroundImageUrl.set({
          url: URL.createObjectURL(file),
          checksum
        });
        if(oldUrl) {
          URL.revokeObjectURL(oldUrl);
        }
      }
    } else {
      this.backgroundImageUrl.set({
        url: undefined,
        checksum: undefined
      })
    }

    this.backgroundImage.set(file);
  }


}
