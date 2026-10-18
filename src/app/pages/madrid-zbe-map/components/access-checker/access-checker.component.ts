import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MadridZbeMapService } from '../../madrid-zbe-map.service';
import {
  DGT_BADGES_META,
  DgtBadge,
  DestinationPurpose,
  ResidentStatus,
  VehicleType,
  ZBE_ZONES_META,
  ZbeZoneId
} from '../../madrid-zbe-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-zbe-access-checker',
  standalone: true,
  imports: [LucideIconComponent],
  templateUrl: './access-checker.component.html',
  styleUrl: './access-checker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccessCheckerComponent {
  readonly service = inject(MadridZbeMapService);
  readonly embedded = input<boolean>(false);

  readonly badgesMeta = DGT_BADGES_META;
  readonly badgeKeys: DgtBadge[] = ['cero', 'eco', 'c', 'b', 'a'];

  readonly vehicleTypes: { id: VehicleType; label: string; icon: string }[] = [
    { id: 'car', label: 'Turismo', icon: 'car' },
    { id: 'motorcycle', label: 'Moto / Ciclomotor', icon: 'bike' },
    { id: 'van', label: 'Furgoneta / Mixto', icon: 'truck' }
  ];

  readonly residentStatuses: { id: ResidentStatus; label: string }[] = [
    { id: 'non-resident', label: 'No Residente (Externo)' },
    { id: 'madrid-resident', label: 'Residente Madrid Capital' },
    { id: 'zone-resident', label: 'Residente en Distrito Centro' }
  ];

  readonly purposes: { id: DestinationPurpose; label: string; icon: string }[] = [
    { id: 'public-parking', label: 'Parking Público / Garaje', icon: 'circle-parking' },
    { id: 'ser-street', label: 'Estacionar en Calle (SER)', icon: 'map-pin' },
    { id: 'transit', label: 'Tránsito de Paso (Sin Aparcar)', icon: 'navigation' }
  ];

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
}
