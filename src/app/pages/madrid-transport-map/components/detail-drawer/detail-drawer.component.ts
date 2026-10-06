import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MadridTransportMapService } from '../../madrid-transport-map.service';
import {
  ActiveSelection,
  NETWORK_METAS,
  TARIFF_ZONES,
  TariffZoneCode,
  TariffZoneInfo,
  TransitStopProperties
} from '../../madrid-transport-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-detail-drawer',
  standalone: true,
  imports: [LucideIconComponent],
  templateUrl: './detail-drawer.component.html',
  styleUrl: './detail-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetailDrawerComponent {
  readonly service = inject(MadridTransportMapService);

  readonly selection = computed(() => this.service.selectedItem());
  readonly isStation = computed(() => this.selection()?.type === 'station');
  readonly isZone = computed(() => this.selection()?.type === 'zone');

  readonly stationData = computed<TransitStopProperties | null>(() => {
    const s = this.selection();
    return s && s.type === 'station' ? (s.data as TransitStopProperties) : null;
  });

  readonly zoneData = computed<TariffZoneInfo | null>(() => {
    const s = this.selection();
    if (!s) return null;
    if (s.type === 'zone') return s.data as TariffZoneInfo;
    const station = s.data as TransitStopProperties;
    return station.zone ? TARIFF_ZONES[station.zone] : null;
  });

  readonly networkMeta = computed(() => {
    const station = this.stationData();
    return station ? NETWORK_METAS[station.network] : null;
  });

  close(): void {
    this.service.clearSelection();
  }

  centerStation(): void {
    const station = this.stationData();
    if (station && station.coordinates) {
      this.service.flyTo(station.coordinates, 15);
    }
  }
}
