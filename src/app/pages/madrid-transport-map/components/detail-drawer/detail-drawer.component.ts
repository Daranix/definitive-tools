import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { I18nService } from '@/app/i18n/i18n.service';
import { MadridTransportMapService } from '../../madrid-transport-map.service';
import {
  NETWORK_METAS,
  TARIFF_ZONES,
  TariffZoneInfo,
  TransitStopProperties
} from '../../madrid-transport-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-detail-drawer',
  standalone: true,
  imports: [LucideIconComponent, TranslatePipe],
  templateUrl: './detail-drawer.component.html',
  styleUrl: './detail-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetailDrawerComponent {
  readonly embedded = input<boolean>(false);
  readonly service = inject(MadridTransportMapService);
  private readonly i18n = inject(I18nService);

  /** Reduced Abono Joven price, formatted with the active locale. */
  readonly youthPassPrice = 10;

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

  readonly zoneName = computed(() => {
    const zone = this.zoneData();
    return zone
      ? this.i18n.t(`madrid-transport-map.zones.${zone.code.toLowerCase()}.name`)
      : '';
  });

  readonly zoneCoverage = computed(() => {
    const zone = this.zoneData();
    return zone
      ? this.i18n.t(`madrid-transport-map.zones.${zone.code.toLowerCase()}.coverage`)
      : '';
  });

  readonly networkMeta = computed(() => {
    const station = this.stationData();
    return station ? NETWORK_METAS[station.network] : null;
  });

  readonly networkLabel = computed(() => {
    const station = this.stationData();
    return station
      ? this.i18n.t(`madrid-transport-map.networks.${station.network}.shortName`)
      : '';
  });

  readonly selectedLine = computed(() => this.service.selectedLine());
  readonly lineNetworkMeta = computed(() => {
    const l = this.selectedLine();
    return l ? NETWORK_METAS[l.network] : null;
  });

  readonly lineNetworkLabel = computed(() => {
    const l = this.selectedLine();
    return l ? this.i18n.t(`madrid-transport-map.networks.${l.network}.shortName`) : '';
  });

  currency(value: number | null | undefined): string {
    return value == null ? '' : this.i18n.formatCurrency(value);
  }

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
