import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MadridTransportMapService } from '../../madrid-transport-map.service';
import { TARIFF_ZONES, TariffZoneInfo } from '../../madrid-transport-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-zone-legend',
  standalone: true,
  imports: [LucideIconComponent, FormsModule],
  templateUrl: './zone-legend.component.html',
  styleUrl: './zone-legend.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZoneLegendComponent {
  readonly embedded = input<boolean>(false);
  readonly service = inject(MadridTransportMapService);
  readonly isExpanded = signal<boolean>(false);
  protected readonly Math = Math;

  readonly zonesList: TariffZoneInfo[] = Object.values(TARIFF_ZONES);

  readonly selectedZoneCode = computed<string | null>(() => {
    const sel = this.service.selectedItem();
    return sel && sel.type === 'zone' ? (sel.data as TariffZoneInfo).code : null;
  });

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
