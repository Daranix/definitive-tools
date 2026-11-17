import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { I18nService } from '@/app/i18n/i18n.service';
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
  imports: [LucideIconComponent, TranslatePipe],
  templateUrl: './layer-controls.component.html',
  styleUrl: './layer-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayerControlsComponent {
  readonly embedded = input<boolean>(false);
  readonly service = inject(MadridTransportMapService);
  private readonly i18n = inject(I18nService);
  readonly basemapsList: BasemapType[] = ['streets', 'satellite', 'gray'];
  readonly isExpanded = signal<boolean>(true);

  readonly networksList: NetworkId[] = ['metro', 'cercanias', 'emt', 'interurban'];

  /** Basemap options with their translated labels. */
  readonly basemapOptions = computed(() =>
    this.basemapsList.map((id) => ({
      id,
      icon: BASEMAP_CONFIGS[id].icon,
      name: this.i18n.t(`madrid-transport-map.basemaps.${id}.name`),
      shortName: this.i18n.t(`madrid-transport-map.basemaps.${id}.shortName`)
    }))
  );

  /** Network options with their translated labels. */
  readonly networkOptions = computed(() =>
    this.networksList.map((id) => ({
      id,
      color: NETWORK_METAS[id].color,
      name: this.i18n.t(`madrid-transport-map.networks.${id}.name`),
      shortName: this.i18n.t(`madrid-transport-map.networks.${id}.shortName`)
    }))
  );

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
