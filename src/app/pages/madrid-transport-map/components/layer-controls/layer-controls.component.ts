import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MadridTransportMapService } from '../../madrid-transport-map.service';
import {
  BASEMAP_CONFIGS,
  BasemapType,
  NETWORK_METAS,
  NetworkId
} from '../../madrid-transport-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-layer-controls',
  standalone: true,
  imports: [LucideIconComponent],
  templateUrl: './layer-controls.component.html',
  styleUrl: './layer-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayerControlsComponent {
  readonly service = inject(MadridTransportMapService);
  readonly networkMetas = NETWORK_METAS;
  readonly basemapConfigs = BASEMAP_CONFIGS;
  readonly basemapsList: BasemapType[] = ['streets', 'satellite', 'gray'];
  readonly isExpanded = signal<boolean>(true);

  readonly networksList: NetworkId[] = ['metro', 'cercanias', 'emt', 'interurban'];

  togglePanel(): void {
    this.isExpanded.update((v) => !v);
  }

  toggleNetwork(id: NetworkId): void {
    this.service.toggleNetwork(id);
  }

  toggleZones(): void {
    this.service.toggleZones();
  }

  selectBasemap(id: BasemapType): void {
    this.service.setBasemap(id);
  }
}
