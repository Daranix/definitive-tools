import {
  Component,
  computed,
  inject,
  input,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MadridZbeMapService } from '../../madrid-zbe-map.service';
import {
  BasemapType,
  ZBE_ZONES_META,
  ZbeZoneId
} from '../../madrid-zbe-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { I18nService } from '@/app/i18n/i18n.service';

export interface BasemapConfig {
  type: BasemapType;
  name: string;
  shortName: string;
  icon: string;
}

@Component({
  selector: 'app-zbe-layer-controls',
  standalone: true,
  imports: [LucideIconComponent, TranslatePipe],
  templateUrl: './layer-controls.component.html',
  styleUrl: './layer-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayerControlsComponent {
  readonly service = inject(MadridZbeMapService);
  readonly i18n = inject(I18nService);
  readonly embedded = input<boolean>(false);
  readonly isCollapsed = signal<boolean>(false);

  readonly basemapsList: BasemapType[] = ['streets', 'satellite', 'gray'];

  readonly basemapConfigs = computed<Record<BasemapType, BasemapConfig>>(() => ({
    streets: {
      type: 'streets',
      name: this.i18n.t('madrid-zbe-map.layers.basemaps.streets.name'),
      shortName: this.i18n.t('madrid-zbe-map.layers.basemaps.streets.shortName'),
      icon: 'map'
    },
    satellite: {
      type: 'satellite',
      name: this.i18n.t('madrid-zbe-map.layers.basemaps.satellite.name'),
      shortName: this.i18n.t('madrid-zbe-map.layers.basemaps.satellite.shortName'),
      icon: 'globe'
    },
    gray: {
      type: 'gray',
      name: this.i18n.t('madrid-zbe-map.layers.basemaps.gray.name'),
      shortName: this.i18n.t('madrid-zbe-map.layers.basemaps.gray.shortName'),
      icon: 'layers'
    }
  }));

  readonly madridZones: ZbeZoneId[] = [
    'zbe-distrito-centro',
    'zbe-plaza-eliptica',
    'zbe-interior-m30',
    'zbe-municipio'
  ];

  readonly metropolitanZones: ZbeZoneId[] = [
    'zbe-getafe',
    'zbe-fuenlabrada',
    'zbe-alcorcon',
    'zbe-alcala',
    'zbe-alcobendas',
    'zbe-mostoles',
    'zbe-parla',
    'zbe-rivas'
  ];

  readonly zonesList: ZbeZoneId[] = [
    ...this.madridZones,
    ...this.metropolitanZones
  ];

  readonly zonesMeta = ZBE_ZONES_META;

  toggleCollapse(): void {
    this.isCollapsed.update((v) => !v);
  }

  selectBasemap(type: BasemapType): void {
    this.service.setBasemap(type);
  }

  toggleZone(id: ZbeZoneId): void {
    this.service.toggleZone(id);
  }

  toggleCameras(): void {
    this.service.toggleCameras();
  }

  toggleParkings(): void {
    this.service.toggleParkings();
  }

  onOpacityChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.service.setZoneOpacity(parseFloat(input.value));
  }

  focusPreset(id: ZbeZoneId): void {
    const meta = this.zonesMeta[id];
    if (meta?.center) {
      this.service.flyTo(meta.center, meta.zoom ?? 13.5);
      this.service.selectZone(meta);
    }
  }
}
