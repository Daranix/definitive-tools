import {
  Component,
  inject,
  input,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { MadridZbeMapService } from '../../madrid-zbe-map.service';
import {
  BasemapType,
  ZBE_ZONES_META,
  ZbeZoneId
} from '../../madrid-zbe-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';

export interface BasemapConfig {
  type: BasemapType;
  name: string;
  shortName: string;
  icon: string;
}

@Component({
  selector: 'app-zbe-layer-controls',
  standalone: true,
  imports: [LucideIconComponent],
  templateUrl: './layer-controls.component.html',
  styleUrl: './layer-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayerControlsComponent {
  readonly service = inject(MadridZbeMapService);
  readonly embedded = input<boolean>(false);
  readonly isCollapsed = signal<boolean>(false);

  readonly basemapsList: BasemapType[] = ['streets', 'satellite', 'gray'];

  readonly basemapConfigs: Record<BasemapType, BasemapConfig> = {
    streets: {
      type: 'streets',
      name: 'Calles & Carreteras',
      shortName: 'Calles',
      icon: 'map'
    },
    satellite: {
      type: 'satellite',
      name: 'Satélite Alta Resolución',
      shortName: 'Satélite',
      icon: 'globe'
    },
    gray: {
      type: 'gray',
      name: 'Gris Claro Cartográfico',
      shortName: 'Claro',
      icon: 'layers'
    }
  };

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
