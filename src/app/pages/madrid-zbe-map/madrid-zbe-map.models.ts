export type ZbeZoneId =
  | 'zbe-distrito-centro'
  | 'zbe-plaza-eliptica'
  | 'zbe-interior-m30'
  | 'zbe-municipio'
  | 'zbe-getafe'
  | 'zbe-fuenlabrada'
  | 'zbe-alcorcon'
  | 'zbe-alcala'
  | 'zbe-alcobendas'
  | 'zbe-mostoles'
  | 'zbe-parla'
  | 'zbe-rivas';

export type ZbeCategory = 'especial-proteccion' | 'm30' | 'municipal' | 'metropolitana';

export type DgtBadge = 'cero' | 'eco' | 'c' | 'b' | 'a';

export type VehicleType = 'car' | 'motorcycle' | 'van';

export type ResidentStatus = 'non-resident' | 'madrid-resident' | 'zone-resident';

export type DestinationPurpose = 'transit' | 'public-parking' | 'ser-street';

export type BasemapType = 'streets' | 'satellite' | 'gray';

export interface ZbeZoneProperties {
  id: ZbeZoneId;
  code: string;
  name: string;
  shortName: string;
  category: ZbeCategory;
  color: string;
  fillOpacity: number;
  areaKm2: number;
  restrictionLevel: string;
  description: string;
  dgtRules: Record<DgtBadge, string>;
  sanctionEur: number;
  lawReference: string;
  center?: [number, number];
  zoom?: number;
}

export interface ZbeCameraProperties {
  id: string;
  type: 'camera';
  category: string;
  zoneId: ZbeZoneId;
  zoneName: string;
  name: string;
  location: string;
  direction: string;
  model: string;
  monitoredRules: string;
  status: string;
  lanes?: number;
  devicesCount?: number;
  coordinates: [number, number];
}

export interface ZbeParkingProperties {
  id: string;
  type: 'parking';
  category: string;
  zoneId?: ZbeZoneId;
  zoneName?: string;
  name: string;
  shortName: string;
  address: string;
  capacity: number;
  electricSpots: number;
  pmrSpots: number;
  transitConnections: string;
  feeDescription: string;
  hours: string;
  managedBy: string;
  coordinates: [number, number];
}

export interface ActiveZbeSelection {
  type: 'zone' | 'camera' | 'parking';
  data: ZbeZoneProperties | ZbeCameraProperties | ZbeParkingProperties;
  coordinates?: [number, number];
}

export interface ZbeLayerVisibilityState {
  zones: Record<ZbeZoneId, boolean>;
  showCameras: boolean;
  showParkings: boolean;
  zoneOpacity: number; // 0.10 to 0.80
}

export interface SearchResultItem {
  id: string;
  name: string;
  subtitle: string;
  type: 'zone' | 'camera' | 'parking';
  coordinates: [number, number];
  zoom?: number;
  badge?: string;
  badgeColor?: string;
}

export interface DgtBadgeMeta {
  badge: DgtBadge;
  name: string;
  label: string;
  colorHex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
  description: string;
}

export interface DgtSimulationResult {
  zoneId: ZbeZoneId;
  zoneName: string;
  allowed: 'yes' | 'conditional' | 'no';
  title: string;
  message: string;
  serParkingAllowed: boolean;
  serMaxHours?: number;
  fineRisk: boolean;
}

export const DGT_BADGES_META: Record<DgtBadge, DgtBadgeMeta> = {
  cero: {
    badge: 'cero',
    name: '0 Emisiones',
    label: 'CERO',
    colorHex: '#0284C7',
    bgClass: 'bg-sky-500',
    borderClass: 'border-sky-500',
    textClass: 'text-sky-600',
    badgeClass: 'bg-sky-600 text-white font-bold',
    description: 'Vehículos 100% eléctricos (BEV), híbridos enchufables (PHEV) con autonomía ≥ 40 km y pila de combustible.'
  },
  eco: {
    badge: 'eco',
    name: 'ECO',
    label: 'ECO',
    colorHex: '#059669',
    bgClass: 'bg-emerald-500',
    borderClass: 'border-emerald-500',
    textClass: 'text-emerald-600',
    badgeClass: 'bg-emerald-600 text-white font-bold',
    description: 'Híbridos no enchufables (HEV), enchufables con < 40 km, microhíbridos (MHEV) y vehículos a gas (GLP/GNC).'
  },
  c: {
    badge: 'c',
    name: 'Distintivo C',
    label: 'C (Verde)',
    colorHex: '#16A34A',
    bgClass: 'bg-green-600',
    borderClass: 'border-green-600',
    textClass: 'text-green-600',
    badgeClass: 'bg-green-600 text-white font-bold',
    description: 'Turismos y furgonetas ligeras de gasolina matriculados a partir de enero 2006 (Euro 4, 5, 6) y diésel desde septiembre 2015 (Euro 6).'
  },
  b: {
    badge: 'b',
    name: 'Distintivo B',
    label: 'B (Amarilla)',
    colorHex: '#EAB308',
    bgClass: 'bg-amber-400',
    borderClass: 'border-amber-400',
    textClass: 'text-amber-600',
    badgeClass: 'bg-amber-500 text-white font-bold',
    description: 'Turismos de gasolina matriculados entre enero 2001 y 2005 (Euro 3), y diésel matriculados entre 2006 y agosto 2015 (Euro 4 y 5).'
  },
  a: {
    badge: 'a',
    name: 'Sin Distintivo (A)',
    label: 'Sin Etiqueta (A)',
    colorHex: '#DC2626',
    bgClass: 'bg-red-600',
    borderClass: 'border-red-600',
    textClass: 'text-red-600',
    badgeClass: 'bg-red-600 text-white font-bold',
    description: 'Vehículos más contaminantes: gasolina anteriores a 2001 (anteriores a Euro 3) y diésel anteriores a 2006 (anteriores a Euro 4).'
  }
};

export const ZBE_ZONES_META: Record<ZbeZoneId, ZbeZoneProperties> = {
  'zbe-distrito-centro': {
    id: 'zbe-distrito-centro',
    code: 'ZBEDEP_CENTRO',
    name: 'ZBEDEP Distrito Centro (Madrid Central)',
    shortName: 'Distrito Centro',
    category: 'especial-proteccion',
    color: '#EF4444',
    fillOpacity: 0.38,
    areaKm2: 4.7,
    restrictionLevel: 'Máxima Restricción',
    description:
      'Zona de Bajas Emisiones de Especial Protección en el corazón histórico de Madrid. Reglas estrictas de acceso por distintivo ambiental y aparcamiento obligatorio.',
    dgtRules: {
      cero: 'Libre acceso y estacionamiento libre en superficie (SER) sin coste ni límite de horario.',
      eco: 'Libre acceso. Estacionamiento en superficie (SER) durante un máximo de 2 horas o en aparcamientos subterráneos.',
      c: 'Solo pueden acceder si se estaciona en un parking de uso público/privado concertado o con invitación de residente.',
      b: 'Solo pueden acceder si se estaciona en un parking de uso público/privado concertado o con invitación de residente.',
      a: 'Acceso totalmente prohibido salvo residentes empadronados antes de 2021, PMR y servicios de emergencia.'
    },
    sanctionEur: 200,
    lawReference: 'Ordenanza de Movilidad Sostenible (OMS) art. 23',
    center: [-3.7038, 40.4168],
    zoom: 13.5
  },
  'zbe-plaza-eliptica': {
    id: 'zbe-plaza-eliptica',
    code: 'ZBEDEP_ELIPTICA',
    name: 'ZBEDEP Plaza Elíptica',
    shortName: 'Plaza Elíptica',
    category: 'especial-proteccion',
    color: '#F59E0B',
    fillOpacity: 0.35,
    areaKm2: 0.33,
    restrictionLevel: 'Muy Alto (Especial Protección)',
    description:
      'Zona de Bajas Emisiones de Especial Protección centrada en el histórico punto de emisiones de Usera y Carabanchel alrededor de la A-42.',
    dgtRules: {
      cero: 'Libre circulación y estacionamiento sin restricciones específicas de ZBE.',
      eco: 'Libre circulación y estacionamiento sin restricciones específicas de ZBE.',
      c: 'Libre circulación y estacionamiento sin restricciones específicas de ZBE.',
      b: 'Libre circulación y estacionamiento sin restricciones específicas de ZBE.',
      a: 'Acceso totalmente prohibido las 24 horas a vehículos A (sin distintivo), salvo residentes empadronados o traslados de PMR.'
    },
    sanctionEur: 200,
    lawReference: 'Ordenanza de Movilidad Sostenible (OMS) art. 24',
    center: [-3.7188, 40.3848],
    zoom: 15
  },
  'zbe-interior-m30': {
    id: 'zbe-interior-m30',
    code: 'M30_INTERIOR',
    name: 'Madrid ZBE - Interior M-30',
    shortName: 'Interior M-30',
    category: 'm30',
    color: '#8B5CF6',
    fillOpacity: 0.22,
    areaKm2: 41.5,
    restrictionLevel: 'Alto (Vehículos A & M-30)',
    description:
      'Área delimitada por el anillo de la autovía M-30 que comprende los 7 distritos centrales de la capital.',
    dgtRules: {
      cero: 'Acceso libre y estacionamiento SER sin límite de tiempo.',
      eco: 'Acceso libre. Estacionamiento SER ordinario con bonificación tarifaria.',
      c: 'Acceso libre. Estacionamiento SER ordinario.',
      b: 'Acceso libre. Estacionamiento SER ordinario.',
      a: 'Prohibida la circulación por la M-30 y calles interiores para turismos sin distintivo ambiental no domiciliados en Madrid.'
    },
    sanctionEur: 200,
    lawReference: 'Ordenanza de Movilidad Sostenible (OMS) art. 21',
    center: [-3.695, 40.43],
    zoom: 12
  },
  'zbe-municipio': {
    id: 'zbe-municipio',
    code: 'MUNICIPIO',
    name: 'Madrid ZBE (Término Municipal Completo)',
    shortName: 'Madrid ZBE Global',
    category: 'municipal',
    color: '#3B82F6',
    fillOpacity: 0.15,
    areaKm2: 604.3,
    restrictionLevel: 'Moderado (Vehículos A)',
    description:
      'Zona de Bajas Emisiones que abarca la totalidad del término municipal de Madrid (los 21 distritos de la capital).',
    dgtRules: {
      cero: 'Acceso y estacionamiento permitidos sin restricción.',
      eco: 'Acceso y estacionamiento permitidos sin restricción.',
      c: 'Acceso y estacionamiento permitidos sin restricción.',
      b: 'Acceso y estacionamiento permitidos sin restricción.',
      a: 'Prohibido el acceso y circulación si el vehículo no está domiciliado en Madrid capital y no abona el IVTM en el Ayuntamiento.'
    },
    sanctionEur: 200,
    lawReference: 'Ordenanza de Movilidad Sostenible (OMS) art. 21 y Ley sobre Tráfico',
    center: [-3.7038, 40.4168],
    zoom: 10.5
  },
  'zbe-getafe': {
    id: 'zbe-getafe',
    code: 'ZBE_GETAFE',
    name: 'ZBE Centro de Getafe',
    shortName: 'Getafe Centro',
    category: 'metropolitana',
    color: '#10B981',
    fillOpacity: 0.32,
    areaKm2: 1.1,
    restrictionLevel: 'Regulada (CERO/ECO libre, B/C con destino o residentes)',
    description:
      'Zona de Bajas Emisiones del centro urbano y casco histórico de Getafe delimitada por C/ Toledo, Sur, Ferrocarril y Juan de la Cierva.',
    dgtRules: {
      cero: 'Libre acceso y estacionamiento sin restricciones.',
      eco: 'Libre acceso y estacionamiento sin restricciones.',
      c: 'Acceso permitido a residentes empadronados, vehículos con destino a parkings o autorizaciones.',
      b: 'Acceso permitido a residentes empadronados, vehículos con destino a parkings o autorizaciones.',
      a: 'Prohibido el acceso y circulación salvo residentes empadronados y PMR autorizados.'
    },
    sanctionEur: 200,
    lawReference: 'Ordenanza Reguladora ZBE de Getafe (BOCM enero 2025)',
    center: [-3.731, 40.308],
    zoom: 14.5
  },
  'zbe-fuenlabrada': {
    id: 'zbe-fuenlabrada',
    code: 'ZBE_FUENLABRADA',
    name: 'ZBE Distrito Centro de Fuenlabrada',
    shortName: 'Fuenlabrada Centro',
    category: 'metropolitana',
    color: '#06B6D4',
    fillOpacity: 0.3,
    areaKm2: 0.85,
    restrictionLevel: 'Regulada (Empadronados y B/C/ECO/CERO)',
    description:
      'Zona de Bajas Emisiones del Distrito Centro de Fuenlabrada con exención general para vehículos censados en el municipio.',
    dgtRules: {
      cero: 'Libre acceso y circulación sin restricciones.',
      eco: 'Libre acceso y circulación sin restricciones.',
      c: 'Acceso permitido a residentes y vehículos con destino o estancia justificada en el área.',
      b: 'Acceso permitido a residentes y vehículos con destino o estancia justificada en el área.',
      a: 'Restricción general de paso para vehículos sin distintivo no empadronados en Fuenlabrada.'
    },
    sanctionEur: 200,
    lawReference: 'Ordenanza de Movilidad Sostenible y ZBE de Fuenlabrada',
    center: [-3.792, 40.282],
    zoom: 14.5
  },
  'zbe-alcorcon': {
    id: 'zbe-alcorcon',
    code: 'ZBE_ALCORCON',
    name: 'ZBE Casco Antiguo de Alcorcón',
    shortName: 'Alcorcón Centro',
    category: 'metropolitana',
    color: '#EC4899',
    fillOpacity: 0.3,
    areaKm2: 0.95,
    restrictionLevel: 'Regulada (Tráfico de paso sin etiqueta)',
    description:
      'Zona de Bajas Emisiones del casco urbano de Alcorcón protegiendo el entorno comercial y peatonal de Calle Mayor y Plaza de España.',
    dgtRules: {
      cero: 'Libre acceso y estacionamiento sin restricciones.',
      eco: 'Libre acceso y estacionamiento sin restricciones.',
      c: 'Acceso libre a empadronados y vehículos con destino a la zona.',
      b: 'Acceso libre a empadronados y vehículos con destino a la zona.',
      a: 'Restricción de tráfico de paso para vehículos sin distintivo ambiental no empadronados.'
    },
    sanctionEur: 200,
    lawReference: 'Ordenanza Municipal de la ZBE de Alcorcón',
    center: [-3.832, 40.346],
    zoom: 14.5
  },
  'zbe-alcala': {
    id: 'zbe-alcala',
    code: 'ZBE_ALCALA',
    name: 'ZBE Casco Histórico de Alcalá de Henares',
    shortName: 'Alcalá Histórico',
    category: 'metropolitana',
    color: '#E11D48',
    fillOpacity: 0.32,
    areaKm2: 0.78,
    restrictionLevel: 'Control Dinámico (Por Episodios de NO₂)',
    description:
      'ZBE en el Casco Histórico Patrimonio de la Humanidad. Las restricciones se activan automáticamente en episodios de contaminación elevada.',
    dgtRules: {
      cero: 'Libre acceso y circulación sin restricciones en todo momento.',
      eco: 'Libre acceso y circulación sin restricciones en todo momento.',
      c: 'Libre circulación ordinaria; restricciones solo en episodios severos de contaminación.',
      b: 'Libre circulación ordinaria; restricciones solo en episodios severos de contaminación.',
      a: 'Libre circulación ordinaria salvo activación de protocolo por superación de 180 µg/m³ de NO₂.'
    },
    sanctionEur: 200,
    lawReference: 'Ordenanza Reguladora de la ZBE de Alcalá de Henares (BOCM 2025)',
    center: [-3.366, 40.482],
    zoom: 14.5
  },
  'zbe-alcobendas': {
    id: 'zbe-alcobendas',
    code: 'ZBE_ALCOBENDAS',
    name: 'ZBE Distrito Centro de Alcobendas',
    shortName: 'Alcobendas Centro',
    category: 'metropolitana',
    color: '#6366F1',
    fillOpacity: 0.3,
    areaKm2: 0.65,
    restrictionLevel: 'Regulada (CERO/ECO/C/B libre, A restringido)',
    description:
      'Zona de Bajas Emisiones del núcleo histórico y comercial de Alcobendas en torno a Marquesa Viuda de Aldama y Av. de España.',
    dgtRules: {
      cero: 'Libre acceso y circulación sin restricciones.',
      eco: 'Libre acceso y circulación sin restricciones.',
      c: 'Libre acceso y circulación sin restricciones.',
      b: 'Libre acceso y circulación sin restricciones.',
      a: 'Prohibición de circulación a vehículos sin distintivo ambiental no empadronados.'
    },
    sanctionEur: 200,
    lawReference: 'Ordenanza Reguladora de la ZBE de Alcobendas',
    center: [-3.634, 40.54],
    zoom: 14.5
  },
  'zbe-mostoles': {
    id: 'zbe-mostoles',
    code: 'ZBE_MOSTOLES',
    name: 'ZBE Área 20 Almendra Central de Móstoles',
    shortName: 'Móstoles Centro',
    category: 'metropolitana',
    color: '#6366F1',
    fillOpacity: 0.32,
    areaKm2: 0.72,
    restrictionLevel: 'Área 20 Residencial (Restricción vehículos sin distintivo)',
    description:
      'Zona de Bajas Emisiones y pacificación de tráfico sobre el perímetro del Área 20 de Móstoles (C/ Cristo, Juan XXIII, Reyes Católicos, Ricardo Medem).',
    dgtRules: {
      cero: 'Libre circulación y estacionamiento sin restricciones.',
      eco: 'Libre circulación y estacionamiento sin restricciones.',
      c: 'Libre acceso a aparcamientos y residentes; libre circulación por el anillo perimetral.',
      b: 'Libre acceso a aparcamientos y residentes; libre circulación por el anillo perimetral.',
      a: 'Restricción de paso al interior de la almendra central salvo residentes empadronados y PMR.'
    },
    sanctionEur: 200,
    lawReference: 'Ordenanza de Tráfico y Movilidad de Móstoles',
    center: [-3.864, 40.324],
    zoom: 14.5
  },
  'zbe-parla': {
    id: 'zbe-parla',
    code: 'ZBE_PARLA',
    name: 'ZBE Casco Antiguo de Parla',
    shortName: 'Parla Centro',
    category: 'metropolitana',
    color: '#A855F7',
    fillOpacity: 0.3,
    areaKm2: 0.88,
    restrictionLevel: 'Regulada (BOCM 2024/2025)',
    description:
      'Zona de Bajas Emisiones del casco histórico y comercial de Parla regulando el acceso en torno a Calle Real, Calle Pinto y Calle Torrejón.',
    dgtRules: {
      cero: 'Libre acceso y estacionamiento sin restricciones.',
      eco: 'Libre acceso y estacionamiento sin restricciones.',
      c: 'Acceso permitido a residentes, parkings y autorizaciones comerciales.',
      b: 'Acceso permitido a residentes, parkings y autorizaciones comerciales.',
      a: 'Prohibida la circulación al interior salvo residentes empadronados y vehículos esenciales.'
    },
    sanctionEur: 200,
    lawReference: 'Ordenanza Reguladora ZBE Parla (BOCM 20240424-72)',
    center: [-3.774, 40.237],
    zoom: 14.5
  },
  'zbe-rivas': {
    id: 'zbe-rivas',
    code: 'ZBE_RIVAS',
    name: 'ZBE Rivas-Vaciamadrid',
    shortName: 'Rivas ZBE',
    category: 'metropolitana',
    color: '#84CC16',
    fillOpacity: 0.28,
    areaKm2: 0.9,
    restrictionLevel: 'Regulada (Entornos escolares y centro)',
    description:
      'Zona de Bajas Emisiones de Rivas protegiendo entornos escolares y ejes residenciales de alta afluencia peatonal.',
    dgtRules: {
      cero: 'Libre acceso sin restricciones.',
      eco: 'Libre acceso sin restricciones.',
      c: 'Acceso regulado prioritario.',
      b: 'Acceso regulado prioritario.',
      a: 'Control de paso y limitación horaria en entornos escolares señalizados.'
    },
    sanctionEur: 200,
    lawReference: 'Plan de Movilidad Escolar Sostenible y ZBE de Rivas',
    center: [-3.529, 40.353],
    zoom: 14
  }
};
