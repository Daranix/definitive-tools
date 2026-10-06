export type TariffZoneCode = 'A' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'E1' | 'E2';
export type NetworkId = 'metro' | 'cercanias' | 'emt' | 'interurban';

export interface TariffZoneInfo {
  code: TariffZoneCode;
  name: string;
  color: string;
  monthlyPassPriceEur: number;
  tenTripPriceEur: number;
  coverageDescription: string;
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

export interface NetworkMeta {
  id: NetworkId;
  name: string;
  shortName: string;
  description: string;
  color: string;
  badgeClass: string;
  icon: string;
}

export const NETWORK_METAS: Record<NetworkId, NetworkMeta> = {
  metro: {
    id: 'metro',
    name: 'Metro de Madrid',
    shortName: 'Metro',
    description: 'Underground rapid transit network covering capital and metropolitan ring',
    color: '#00A9E0',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    icon: 'train-track'
  },
  cercanias: {
    id: 'cercanias',
    name: 'Cercanías Renfe',
    shortName: 'Cercanías',
    description: 'Regional suburban commuter rail across Madrid and Castilla-La Mancha',
    color: '#E4002B',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
    icon: 'train-track'
  },
  emt: {
    id: 'emt',
    name: 'EMT Madrid (Autobuses)',
    shortName: 'EMT',
    description: 'Municipal surface bus network operating across Madrid capital (Zone A)',
    color: '#0284C7',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: 'bus'
  },
  interurban: {
    id: 'interurban',
    name: 'Autobuses Interurbanos',
    shortName: 'Interurbanos',
    description: 'Green suburban regional buses connecting outer municipalities and crowns',
    color: '#16A34A',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: 'bus'
  }
};

export const TARIFF_ZONES: Record<TariffZoneCode, TariffZoneInfo> = {
  A: {
    code: 'A',
    name: 'Zona A',
    color: '#2563EB',
    monthlyPassPriceEur: 54.60,
    tenTripPriceEur: 12.20,
    coverageDescription: 'Madrid capital central municipality (Sol, Atocha, Chamartín, Barajas, Vallecas, Carabanchel)'
  },
  B1: {
    code: 'B1',
    name: 'Zona B1',
    color: '#059669',
    monthlyPassPriceEur: 63.70,
    tenTripPriceEur: 14.50,
    coverageDescription: 'First metropolitan crown (Alcobendas, San Sebastián de los Reyes, Pozuelo, Majadahonda, Coslada, San Fernando, Getafe, Leganés, Alcorcón)'
  },
  B2: {
    code: 'B2',
    name: 'Zona B2',
    color: '#10B981',
    monthlyPassPriceEur: 72.00,
    tenTripPriceEur: 17.00,
    coverageDescription: 'Second metropolitan crown (Las Rozas, Móstoles, Fuenlabrada, Parla, Pinto, Rivas-Vaciamadrid, Torrejón de Ardoz, Tres Cantos)'
  },
  B3: {
    code: 'B3',
    name: 'Zona B3',
    color: '#D97706',
    monthlyPassPriceEur: 82.00,
    tenTripPriceEur: 20.00,
    coverageDescription: 'Third metropolitan ring (Alcalá de Henares, Colmenar Viejo, Collado Villalba, Valdemoro, Navalcarnero, Arganda del Rey, Arroyomolinos)'
  },
  C1: {
    code: 'C1',
    name: 'Zona C1',
    color: '#EA580C',
    monthlyPassPriceEur: 89.50,
    tenTripPriceEur: 23.50,
    coverageDescription: 'Outer metropolitan region (Aranjuez, El Escorial, Guadarrama, Chinchón, San Martín de Valdeiglesias, Buitrago del Lozoya)'
  },
  C2: {
    code: 'C2',
    name: 'Zona C2',
    color: '#DC2626',
    monthlyPassPriceEur: 99.30,
    tenTripPriceEur: 26.50,
    coverageDescription: 'Border municipalities of Community of Madrid (Cercedilla, Santa María de la Alameda, Puebla de la Sierra)'
  },
  E1: {
    code: 'E1',
    name: 'Zona E1',
    color: '#7C3AED',
    monthlyPassPriceEur: 110.60,
    tenTripPriceEur: 31.00,
    coverageDescription: 'Castilla-La Mancha adjacent corridor (Guadalajara, Azuqueca de Henares, Illescas)'
  },
  E2: {
    code: 'E2',
    name: 'Zona E2',
    color: '#9333EA',
    monthlyPassPriceEur: 131.80,
    tenTripPriceEur: 38.00,
    coverageDescription: 'Castilla-La Mancha extended corridor (Talavera de la Reina, Toledo capital, Tarancón)'
  }
};

export type BasemapType = 'streets' | 'satellite' | 'gray';

export interface BasemapOption {
  id: BasemapType;
  name: string;
  shortName: string;
  icon: string;
  tiles: string[];
  attribution: string;
}

export const BASEMAP_CONFIGS: Record<BasemapType, BasemapOption> = {
  streets: {
    id: 'streets',
    name: 'Street View',
    shortName: 'Street',
    icon: 'map',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
    ],
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom'
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite View',
    shortName: 'Satellite',
    icon: 'globe',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    ],
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics'
  },
  gray: {
    id: 'gray',
    name: 'Light Canvas',
    shortName: 'Light',
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

