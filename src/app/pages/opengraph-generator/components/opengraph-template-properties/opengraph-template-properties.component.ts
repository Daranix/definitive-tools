import { NgClass, NgStyle } from '@angular/common';
import { Component, effect, model, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { BackgroundType, GRADIENT_DIRECTIONS, GRADIENT_COMBINATIONS, SOLID_COLORS, GradientDirection, TemplateType } from '../../constants';
import { FormsModule } from '@angular/forms';
import { FONT_TYPES } from '../opengraph-font-options/opengraph-font-options.component';
import { OpenGraphBackgroundGradient, OpenGraphBackgroundImage, OpenGraphBackgroundSolid, OpenGraphData } from '../../types';
import { OpengraphTemplateFormComponent } from './opengraph-template-form/opengraph-template-form.component';

@Component({
  selector: 'app-opengraph-template-properties',
  imports: [LucideAngularModule, NgClass, NgStyle, FormsModule, OpengraphTemplateFormComponent],
  templateUrl: './opengraph-template-properties.component.html',
  styleUrl: './opengraph-template-properties.component.scss'
})
export class OpengraphTemplatePropertiesComponent {

  constructor() {
    effect(() => {
      this.propertiesUpdated.emit({
        background: this.getBackgroundData(),
        templateProperties: this.templateProperties(),
        gridOverlayPattern: {
          pattern: 'none',
          color: '#000000',
          opacity: 1,
          blurRadius: 0
        }
      });
    });
  }

  readonly BACKGROUND_GRADIENT_COMBINATIONS = GRADIENT_COMBINATIONS;
  readonly BACKGROUND_SOLID_COLORS = SOLID_COLORS;
  readonly GRADIENT_DIRECTIONS = GRADIENT_DIRECTIONS;

  /*
  private readonly TEMPLATE_FIELDS_COMPONENT = {
    'basic': OpengraphTemplateFormBasicComponent,
    'hero': OpengraphTemplateFormHeroComponent,
    'logos': OpengraphTemplateFormLogosComponent,
    'image-right': OpengraphTemplateFormImageRightComponent,
    'notice': OpengraphTemplateFormNoticeComponent
  } as const satisfies Record<TemplateType, ComponentType<any>>;*/

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

  readonly propertiesUpdated = output<OpenGraphData>();

  /*
  readonly templateSelectedFormPortal = computed(() => {
    const component = this.TEMPLATE_FIELDS_COMPONENT[this.selectedTemplate()];
    const portal = new ComponentPortal(component);
    return portal;
  });*/

  readonly templateProperties = signal<OpenGraphData['templateProperties']>({
    type: 'image-right',
    tag: {
      value: '',
      fontOptions: {
        fontFamily: FONT_TYPES[0],
        fontWeight: '400',
        fontSize: 20,
        fontColor: '#030712'
      }
    },
    title: {
      value: '',
      fontOptions: {
        fontFamily: FONT_TYPES[0],
        fontWeight: '400',
        fontSize: 20,
        fontColor: '#030712'
      }
    },
    logo: { name: 'logo.png', url: '/img/examples/logo.png' },
    image: { name: 'image.png', url: '/img/examples/image-right-example.png' }
  });

  readonly selectedTemplate = model<TemplateType>('image-right');
  readonly backgroundTypeSelected = signal<BackgroundType>('gradient');
  readonly backgroundColorSelected = signal<string | string[]>(GRADIENT_COMBINATIONS[0]);
  readonly gradientDirectionSelected = signal<GradientDirection>(GRADIENT_DIRECTIONS[0]);


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
          url: ''
        } satisfies OpenGraphBackgroundImage;
    }
  }

  /*onTemplateAttached(ref: CdkPortalOutletAttachedRef) {
    this.valueChangesSubscription?.unsubscribe();
    const selectedTemplate = this.selectedTemplate();
    const component = this.TEMPLATE_FIELDS_COMPONENT[selectedTemplate];
    type SelectedComponentType = typeof component;
    ref = ref as ComponentRef<SelectedComponentType>;
    const formGroup =  this.getTemplateDataFormGroup();
    ref.instance['formGroup'] = formGroup;
    this.valueChangesSubscription = (formGroup.valueChanges as any).subscribe((value: any) => {
      this.templateProperties.set(formGroup.value as unknown as OpenGraphData['templateProperties']);
    });
  }*/
  
  gradientStyle(gradient: string[]) {
    return `linear-gradient(to ${this.gradientDirectionSelected()}, ${gradient.join(', ')})`;
  }

}
