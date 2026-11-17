export type TariffZoneCode = 'A' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'E1' | 'E2';
export type NetworkId = 'metro' | 'cercanias' | 'emt' | 'interurban';

/**
 * Tariff zone data. Display copy (zone names and coverage descriptions) lives
 * in the `madrid-transport-map.zones.*` translation keys, therefore this model
 * only carries the stable identifiers, colours and fares.
 */
export interface TariffZoneInfo {
  code: TariffZoneCode;
  color: string;
  monthlyPassPriceEur: number;
  nominalMonthlyPriceEur?: number;
  tenTripPriceEur: number;
  nominalTenTripPriceEur?: number;
}

export interface TransitStopProperties {
  id: string;
  name: string;
  network: NetworkId;
  lines: string[];
  zone: TariffZoneCode;
  wheelchairAccessible?: boolean;
  corridor?: string;
  coordinates?: [number, number];
}

export interface LayerVisibilityState {
  networks: Record<NetworkId, boolean>;
  showZones: boolean;
  zoneOpacity: number; // 0.05 to 0.8
}

export interface ActiveSelection {
  type: 'station' | 'zone';
  data: TransitStopProperties | TariffZoneInfo;
  coordinates?: [number, number];
}

export interface SelectedLineInfo {
  network: NetworkId;
  line: string;
  name: string;
  color: string;
  coordinates?: [number, number][];
  stationsCount?: number;
}

export interface SearchResultItem {
  id: string;
  name: string;
  network: NetworkId;
  zone: TariffZoneCode;
  lines: string[];
  coordinates: [number, number];
  type: 'station';
}

/**
 * Visual identity of a transit network. The translated name and short name are
 * resolved from the `madrid-transport-map.networks.*` keys.
 */
export interface NetworkMeta {
  id: NetworkId;
  color: string;
  badgeClass: string;
  icon: string;
}

export const NETWORK_METAS: Record<NetworkId, NetworkMeta> = {
  metro: {
    id: 'metro',
    color: '#00A9E0',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    icon: 'train-track'
  },
  cercanias: {
    id: 'cercanias',
    color: '#E4002B',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
    icon: 'train-track'
  },
  emt: {
    id: 'emt',
    color: '#0284C7',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: 'bus'
  },
  interurban: {
    id: 'interurban',
    color: '#16A34A',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: 'bus'
  }
};

export const TARIFF_ZONES: Record<TariffZoneCode, TariffZoneInfo> = {
  A: {
    code: 'A',
    color: '#2563EB',
    monthlyPassPriceEur: 32.70,
    nominalMonthlyPriceEur: 54.60,
    tenTripPriceEur: 7.30,
    nominalTenTripPriceEur: 12.20
  },
  B1: {
    code: 'B1',
    color: '#059669',
    monthlyPassPriceEur: 38.20,
    nominalMonthlyPriceEur: 63.70,
    tenTripPriceEur: 8.70,
    nominalTenTripPriceEur: 14.50
  },
  B2: {
    code: 'B2',
    color: '#10B981',
    monthlyPassPriceEur: 43.20,
    nominalMonthlyPriceEur: 72.00,
    tenTripPriceEur: 10.20,
    nominalTenTripPriceEur: 17.00
  },
  B3: {
    code: 'B3',
    color: '#D97706',
    monthlyPassPriceEur: 49.20,
    nominalMonthlyPriceEur: 82.00,
    tenTripPriceEur: 12.00,
    nominalTenTripPriceEur: 20.00
  },
  C1: {
    code: 'C1',
    color: '#EA580C',
    monthlyPassPriceEur: 49.20,
    nominalMonthlyPriceEur: 89.50,
    tenTripPriceEur: 14.10,
    nominalTenTripPriceEur: 23.50
  },
  C2: {
    code: 'C2',
    color: '#DC2626',
    monthlyPassPriceEur: 49.20,
    nominalMonthlyPriceEur: 99.30,
    tenTripPriceEur: 15.90,
    nominalTenTripPriceEur: 26.50
  },
  E1: {
    code: 'E1',
    color: '#7C3AED',
    monthlyPassPriceEur: 66.35,
    nominalMonthlyPriceEur: 110.60,
    tenTripPriceEur: 18.60,
    nominalTenTripPriceEur: 31.00
  },
  E2: {
    code: 'E2',
    color: '#9333EA',
    monthlyPassPriceEur: 79.05,
    nominalMonthlyPriceEur: 131.80,
    tenTripPriceEur: 22.80,
    nominalTenTripPriceEur: 38.00
  }
};

export type BasemapType = 'streets' | 'satellite' | 'gray';

/**
 * Basemap tile configuration. The translated labels come from the
 * `madrid-transport-map.basemaps.*` keys; the attribution is a legal credit and
 * intentionally stays in English in both languages.
 */
export interface BasemapOption {
  id: BasemapType;
  icon: string;
  tiles: string[];
  attribution: string;
}

export const BASEMAP_CONFIGS: Record<BasemapType, BasemapOption> = {
  streets: {
    id: 'streets',
    icon: 'map',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
    ],
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom'
  },
  satellite: {
    id: 'satellite',
    icon: 'globe',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    ],
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics'
  },
  gray: {
    id: 'gray',
    icon: 'layers',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    ],
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
  }
};

export const ZONE_CENTERS: Record<TariffZoneCode, { coordinates: [number, number]; zoom: number }> = {
  A: { coordinates: [-3.7038, 40.4168], zoom: 12 },
  B1: { coordinates: [-3.68, 40.46], zoom: 11 },
  B2: { coordinates: [-3.76, 40.38], zoom: 10.5 },
  B3: { coordinates: [-3.60, 40.42], zoom: 10 },
  C1: { coordinates: [-3.70, 40.25], zoom: 9.5 },
  C2: { coordinates: [-3.85, 40.75], zoom: 9 },
  E1: { coordinates: [-3.25, 40.55], zoom: 9 },
  E2: { coordinates: [-4.02, 39.95], zoom: 8.5 }
};
