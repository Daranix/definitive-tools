import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { I18nService } from '@/app/i18n/i18n.service';
import { MadridTransportMapService } from '../../madrid-transport-map.service';
import { TARIFF_ZONES, TariffZoneInfo } from '../../madrid-transport-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-zone-legend',
  standalone: true,
  imports: [LucideIconComponent, FormsModule, TranslatePipe],
  templateUrl: './zone-legend.component.html',
  styleUrl: './zone-legend.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZoneLegendComponent {
  readonly embedded = input<boolean>(false);
  readonly service = inject(MadridTransportMapService);
  private readonly i18n = inject(I18nService);
  readonly isExpanded = signal<boolean>(false);

  /** Reduced Abono Joven price, formatted with the active locale. */
  readonly youthPassPrice = 10;

  /** Free Abono for over-65s, formatted with the active locale. */
  readonly seniorPassPrice = 0;

  /** Zone cards with their translated names. */
  readonly zonesList = computed(() =>
    Object.values(TARIFF_ZONES).map((zone) => ({
      ...zone,
      name: this.i18n.t(`madrid-transport-map.zones.${zone.code.toLowerCase()}.name`)
    }))
  );

  /** Current fill opacity as a locale formatted percentage value. */
  readonly opacityPercent = computed(() =>
    this.i18n.formatNumber(Math.round(this.service.zoneOpacity() * 100))
  );

  /** Current fill opacity with its locale specific percent symbol. */
  readonly opacityPercentLabel = computed(() =>
    this.i18n.formatPercent(this.service.zoneOpacity(), {
      maximumFractionDigits: 0
    })
  );

  readonly selectedZoneCode = computed<string | null>(() => {
    const sel = this.service.selectedItem();
    return sel && sel.type === 'zone' ? (sel.data as TariffZoneInfo).code : null;
  });

  currency(value: number): string {
    return this.i18n.formatCurrency(value);
  }

  toggleExpand(): void {
    this.isExpanded.update((v) => !v);
  }

  onOpacityChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.service.setZoneOpacity(Number(input.value));
  }

  selectZone(zone: TariffZoneInfo): void {
    this.service.selectZone(zone);
  }

  isZoneSelected(zone: TariffZoneInfo): boolean {
    return this.selectedZoneCode() === zone.code;
  }
}
