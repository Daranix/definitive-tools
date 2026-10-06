import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  ActiveSelection,
  BasemapType,
  LayerVisibilityState,
  NetworkId,
  SearchResultItem,
  TARIFF_ZONES,
  TariffZoneCode,
  TariffZoneInfo,
  TransitStopProperties
} from './madrid-transport-map.models';
import { firstValueFrom } from 'rxjs';
import type { FeatureCollection } from 'geojson';

@Injectable({
  providedIn: 'root'
})
export class MadridTransportMapService {
  private readonly http = inject(HttpClient);

  // ─── Basemap State ────────────────────────────────────────────────────────
  readonly activeBasemap = signal<BasemapType>('streets');

  // ─── Layer Visibility & Opacity State ─────────────────────────────────────
  readonly layers = signal<LayerVisibilityState>({
    networks: {
      metro: true,
      cercanias: true,
      emt: false,
      interurban: false
    },
    showZones: true,
    zoneOpacity: 0.3
  });

  readonly zoneOpacity = computed(() => this.layers().zoneOpacity);
  readonly showZones = computed(() => this.layers().showZones);
  readonly networkVisibility = computed(() => this.layers().networks);

  // ─── Selection State ──────────────────────────────────────────────────────
  readonly selectedItem = signal<ActiveSelection | null>(null);

  // ─── Camera Fly-To Target ─────────────────────────────────────────────────
  readonly flyToTarget = signal<{ coordinates: [number, number]; zoom: number; timestamp: number } | null>(null);

  // ─── Search State ─────────────────────────────────────────────────────────
  readonly searchQuery = signal<string>('');
  readonly stationsRegistry = signal<TransitStopProperties[]>([]);

  // ─── Error Notification State ─────────────────────────────────────────────
  readonly networkError = signal<string | null>(null);

  // ─── Filtered Search Results ──────────────────────────────────────────────
  readonly searchResults = computed<SearchResultItem[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query || query.length < 2) {
      return [];
    }

    const registry = this.stationsRegistry();
    const matches: SearchResultItem[] = [];

    for (const item of registry) {
      const nameMatch = item.name.toLowerCase().includes(query);
      const lineMatch = item.lines?.some((l) => l.toLowerCase() === query || l.toLowerCase().includes(query));
      const zoneMatch = query.length <= 2 && item.zone.toLowerCase() === query;

      if ((nameMatch || lineMatch || zoneMatch) && item.coordinates) {
        matches.push({
          id: item.id,
          name: item.name,
          network: item.network,
          zone: item.zone,
          lines: item.lines || [],
          coordinates: item.coordinates,
          type: 'station'
        });
      }

      if (matches.length >= 25) {
        break;
      }
    }

    return matches;
  });

  // ─── Mutation Methods ─────────────────────────────────────────────────────

  toggleNetwork(network: NetworkId): void {
    this.layers.update((prev) => ({
      ...prev,
      networks: {
        ...prev.networks,
        [network]: !prev.networks[network]
      }
    }));
  }

  setNetworkVisibility(network: NetworkId, visible: boolean): void {
    this.layers.update((prev) => ({
      ...prev,
      networks: {
        ...prev.networks,
        [network]: visible
      }
    }));
  }

  toggleZones(): void {
    this.layers.update((prev) => ({
      ...prev,
      showZones: !prev.showZones
    }));
  }

  setZoneOpacity(value: number): void {
    // Clamp opacity strictly between 0.05 and 0.80
    const clamped = Math.max(0.05, Math.min(0.8, Number(value)));
    this.layers.update((prev) => ({
      ...prev,
      zoneOpacity: Number(clamped.toFixed(2))
    }));
  }

  setBasemap(basemap: BasemapType): void {
    this.activeBasemap.set(basemap);
  }

  selectStation(station: TransitStopProperties, coordinates?: [number, number]): void {
    this.selectedItem.set({
      type: 'station',
      data: station,
      coordinates: coordinates || station.coordinates
    });
  }

  selectZone(zone: TariffZoneInfo | TariffZoneCode): void {
    const zoneInfo = typeof zone === 'string' ? TARIFF_ZONES[zone] : zone;
    if (zoneInfo) {
      this.selectedItem.set({
        type: 'zone',
        data: zoneInfo
      });
    }
  }

  clearSelection(): void {
    this.selectedItem.set(null);
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  flyTo(coordinates: [number, number], zoom = 14): void {
    this.flyToTarget.set({
      coordinates,
      zoom,
      timestamp: Date.now()
    });
  }

  selectSearchResult(result: SearchResultItem): void {
    this.selectStation({
      id: result.id,
      name: result.name,
      network: result.network,
      lines: result.lines,
      zone: result.zone,
      coordinates: result.coordinates
    });
    this.flyTo(result.coordinates, 14.5);
    this.clearSearch();
  }

  registerStations(stations: TransitStopProperties[]): void {
    this.stationsRegistry.update((existing) => {
      const existingIds = new Set(existing.map((s) => s.id));
      const toAdd = stations.filter((s) => !existingIds.has(s.id));
      return [...existing, ...toAdd];
    });
  }

  setError(error: string | null): void {
    this.networkError.set(error);
  }

  async loadInitialData(): Promise<void> {
    try {
      const [metroData, cercaniasData] = await Promise.all([
        firstValueFrom(this.http.get<FeatureCollection>('/maps/madrid/metro.geojson')),
        firstValueFrom(this.http.get<FeatureCollection>('/maps/madrid/cercanias.geojson'))
      ]);

      const stops: TransitStopProperties[] = [];

      for (const f of metroData.features) {
        if (f.geometry.type === 'Point' && f.properties?.['type'] === 'station') {
          stops.push({
            id: f.properties['id'] || (f.id as string),
            name: f.properties['name'],
            network: 'metro',
            lines: f.properties['lines'] || [],
            zone: f.properties['zone'] as TariffZoneCode,
            wheelchairAccessible: f.properties['wheelchairAccessible'],
            coordinates: f.geometry.coordinates as [number, number]
          });
        }
      }

      for (const f of cercaniasData.features) {
        if (f.geometry.type === 'Point' && f.properties?.['type'] === 'station') {
          stops.push({
            id: f.properties['id'] || (f.id as string),
            name: f.properties['name'],
            network: 'cercanias',
            lines: f.properties['lines'] || [],
            zone: f.properties['zone'] as TariffZoneCode,
            wheelchairAccessible: f.properties['wheelchairAccessible'],
            coordinates: f.geometry.coordinates as [number, number]
          });
        }
      }

      this.registerStations(stops);
    } catch {
      // Quiet fail on initial preload, map will load files directly
    }
  }

  async loadBusData(network: 'emt' | 'interurban'): Promise<FeatureCollection | null> {
    const filename = network === 'emt' ? 'emt.geojson' : 'interurban.geojson';
    try {
      const data = await firstValueFrom(
        this.http.get<FeatureCollection>(`/maps/madrid/${filename}`)
      );

      const stops: TransitStopProperties[] = [];
      for (const f of data.features) {
        if (f.geometry.type === 'Point') {
          stops.push({
            id: f.properties?.['id'] || (f.id as string),
            name: f.properties?.['name'],
            network,
            lines: f.properties?.['lines'] || [],
            zone: (f.properties?.['zone'] as TariffZoneCode) || 'A',
            wheelchairAccessible: f.properties?.['wheelchairAccessible'],
            coordinates: f.geometry.coordinates as [number, number]
          });
        }
      }
      this.registerStations(stops);
      this.setError(null);
      return data;
    } catch {
      this.setError(`Failed to load ${network.toUpperCase()} bus network dataset. Please try again.`);
      return null;
    }
  }
}
