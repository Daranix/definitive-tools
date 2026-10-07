import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ActiveSelection,
  BasemapType,
  LayerVisibilityState,
  NetworkId,
  SearchResultItem,
  SelectedLineInfo,
  TARIFF_ZONES,
  TariffZoneCode,
  TariffZoneInfo,
  TransitStopProperties,
  ZONE_CENTERS
} from './madrid-transport-map.models';
import { firstValueFrom } from 'rxjs';
import type { FeatureCollection } from 'geojson';

export function normalizeSearchText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function matchLineQuery(line: string, query: string): boolean {
  const normLine = normalizeSearchText(line);
  const cleanLine = normLine.replace(/[^a-z0-9]/g, '');
  const cleanQuery = query.replace(/[^a-z0-9]/g, '');

  if (normLine === query || cleanLine === cleanQuery) return true;
  if (normLine.includes(query) || cleanLine.includes(cleanQuery)) return true;

  // Metro line prefix: e.g. "L1", "linea 1", "metro 1" -> "1"
  const lineNumOnly = query.replace(/^(linea|line|metro|l)\s*[-_]?/i, '');
  if (lineNumOnly && lineNumOnly === normLine) return true;

  // Cercanias line prefix: e.g. "c5", "cercanias 5" -> "c5"
  const cercNumOnly = query.replace(/^(cercanias|cercanías|c)\s*[-_]?/i, '');
  if (cercNumOnly && cleanLine === 'c' + cercNumOnly) return true;

  return false;
}

@Injectable({
  providedIn: 'root'
})
export class MadridTransportMapService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

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
  readonly selectedLine = signal<SelectedLineInfo | null>(null);
  readonly linesRegistry = signal<Map<string, SelectedLineInfo>>(new Map());

  // ─── Camera Fly-To Target ─────────────────────────────────────────────────
  readonly flyToTarget = signal<{ coordinates: [number, number]; zoom: number; timestamp: number } | null>(null);

  // ─── Search State ─────────────────────────────────────────────────────────
  readonly searchQuery = signal<string>('');
  readonly stationsRegistry = signal<TransitStopProperties[]>([]);

  // ─── Mobile Drawer State (Vault-style bottom sheet) ───────────────────────
  readonly mobileDrawerTab = signal<'none' | 'layers' | 'zones' | 'detail'>('none');

  // ─── Error Notification State ─────────────────────────────────────────────
  readonly networkError = signal<string | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.loadInitialData();
    }
  }

  // ─── Filtered Search Results ──────────────────────────────────────────────
  readonly searchResults = computed<SearchResultItem[]>(() => {
    const rawQuery = this.searchQuery();
    const query = normalizeSearchText(rawQuery);
    if (!query || query.length < 2) {
      return [];
    }

    const registry = this.stationsRegistry();
    const matches: SearchResultItem[] = [];
    const cleanZoneQuery = query.replace(/^zona\s+/i, '');

    for (const item of registry) {
      const normName = normalizeSearchText(item.name);
      const nameMatch = normName.includes(query);
      const lineMatch = item.lines?.some((l) => matchLineQuery(l, query));
      const zoneMatch = item.zone.toLowerCase() === cleanZoneQuery;

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
    this.openMobileDrawer('detail');
  }

  selectZone(zone: TariffZoneInfo | TariffZoneCode): void {
    const zoneInfo = typeof zone === 'string' ? TARIFF_ZONES[zone] : zone;
    if (zoneInfo) {
      if (!this.layers().showZones) {
        this.layers.update((prev) => ({ ...prev, showZones: true }));
      }
      this.selectedItem.set({
        type: 'zone',
        data: zoneInfo
      });
      const center = ZONE_CENTERS[zoneInfo.code];
      if (center) {
        this.flyTo(center.coordinates, center.zoom);
      }
      this.openMobileDrawer('detail');
    }
  }

  clearSelection(): void {
    this.selectedItem.set(null);
    if (this.mobileDrawerTab() === 'detail') {
      this.closeMobileDrawer();
    }
  }

  selectLine(network: NetworkId, lineId: string): void {
    this.setNetworkVisibility(network, true);
    const key = `${network}:${lineId}`;
    const found = this.linesRegistry().get(key);
    if (found) {
      this.selectedLine.set(found);
    } else {
      const cercaniasColors: Record<string, string> = {
        'C-1': '#00A9E0',
        'C-2': '#15803D',
        'C-3': '#8A1D7C',
        'C-4': '#003399',
        'C-4a': '#003399',
        'C-4b': '#1E1B7D',
        'C-5': '#F59E0B',
        'C-7': '#DC2626',
        'C-8': '#6B7280',
        'C-8a': '#6B7280',
        'C-8b': '#4B5563',
        'C-9': '#F97316',
        'C-10': '#A3B820'
      };
      const metroColors: Record<string, string> = {
        '1': '#00A9E0', '2': '#ED1B2F', '3': '#FFD100', '4': '#A0522D',
        '5': '#80BA27', '6': '#7E8082', '7': '#F37021', '8': '#F18EBD',
        '9': '#A11A88', '10': '#003399', '11': '#007A33', '12': '#A4A000', 'R': '#003399'
      };
      const defaultColors: Record<NetworkId, string> = {
        metro: metroColors[lineId] || '#00A9E0',
        cercanias: cercaniasColors[lineId] || '#DC2626',
        emt: '#0284C7',
        interurban: '#16A34A'
      };
      this.selectedLine.set({
        network,
        line: lineId,
        name: `Línea ${lineId}`,
        color: defaultColors[network]
      });
    }
  }

  clearSelectedLine(): void {
    this.selectedLine.set(null);
  }

  openMobileDrawer(tab: 'layers' | 'zones' | 'detail'): void {
    this.mobileDrawerTab.set(tab);
  }

  closeMobileDrawer(): void {
    this.mobileDrawerTab.set('none');
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
    this.setNetworkVisibility(result.network, true);
    this.selectStation({
      id: result.id,
      name: result.name,
      network: result.network,
      lines: result.lines,
      zone: result.zone,
      coordinates: result.coordinates
    });
    this.flyTo(result.coordinates, 15);
    this.clearSearch();
    this.openMobileDrawer('detail');
  }

  registerStations(stations: TransitStopProperties[]): void {
    this.stationsRegistry.update((existing) => {
      const existingIds = new Set(existing.map((s) => s.id));
      const toAdd = stations.filter((s) => !existingIds.has(s.id));
      return [...existing, ...toAdd];
    });
  }

  registerLines(lines: SelectedLineInfo[]): void {
    this.linesRegistry.update((map) => {
      const next = new Map(map);
      for (const line of lines) {
        next.set(`${line.network}:${line.line}`, line);
      }
      return next;
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
      const lines: SelectedLineInfo[] = [];

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
        } else if ((f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString') && f.properties?.['type'] === 'line') {
          lines.push({
            network: 'metro',
            line: f.properties['line'],
            name: f.properties['name'] || `Línea ${f.properties['line']}`,
            color: f.properties['color'] || '#00A9E0',
            coordinates: (f.geometry.coordinates?.[0] || f.geometry.coordinates) as [number, number][]
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
        } else if ((f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString') && f.properties?.['type'] === 'line') {
          lines.push({
            network: 'cercanias',
            line: f.properties['line'],
            name: f.properties['name'] || `Línea ${f.properties['line']}`,
            color: f.properties['color'] || '#E4002B',
            coordinates: (f.geometry.coordinates?.[0] || f.geometry.coordinates) as [number, number][]
          });
        }
      }

      this.registerStations(stops);
      this.registerLines(lines);
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
      const lines: SelectedLineInfo[] = [];

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
        } else if ((f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString') && f.properties?.['type'] === 'line') {
          lines.push({
            network,
            line: f.properties['line'],
            name: f.properties['name'] || `Línea ${f.properties['line']}`,
            color: f.properties['color'] || (network === 'emt' ? '#0284C7' : '#16A34A'),
            coordinates: (f.geometry.coordinates?.[0] || f.geometry.coordinates) as [number, number][]
          });
        }
      }

      this.registerStations(stops);
      this.registerLines(lines);
      this.setError(null);
      return data;
    } catch {
      this.setError(`Failed to load ${network.toUpperCase()} bus network dataset. Please try again.`);
      return null;
    }
  }
}
