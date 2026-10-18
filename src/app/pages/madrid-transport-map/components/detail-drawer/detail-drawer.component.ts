import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
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
  readonly embedded = input<boolean>(false);
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

  readonly selectedLine = computed(() => this.service.selectedLine());
  readonly lineNetworkMeta = computed(() => {
    const l = this.selectedLine();
    return l ? NETWORK_METAS[l.network] : null;
  });

  onSelectLine(lineId: string): void {
    const station = this.stationData();
    if (!station) return;
    this.service.selectLine(station.network, lineId);
  }

  onClearLine(): void {
    this.service.clearSelectedLine();
  }

  isLineSelected(lineId: string): boolean {
    const active = this.selectedLine();
    const station = this.stationData();
    if (!active || !station) return false;
    return active.network === station.network && active.line === lineId;
  }

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
