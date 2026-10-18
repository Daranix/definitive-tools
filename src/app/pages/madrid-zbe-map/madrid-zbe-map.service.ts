import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { FeatureCollection } from 'geojson';
import {
  ActiveZbeSelection,
  BasemapType,
  DestinationPurpose,
  DgtBadge,
  DgtSimulationResult,
  ResidentStatus,
  SearchResultItem,
  VehicleType,
  ZBE_ZONES_META,
  ZbeCameraProperties,
  ZbeLayerVisibilityState,
  ZbeParkingProperties,
  ZbeZoneId,
  ZbeZoneProperties
} from './madrid-zbe-map.models';

export function normalizeSearchText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

@Injectable({
  providedIn: 'root'
})
export class MadridZbeMapService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  // ─── Basemap State ────────────────────────────────────────────────────────
  readonly activeBasemap = signal<BasemapType>('streets');

  // ─── Layer Visibility & Opacity State ─────────────────────────────────────
  readonly layers = signal<ZbeLayerVisibilityState>({
    zones: {
      'zbe-distrito-centro': true,
      'zbe-plaza-eliptica': true,
      'zbe-interior-m30': true,
      'zbe-municipio': true,
      'zbe-getafe': true,
      'zbe-fuenlabrada': true,
      'zbe-alcorcon': true,
      'zbe-alcala': true,
      'zbe-alcobendas': true,
      'zbe-mostoles': true,
      'zbe-parla': true,
      'zbe-rivas': true
    },
    showCameras: true,
    showParkings: true,
    zoneOpacity: 0.35
  });

  readonly zoneOpacity = computed(() => this.layers().zoneOpacity);
  readonly zoneVisibility = computed(() => this.layers().zones);
  readonly showCameras = computed(() => this.layers().showCameras);
  readonly showParkings = computed(() => this.layers().showParkings);

  // ─── Selection State ──────────────────────────────────────────────────────
  readonly selectedItem = signal<ActiveZbeSelection | null>(null);

  // ─── Camera Fly-To Target ─────────────────────────────────────────────────
  readonly flyToTarget = signal<{
    coordinates: [number, number];
    zoom: number;
    timestamp: number;
  } | null>(null);

  // ─── Search State ─────────────────────────────────────────────────────────
  readonly searchQuery = signal<string>('');
  readonly camerasRegistry = signal<ZbeCameraProperties[]>([]);
  readonly parkingsRegistry = signal<ZbeParkingProperties[]>([]);

  // ─── Mobile Bottom Sheet State ────────────────────────────────────────────
  readonly mobileDrawerTab = signal<'none' | 'detail' | 'layers' | 'zones' | 'checker'>('none');

  // ─── Error Notification State ─────────────────────────────────────────────
  readonly networkError = signal<string | null>(null);

  // ─── DGT Simulator State ──────────────────────────────────────────────────
  readonly simBadge = signal<DgtBadge>('c');
  readonly simVehicleType = signal<VehicleType>('car');
  readonly simResidentStatus = signal<ResidentStatus>('non-resident');
  readonly simPurpose = signal<DestinationPurpose>('public-parking');

  // ─── Evaluated Simulation Results ─────────────────────────────────────────
  readonly simulationResults = computed<DgtSimulationResult[]>(() => {
    const badge = this.simBadge();
    const vType = this.simVehicleType();
    const resident = this.simResidentStatus();
    const purpose = this.simPurpose();

    const results: DgtSimulationResult[] = [];

    // 1. ZBEDEP Distrito Centro
    let centroAllowed: 'yes' | 'conditional' | 'no' = 'no';
    let centroTitle = '';
    let centroMsg = '';
    let centroSerAllowed = false;
    let centroMaxHours: number | undefined = undefined;
    let centroFine = false;

    if (badge === 'cero') {
      centroAllowed = 'yes';
      centroTitle = 'Acceso y Estacionamiento Libre';
      centroMsg = 'Permitida la circulación y el estacionamiento en el SER sin coste ni límite horario.';
      centroSerAllowed = true;
    } else if (badge === 'eco') {
      centroAllowed = 'yes';
      centroTitle = 'Acceso Libre (SER máx. 2h)';
      centroMsg = 'Acceso libre. En superficie (SER) puedes estacionar un máximo de 2 horas. En parking público, sin límite.';
      centroSerAllowed = true;
      centroMaxHours = 2;
    } else if (badge === 'c' || badge === 'b') {
      if (resident === 'zone-resident') {
        centroAllowed = 'yes';
        centroTitle = 'Acceso Permitido (Residente)';
        centroMsg = 'Como residente empadronado en Distrito Centro, puedes acceder y estacionar en tu barrio.';
        centroSerAllowed = true;
      } else if (vType === 'motorcycle') {
        centroAllowed = 'conditional';
        centroTitle = 'Acceso Horario (07:00 a 22:00)';
        centroMsg = 'Las motocicletas y ciclomotores con etiqueta B o C pueden acceder libremente de 07:00 a 22:00 h.';
        centroSerAllowed = true;
      } else if (purpose === 'public-parking') {
        centroAllowed = 'conditional';
        centroTitle = 'Acceso Condicionado a Parking';
        centroMsg =
          'Obligatorio estacionar en un aparcamiento de uso público o garaje privado concertado. Prohibido aparcar en la calle.';
        centroSerAllowed = false;
      } else {
        centroAllowed = 'no';
        centroTitle = 'Acceso Denegado (Multa de 200 €)';
        centroMsg =
          'Los vehículos B y C no pueden acceder solo de paso (tránsito) ni para aparcar en la calle (SER).';
        centroSerAllowed = false;
        centroFine = true;
      }
    } else {
      // Badge A
      if (resident === 'zone-resident') {
        centroAllowed = 'conditional';
        centroTitle = 'Acceso Solo Residentes Históricos';
        centroMsg =
          'Permitido únicamente si el vehículo ya estaba empadronado en el distrito antes del 2021 o si traslada a personas con movilidad reducida (PMR).';
        centroSerAllowed = true;
      } else {
        centroAllowed = 'no';
        centroTitle = 'Acceso Prohibido las 24 horas';
        centroMsg =
          'Prohibida la entrada a vehículos Sin Distintivo (A) bajo sanción de 200 € (100 € pronto pago).';
        centroSerAllowed = false;
        centroFine = true;
      }
    }

    results.push({
      zoneId: 'zbe-distrito-centro',
      zoneName: 'ZBEDEP Distrito Centro',
      allowed: centroAllowed,
      title: centroTitle,
      message: centroMsg,
      serParkingAllowed: centroSerAllowed,
      serMaxHours: centroMaxHours,
      fineRisk: centroFine
    });

    // 2. ZBEDEP Plaza Elíptica
    let elipticaAllowed: 'yes' | 'conditional' | 'no' = 'yes';
    let elipticaTitle = 'Acceso y Circulación Libre';
    let elipticaMsg = 'Sin restricciones específicas de ZBE para distintivos CERO, ECO, C y B.';
    let elipticaFine = false;

    if (badge === 'a') {
      if (resident === 'zone-resident') {
        elipticaAllowed = 'conditional';
        elipticaTitle = 'Permitido Solo Residentes';
        elipticaMsg = 'Vehículo empadronado en el perímetro delimitado de Plaza Elíptica.';
      } else {
        elipticaAllowed = 'no';
        elipticaTitle = 'Acceso Prohibido las 24 horas';
        elipticaMsg =
          'Prohibido el acceso y circulación a vehículos Sin Distintivo (A). Sanción: 200 €.';
        elipticaFine = true;
      }
    }

    results.push({
      zoneId: 'zbe-plaza-eliptica',
      zoneName: 'ZBEDEP Plaza Elíptica',
      allowed: elipticaAllowed,
      title: elipticaTitle,
      message: elipticaMsg,
      serParkingAllowed: badge !== 'a',
      fineRisk: elipticaFine
    });

    // 3. Madrid ZBE - Interior M-30
    let m30Allowed: 'yes' | 'conditional' | 'no' = 'yes';
    let m30Title = 'Acceso y Circulación Libre';
    let m30Msg = 'Circulación permitida por M-30 y calles interiores según normativa general de tráfico y SER.';
    let m30Fine = false;

    if (badge === 'a') {
      if (resident === 'madrid-resident' || resident === 'zone-resident') {
        m30Allowed = 'conditional';
        m30Title = 'Permitido (IVTM en Madrid Capital)';
        m30Msg = 'Permitido solo si el turismo paga el Impuesto de Tracción Mecánica (IVTM) en Madrid capital.';
      } else {
        m30Allowed = 'no';
        m30Title = 'Prohibido Circular en M-30 e Interior';
        m30Msg =
          'Vehículos A no domiciliados en la capital tienen prohibido circular por la M-30 y el interior. Sanción: 200 €.';
        m30Fine = true;
      }
    }

    results.push({
      zoneId: 'zbe-interior-m30',
      zoneName: 'Madrid ZBE - Interior M-30',
      allowed: m30Allowed,
      title: m30Title,
      message: m30Msg,
      serParkingAllowed: badge !== 'a',
      fineRisk: m30Fine
    });

    // 4. Madrid ZBE - Municipio Completo
    let muniAllowed: 'yes' | 'conditional' | 'no' = 'yes';
    let muniTitle = 'Acceso Libre en Todo Madrid';
    let muniMsg = 'Permitida la circulación por todas las vías del municipio de Madrid.';
    let muniFine = false;

    if (badge === 'a') {
      if (resident === 'madrid-resident' || resident === 'zone-resident') {
        muniAllowed = 'conditional';
        muniTitle = 'Permitido Temporalmente (Empadronados)';
        muniMsg = 'Turismos A domiciliados en Madrid con IVTM al día.';
      } else {
        muniAllowed = 'no';
        muniTitle = 'Prohibido en Todo el Municipio';
        muniMsg =
          'Prohibida la circulación por cualquier vía pública del término municipal de Madrid. Sanción: 200 €.';
        muniFine = true;
      }
    }

    results.push({
      zoneId: 'zbe-municipio',
      zoneName: 'Madrid ZBE (Término Municipal)',
      allowed: muniAllowed,
      title: muniTitle,
      message: muniMsg,
      serParkingAllowed: badge !== 'a',
      fineRisk: muniFine
    });

    // 5. ZBE Centro de Getafe
    let getafeAllowed: 'yes' | 'conditional' | 'no' = 'no';
    let getafeTitle = '';
    let getafeMsg = '';
    let getafeFine = false;

    if (badge === 'cero' || badge === 'eco') {
      getafeAllowed = 'yes';
      getafeTitle = 'Acceso Libre (CERO / ECO)';
      getafeMsg = 'Los vehículos CERO y ECO pueden circular y estacionar sin restricciones por el centro de Getafe.';
    } else if (badge === 'c' || badge === 'b') {
      if (resident === 'zone-resident') {
        getafeAllowed = 'yes';
        getafeTitle = 'Acceso Permitido (Empadronado en Getafe)';
        getafeMsg = 'Los vehículos censados e inscritos en el padrón de Getafe tienen libre acceso al casco urbano.';
      } else if (purpose === 'public-parking') {
        getafeAllowed = 'conditional';
        getafeTitle = 'Acceso Permitido con Destino a Parking';
        getafeMsg = 'Permitido el acceso a no residentes si se dirigen a aparcamientos públicos o reservas de estacionamiento.';
      } else {
        getafeAllowed = 'conditional';
        getafeTitle = 'Tránsito Restringido';
        getafeMsg = 'Los vehículos B y C no empadronados deben justificar estancia o destino en el perímetro de Getafe.';
      }
    } else {
      // Badge A
      if (resident === 'zone-resident') {
        getafeAllowed = 'conditional';
        getafeTitle = 'Acceso Restringido a Residentes';
        getafeMsg = 'Solo los vehículos de residentes con autorización o PMR pueden acceder sin etiqueta.';
      } else {
        getafeAllowed = 'no';
        getafeTitle = 'Prohibido el Acceso (Sanción 200 €)';
        getafeMsg = 'Prohibida la circulación de vehículos Sin Distintivo (A) por el perímetro de la ZBE de Getafe.';
        getafeFine = true;
      }
    }

    results.push({
      zoneId: 'zbe-getafe',
      zoneName: 'ZBE Centro de Getafe',
      allowed: getafeAllowed,
      title: getafeTitle,
      message: getafeMsg,
      serParkingAllowed: badge !== 'a',
      fineRisk: getafeFine
    });

    return results;
  });

  // ─── Filtered Search Results ──────────────────────────────────────────────
  readonly searchResults = computed<SearchResultItem[]>(() => {
    const rawQuery = this.searchQuery();
    const query = normalizeSearchText(rawQuery);
    if (!query || query.length < 2) {
      return [];
    }

    const matches: SearchResultItem[] = [];

    // Search in Zones
    const zonesList = Object.values(ZBE_ZONES_META);
    for (const z of zonesList) {
      const normName = normalizeSearchText(z.name);
      const normShort = normalizeSearchText(z.shortName);
      const normDesc = normalizeSearchText(z.description);

      if (normName.includes(query) || normShort.includes(query) || normDesc.includes(query)) {
        matches.push({
          id: z.id,
          name: z.name,
          subtitle: `${z.restrictionLevel} • ${z.areaKm2} km²`,
          type: 'zone',
          coordinates: z.center ?? [-3.7038, 40.4168],
          zoom: z.zoom ?? 13,
          badge: 'Zona ZBE',
          badgeColor: z.color
        });
      }
    }

    // Search in Cameras
    const cameras = this.camerasRegistry();
    for (const c of cameras) {
      const normName = normalizeSearchText(c.name);
      const normLoc = normalizeSearchText(c.location);
      const normZone = normalizeSearchText(c.zoneName);

      if (normName.includes(query) || normLoc.includes(query) || normZone.includes(query)) {
        matches.push({
          id: c.id,
          name: c.name,
          subtitle: `${c.location} (${c.zoneName})`,
          type: 'camera',
          coordinates: c.coordinates,
          zoom: 16,
          badge: 'Cámara OCR',
          badgeColor: '#0EA5E9'
        });
      }
    }

    // Search in Parkings
    const parkings = this.parkingsRegistry();
    for (const p of parkings) {
      const normName = normalizeSearchText(p.name);
      const normAddr = normalizeSearchText(p.address);
      const normTrans = normalizeSearchText(p.transitConnections);

      if (normName.includes(query) || normAddr.includes(query) || normTrans.includes(query)) {
        matches.push({
          id: p.id,
          name: p.name,
          subtitle: `${p.capacity} plazas • ${p.transitConnections}`,
          type: 'parking',
          coordinates: p.coordinates,
          zoom: 15.5,
          badge: 'Aparcamiento P+R',
          badgeColor: '#10B981'
        });
      }
    }

    return matches.slice(0, 8);
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.loadInitialData();
    }
  }

  async loadInitialData(): Promise<void> {
    try {
      const points = await firstValueFrom(
        this.http.get<FeatureCollection>('/maps/madrid-360/zbe-points.geojson')
      );

      const cameras: ZbeCameraProperties[] = [];
      const parkings: ZbeParkingProperties[] = [];

      for (const feat of points.features) {
        const coords = (feat.geometry as unknown as { coordinates: [number, number] }).coordinates;
        if (feat.properties?.['type'] === 'camera') {
          cameras.push({
            ...(feat.properties as unknown as ZbeCameraProperties),
            coordinates: coords
          });
        } else if (feat.properties?.['type'] === 'parking') {
          parkings.push({
            ...(feat.properties as unknown as ZbeParkingProperties),
            coordinates: coords
          });
        }
      }

      this.camerasRegistry.set(cameras);
      this.parkingsRegistry.set(parkings);
    } catch (err) {
      console.warn('Failed to load ZBE points metadata:', err);
      this.setError('No se pudieron cargar los puntos de control y aparcamientos.');
    }
  }

  setBasemap(basemap: BasemapType): void {
    this.activeBasemap.set(basemap);
  }

  toggleZone(id: ZbeZoneId): void {
    this.layers.update((prev) => ({
      ...prev,
      zones: {
        ...prev.zones,
        [id]: !prev.zones[id]
      }
    }));
  }

  toggleCameras(): void {
    this.layers.update((prev) => ({
      ...prev,
      showCameras: !prev.showCameras
    }));
  }

  toggleParkings(): void {
    this.layers.update((prev) => ({
      ...prev,
      showParkings: !prev.showParkings
    }));
  }

  setZoneOpacity(opacity: number): void {
    const clamped = Math.max(0.1, Math.min(0.85, opacity));
    this.layers.update((prev) => ({
      ...prev,
      zoneOpacity: clamped
    }));
  }

  selectZone(zone: ZbeZoneProperties): void {
    this.selectedItem.set({
      type: 'zone',
      data: zone,
      coordinates: zone.center
    });
    if (zone.center) {
      this.flyTo(zone.center, zone.zoom ?? 13.5);
    }
    this.openMobileDrawer('detail');
  }

  selectCamera(camera: ZbeCameraProperties): void {
    this.selectedItem.set({
      type: 'camera',
      data: camera,
      coordinates: camera.coordinates
    });
    this.flyTo(camera.coordinates, 16);
    this.openMobileDrawer('detail');
  }

  selectParking(parking: ZbeParkingProperties): void {
    this.selectedItem.set({
      type: 'parking',
      data: parking,
      coordinates: parking.coordinates
    });
    this.flyTo(parking.coordinates, 15.5);
    this.openMobileDrawer('detail');
  }

  clearSelection(): void {
    this.selectedItem.set(null);
  }

  flyTo(coordinates: [number, number], zoom = 14): void {
    this.flyToTarget.set({
      coordinates,
      zoom,
      timestamp: Date.now()
    });
  }

  openMobileDrawer(tab: 'detail' | 'layers' | 'zones' | 'checker'): void {
    this.mobileDrawerTab.set(tab);
  }

  closeMobileDrawer(): void {
    this.mobileDrawerTab.set('none');
  }

  setError(msg: string | null): void {
    this.networkError.set(msg);
  }

  setSearchQuery(q: string): void {
    this.searchQuery.set(q);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  selectSearchResult(item: SearchResultItem): void {
    this.clearSearch();
    this.flyTo(item.coordinates, item.zoom ?? 15);

    if (item.type === 'zone') {
      const zone = ZBE_ZONES_META[item.id as ZbeZoneId];
      if (zone) {
        this.selectZone(zone);
      }
    } else if (item.type === 'camera') {
      const cam = this.camerasRegistry().find((c) => c.id === item.id);
      if (cam) {
        this.selectCamera(cam);
      }
    } else if (item.type === 'parking') {
      const prk = this.parkingsRegistry().find((p) => p.id === item.id);
      if (prk) {
        this.selectParking(prk);
      }
    }
  }

  dismissError(): void {
    this.networkError.set(null);
  }
}
