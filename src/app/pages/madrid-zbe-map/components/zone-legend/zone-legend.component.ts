import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MadridZbeMapService } from '../../madrid-zbe-map.service';
import { ZBE_ZONES_META, ZbeZoneProperties } from '../../madrid-zbe-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-zbe-zone-legend',
  standalone: true,
  imports: [LucideIconComponent],
  templateUrl: './zone-legend.component.html',
  styleUrl: './zone-legend.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZoneLegendComponent {
  readonly embedded = input<boolean>(false);
  readonly service = inject(MadridZbeMapService);
  readonly isExpanded = signal<boolean>(false);

  readonly zonesList: ZbeZoneProperties[] = Object.values(ZBE_ZONES_META);

  readonly madridZones = computed<ZbeZoneProperties[]>(() =>
    this.zonesList.filter((z) => z.category !== 'metropolitana')
  );

  readonly metropolitanZones = computed<ZbeZoneProperties[]>(() =>
    this.zonesList.filter((z) => z.category === 'metropolitana')
  );

  readonly selectedZoneId = computed<string | null>(() => {
    const sel = this.service.selectedItem();
    return sel && sel.type === 'zone' ? (sel.data as ZbeZoneProperties).id : null;
  });

  toggleExpand(): void {
    this.isExpanded.update((v) => !v);
  }

  selectZone(zone: ZbeZoneProperties): void {
    this.service.selectZone(zone);
  }

  isZoneSelected(zone: ZbeZoneProperties): boolean {
    return this.selectedZoneId() === zone.id;
  }
}
