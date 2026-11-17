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
    let centroTitleKey = '';
    let centroMsgKey = '';
    let centroSerAllowed = false;
    let centroMaxHours: number | undefined = undefined;
    let centroFine = false;
    let centroFineEur: number | undefined = undefined;
    let centroEarlyEur: number | undefined = undefined;

    if (badge === 'cero') {
      centroAllowed = 'yes';
      centroTitleKey = 'madrid-zbe-map.simulator.centro.ceroTitle';
      centroMsgKey = 'madrid-zbe-map.simulator.centro.ceroMessage';
      centroSerAllowed = true;
    } else if (badge === 'eco') {
      centroAllowed = 'yes';
      centroTitleKey = 'madrid-zbe-map.simulator.centro.ecoTitle';
      centroMsgKey = 'madrid-zbe-map.simulator.centro.ecoMessage';
      centroSerAllowed = true;
      centroMaxHours = 2;
    } else if (badge === 'c' || badge === 'b') {
      if (resident === 'zone-resident') {
        centroAllowed = 'yes';
        centroTitleKey = 'madrid-zbe-map.simulator.centro.residentTitle';
        centroMsgKey = 'madrid-zbe-map.simulator.centro.residentMessage';
        centroSerAllowed = true;
      } else if (vType === 'motorcycle') {
        centroAllowed = 'conditional';
        centroTitleKey = 'madrid-zbe-map.simulator.centro.motorcycleTitle';
        centroMsgKey = 'madrid-zbe-map.simulator.centro.motorcycleMessage';
        centroSerAllowed = true;
      } else if (purpose === 'public-parking') {
        centroAllowed = 'conditional';
        centroTitleKey = 'madrid-zbe-map.simulator.centro.parkingTitle';
        centroMsgKey = 'madrid-zbe-map.simulator.centro.parkingMessage';
        centroSerAllowed = false;
      } else {
        centroAllowed = 'no';
        centroTitleKey = 'madrid-zbe-map.simulator.centro.transitTitle';
        centroMsgKey = 'madrid-zbe-map.simulator.centro.transitMessage';
        centroSerAllowed = false;
        centroFine = true;
        centroFineEur = 200;
      }
    } else {
      // Badge A
      if (resident === 'zone-resident') {
        centroAllowed = 'conditional';
        centroTitleKey = 'madrid-zbe-map.simulator.centro.historicTitle';
        centroMsgKey = 'madrid-zbe-map.simulator.centro.historicMessage';
        centroSerAllowed = true;
      } else {
        centroAllowed = 'no';
        centroTitleKey = 'madrid-zbe-map.simulator.centro.deniedTitle';
        centroMsgKey = 'madrid-zbe-map.simulator.centro.deniedMessage';
        centroSerAllowed = false;
        centroFine = true;
        centroFineEur = 200;
        centroEarlyEur = 100;
      }
    }

    results.push({
      zoneId: 'zbe-distrito-centro',
      zoneNameKey: 'madrid-zbe-map.simulator.zones.zbe-distrito-centro',
      allowed: centroAllowed,
      titleKey: centroTitleKey,
      messageKey: centroMsgKey,
      fineEur: centroFineEur,
      earlyPaymentEur: centroEarlyEur,
      serParkingAllowed: centroSerAllowed,
      serMaxHours: centroMaxHours,
      fineRisk: centroFine
    });

    // 2. ZBEDEP Plaza Elíptica
    let elipticaAllowed: 'yes' | 'conditional' | 'no' = 'yes';
    let elipticaTitleKey = 'madrid-zbe-map.simulator.eliptica.defaultTitle';
    let elipticaMsgKey = 'madrid-zbe-map.simulator.eliptica.defaultMessage';
    let elipticaFine = false;
    let elipticaFineEur: number | undefined = undefined;

    if (badge === 'a') {
      if (resident === 'zone-resident') {
        elipticaAllowed = 'conditional';
        elipticaTitleKey = 'madrid-zbe-map.simulator.eliptica.residentTitle';
        elipticaMsgKey = 'madrid-zbe-map.simulator.eliptica.residentMessage';
      } else {
        elipticaAllowed = 'no';
        elipticaTitleKey = 'madrid-zbe-map.simulator.eliptica.deniedTitle';
        elipticaMsgKey = 'madrid-zbe-map.simulator.eliptica.deniedMessage';
        elipticaFine = true;
        elipticaFineEur = 200;
      }
    }

    results.push({
      zoneId: 'zbe-plaza-eliptica',
      zoneNameKey: 'madrid-zbe-map.simulator.zones.zbe-plaza-eliptica',
      allowed: elipticaAllowed,
      titleKey: elipticaTitleKey,
      messageKey: elipticaMsgKey,
      fineEur: elipticaFineEur,
      serParkingAllowed: badge !== 'a',
      fineRisk: elipticaFine
    });

    // 3. Madrid ZBE - Interior M-30
    let m30Allowed: 'yes' | 'conditional' | 'no' = 'yes';
    let m30TitleKey = 'madrid-zbe-map.simulator.m30.defaultTitle';
    let m30MsgKey = 'madrid-zbe-map.simulator.m30.defaultMessage';
    let m30Fine = false;
    let m30FineEur: number | undefined = undefined;

    if (badge === 'a') {
      if (resident === 'madrid-resident' || resident === 'zone-resident') {
        m30Allowed = 'conditional';
        m30TitleKey = 'madrid-zbe-map.simulator.m30.residentTitle';
        m30MsgKey = 'madrid-zbe-map.simulator.m30.residentMessage';
      } else {
        m30Allowed = 'no';
        m30TitleKey = 'madrid-zbe-map.simulator.m30.deniedTitle';
        m30MsgKey = 'madrid-zbe-map.simulator.m30.deniedMessage';
        m30Fine = true;
        m30FineEur = 200;
      }
    }

    results.push({
      zoneId: 'zbe-interior-m30',
      zoneNameKey: 'madrid-zbe-map.simulator.zones.zbe-interior-m30',
      allowed: m30Allowed,
      titleKey: m30TitleKey,
      messageKey: m30MsgKey,
      fineEur: m30FineEur,
      serParkingAllowed: badge !== 'a',
      fineRisk: m30Fine
    });

    // 4. Madrid ZBE - Municipio Completo
    let muniAllowed: 'yes' | 'conditional' | 'no' = 'yes';
    let muniTitleKey = 'madrid-zbe-map.simulator.municipio.defaultTitle';
    let muniMsgKey = 'madrid-zbe-map.simulator.municipio.defaultMessage';
    let muniFine = false;
    let muniFineEur: number | undefined = undefined;

    if (badge === 'a') {
      if (resident === 'madrid-resident' || resident === 'zone-resident') {
        muniAllowed = 'conditional';
        muniTitleKey = 'madrid-zbe-map.simulator.municipio.residentTitle';
        muniMsgKey = 'madrid-zbe-map.simulator.municipio.residentMessage';
      } else {
        muniAllowed = 'no';
        muniTitleKey = 'madrid-zbe-map.simulator.municipio.deniedTitle';
        muniMsgKey = 'madrid-zbe-map.simulator.municipio.deniedMessage';
        muniFine = true;
        muniFineEur = 200;
      }
    }

    results.push({
      zoneId: 'zbe-municipio',
      zoneNameKey: 'madrid-zbe-map.simulator.zones.zbe-municipio',
      allowed: muniAllowed,
      titleKey: muniTitleKey,
      messageKey: muniMsgKey,
      fineEur: muniFineEur,
      serParkingAllowed: badge !== 'a',
      fineRisk: muniFine
    });

    // 5. ZBE Centro de Getafe
    let getafeAllowed: 'yes' | 'conditional' | 'no' = 'no';
    let getafeTitleKey = '';
    let getafeMsgKey = '';
    let getafeFine = false;
    let getafeFineEur: number | undefined = undefined;

    if (badge === 'cero' || badge === 'eco') {
      getafeAllowed = 'yes';
      getafeTitleKey = 'madrid-zbe-map.simulator.getafe.freeTitle';
      getafeMsgKey = 'madrid-zbe-map.simulator.getafe.freeMessage';
    } else if (badge === 'c' || badge === 'b') {
      if (resident === 'zone-resident') {
        getafeAllowed = 'yes';
        getafeTitleKey = 'madrid-zbe-map.simulator.getafe.residentTitle';
        getafeMsgKey = 'madrid-zbe-map.simulator.getafe.residentMessage';
      } else if (purpose === 'public-parking') {
        getafeAllowed = 'conditional';
        getafeTitleKey = 'madrid-zbe-map.simulator.getafe.parkingTitle';
        getafeMsgKey = 'madrid-zbe-map.simulator.getafe.parkingMessage';
      } else {
        getafeAllowed = 'conditional';
        getafeTitleKey = 'madrid-zbe-map.simulator.getafe.transitTitle';
        getafeMsgKey = 'madrid-zbe-map.simulator.getafe.transitMessage';
      }
    } else {
      // Badge A
      if (resident === 'zone-resident') {
        getafeAllowed = 'conditional';
        getafeTitleKey = 'madrid-zbe-map.simulator.getafe.restrictedTitle';
        getafeMsgKey = 'madrid-zbe-map.simulator.getafe.restrictedMessage';
      } else {
        getafeAllowed = 'no';
        getafeTitleKey = 'madrid-zbe-map.simulator.getafe.deniedTitle';
        getafeMsgKey = 'madrid-zbe-map.simulator.getafe.deniedMessage';
        getafeFine = true;
        getafeFineEur = 200;
      }
    }

    results.push({
      zoneId: 'zbe-getafe',
      zoneNameKey: 'madrid-zbe-map.simulator.zones.zbe-getafe',
      allowed: getafeAllowed,
      titleKey: getafeTitleKey,
      messageKey: getafeMsgKey,
      fineEur: getafeFineEur,
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
          type: 'zone',
          coordinates: z.center ?? [-3.7038, 40.4168],
          zoom: z.zoom ?? 13,
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
          type: 'camera',
          coordinates: c.coordinates,
          zoom: 16,
          badgeColor: '#0EA5E9',
          location: c.location,
          zoneName: c.zoneName
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
          type: 'parking',
          coordinates: p.coordinates,
          zoom: 15.5,
          badgeColor: '#10B981',
          capacity: p.capacity,
          transitConnections: p.transitConnections
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
      // The component resolves this key through I18nService so the banner
      // follows the active language.
      this.setError('madrid-zbe-map.errors.pointsLoad');
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
