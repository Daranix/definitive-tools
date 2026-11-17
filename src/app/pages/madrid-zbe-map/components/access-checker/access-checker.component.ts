import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MadridZbeMapService } from '../../madrid-zbe-map.service';
import {
  DGT_BADGES_META,
  DgtBadge,
  DgtSimulationResult,
  DestinationPurpose,
  ResidentStatus,
  VehicleType,
  ZBE_ZONES_META,
  ZbeZoneId
} from '../../madrid-zbe-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { I18nService } from '@/app/i18n/i18n.service';

@Component({
  selector: 'app-zbe-access-checker',
  standalone: true,
  imports: [LucideIconComponent, TranslatePipe],
  templateUrl: './access-checker.component.html',
  styleUrl: './access-checker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccessCheckerComponent {
  readonly service = inject(MadridZbeMapService);
  readonly i18n = inject(I18nService);
  readonly embedded = input<boolean>(false);

  readonly badgesMeta = DGT_BADGES_META;
  readonly badgeKeys: DgtBadge[] = ['cero', 'eco', 'c', 'b', 'a'];

  readonly vehicleTypes = computed<{ id: VehicleType; label: string; icon: string }[]>(() => [
    { id: 'car', label: this.i18n.t('madrid-zbe-map.simulator.vehicleTypes.car'), icon: 'car' },
    { id: 'motorcycle', label: this.i18n.t('madrid-zbe-map.simulator.vehicleTypes.motorcycle'), icon: 'bike' },
    { id: 'van', label: this.i18n.t('madrid-zbe-map.simulator.vehicleTypes.van'), icon: 'truck' }
  ]);

  readonly residentStatuses = computed<{ id: ResidentStatus; label: string }[]>(() => [
    { id: 'non-resident', label: this.i18n.t('madrid-zbe-map.simulator.residency.nonResident') },
    { id: 'madrid-resident', label: this.i18n.t('madrid-zbe-map.simulator.residency.madridResident') },
    { id: 'zone-resident', label: this.i18n.t('madrid-zbe-map.simulator.residency.zoneResident') }
  ]);

  readonly purposes = computed<{ id: DestinationPurpose; label: string; icon: string }[]>(() => [
    { id: 'public-parking', label: this.i18n.t('madrid-zbe-map.simulator.purposes.publicParking'), icon: 'circle-parking' },
    { id: 'ser-street', label: this.i18n.t('madrid-zbe-map.simulator.purposes.serStreet'), icon: 'map-pin' },
    { id: 'transit', label: this.i18n.t('madrid-zbe-map.simulator.purposes.transit'), icon: 'navigation' }
  ]);

  /** Short sticker labels shown inside the badge selector. */
  readonly badgeChips = computed<Record<DgtBadge, string>>(() => ({
    cero: this.i18n.t('madrid-zbe-map.badges.cero.chip'),
    eco: this.i18n.t('madrid-zbe-map.badges.eco.chip'),
    c: this.i18n.t('madrid-zbe-map.badges.c.chip'),
    b: this.i18n.t('madrid-zbe-map.badges.b.chip'),
    a: this.i18n.t('madrid-zbe-map.badges.a.chip')
  }));

  /** Sticker explanations, with the registration cut-off dates of the active language. */
  readonly badgeDescriptions = computed<Record<DgtBadge, string>>(() => {
    const monthYear = (date: Date): string =>
      this.i18n.formatDate(date, { month: 'long', year: 'numeric' });

    return {
      cero: this.i18n.t('madrid-zbe-map.badges.cero.description'),
      eco: this.i18n.t('madrid-zbe-map.badges.eco.description'),
      c: this.i18n.t('madrid-zbe-map.badges.c.description', {
        petrolDate: monthYear(new Date(2006, 0, 1)),
        dieselDate: monthYear(new Date(2015, 8, 1))
      }),
      b: this.i18n.t('madrid-zbe-map.badges.b.description', {
        petrolDate: monthYear(new Date(2001, 0, 1)),
        dieselDate: monthYear(new Date(2015, 7, 1))
      }),
      a: this.i18n.t('madrid-zbe-map.badges.a.description')
    };
  });

  /** Simulation verdicts resolved to the active language and formatted amounts. */
  readonly results = computed(() =>
    this.service.simulationResults().map((result) => ({
      ...result,
      zoneName: this.i18n.t(result.zoneNameKey),
      title: this.i18n.t(result.titleKey, this.copyParams(result)),
      message: this.i18n.t(result.messageKey, this.copyParams(result))
    }))
  );

  setBadge(badge: DgtBadge): void {
    this.service.simBadge.set(badge);
  }

  setVehicleType(type: VehicleType): void {
    this.service.simVehicleType.set(type);
  }

  setResidentStatus(status: ResidentStatus): void {
    this.service.simResidentStatus.set(status);
  }

  setPurpose(purpose: DestinationPurpose): void {
    this.service.simPurpose.set(purpose);
  }

  focusZone(zoneId: ZbeZoneId): void {
    const meta = ZBE_ZONES_META[zoneId];
    if (meta?.center) {
      this.service.flyTo(meta.center, meta.zoom ?? 14);
      this.service.selectZone(meta);
    }
  }

  private copyParams(result: DgtSimulationResult): Record<string, string> {
    const params: Record<string, string> = {};

    if (result.fineEur !== undefined) {
      params['amount'] = this.i18n.formatCurrency(result.fineEur);
    }
    if (result.earlyPaymentEur !== undefined) {
      params['earlyAmount'] = this.i18n.formatCurrency(result.earlyPaymentEur);
    }
    if (result.serMaxHours !== undefined) {
      params['hours'] = this.i18n.formatNumber(result.serMaxHours);
    }

    return params;
  }
}
