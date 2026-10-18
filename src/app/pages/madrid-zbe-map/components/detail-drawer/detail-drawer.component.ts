import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MadridZbeMapService } from '../../madrid-zbe-map.service';
import {
  DGT_BADGES_META,
  DgtBadge,
  ZbeCameraProperties,
  ZbeParkingProperties,
  ZbeZoneProperties
} from '../../madrid-zbe-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-zbe-detail-drawer',
  standalone: true,
  imports: [LucideIconComponent],
  templateUrl: './detail-drawer.component.html',
  styleUrl: './detail-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetailDrawerComponent {
  readonly embedded = input<boolean>(false);
  readonly service = inject(MadridZbeMapService);

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
