import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MadridZbeMapService } from '../../madrid-zbe-map.service';
import {
  DGT_BADGES_META,
  DgtBadge,
  ZbeCameraProperties,
  ZbeParkingProperties,
  ZbeZoneProperties
} from '../../madrid-zbe-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { I18nService } from '@/app/i18n/i18n.service';

/** Reduced fine (50 %) for early payment, as stated by the Madrid ordinance. */
const EARLY_PAYMENT_EUR = 100;

@Component({
  selector: 'app-zbe-detail-drawer',
  standalone: true,
  imports: [LucideIconComponent, TranslatePipe],
  templateUrl: './detail-drawer.component.html',
  styleUrl: './detail-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetailDrawerComponent {
  readonly embedded = input<boolean>(false);
  readonly service = inject(MadridZbeMapService);
  readonly i18n = inject(I18nService);

  readonly selection = computed(() => this.service.selectedItem());
  readonly isZone = computed(() => this.selection()?.type === 'zone');
  readonly isCamera = computed(() => this.selection()?.type === 'camera');
  readonly isParking = computed(() => this.selection()?.type === 'parking');

  readonly zoneData = computed<ZbeZoneProperties | null>(() => {
    const s = this.selection();
    return s && s.type === 'zone' ? (s.data as ZbeZoneProperties) : null;
  });

  readonly cameraData = computed<ZbeCameraProperties | null>(() => {
    const s = this.selection();
    return s && s.type === 'camera' ? (s.data as ZbeCameraProperties) : null;
  });

  readonly parkingData = computed<ZbeParkingProperties | null>(() => {
    const s = this.selection();
    return s && s.type === 'parking' ? (s.data as ZbeParkingProperties) : null;
  });

  /** Zone copy and formatted amounts for the active language. */
  readonly zoneView = computed(() => {
    const zone = this.zoneData();
    if (!zone) return null;

    const key = `madrid-zbe-map.zones.${zone.id}`;
    return {
      name: this.i18n.t(`${key}.name`),
      restrictionLevel: this.i18n.t(`${key}.restrictionLevel`),
      description: this.i18n.t(`${key}.description`),
      area: this.i18n.formatNumber(zone.areaKm2),
      sanction: this.i18n.t('madrid-zbe-map.detail.sanction', {
        amount: this.i18n.formatCurrency(zone.sanctionEur)
      }),
      legalNotice: this.i18n.t('madrid-zbe-map.detail.legalNotice', {
        amount: this.i18n.formatCurrency(EARLY_PAYMENT_EUR),
        law: this.i18n.t(`${key}.lawReference`)
      })
    };
  });

  readonly badgesList: DgtBadge[] = ['cero', 'eco', 'c', 'b', 'a'];
  readonly badgesMeta = DGT_BADGES_META;

  dismiss(): void {
    this.service.clearSelection();
  }

  flyToCoordinates(coords: [number, number], zoom = 15): void {
    this.service.flyTo(coords, zoom);
  }

  openSimulator(): void {
    this.service.openMobileDrawer('checker');
  }
}
