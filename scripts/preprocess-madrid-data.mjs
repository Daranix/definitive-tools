import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import turfUnion from '@turf/union';
import turfDifference from '@turf/difference';
import turfIntersect from '@turf/intersect';
import { polygon, featureCollection } from '@turf/helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const rawDir = path.join(__dirname, 'raw-crtm-data');
const outputDir = path.join(rootDir, 'public', 'maps', 'madrid');

if (!fs.existsSync(rawDir)) {
  fs.mkdirSync(rawDir, { recursive: true });
}
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function round5(num) {
  return Number(num.toFixed(5));
}

function truncateCoords(coords) {
  if (typeof coords[0] === 'number') {
    return [round5(coords[0]), round5(coords[1])];
  }
  return coords.map(truncateCoords);
}

function ringArea(coords) {
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    area += (coords[i + 1][0] - coords[i][0]) * (coords[i + 1][1] + coords[i][1]);
  }
  return area;
}

function ensureCCW(ring) {
  return ringArea(ring) < 0 ? [...ring].reverse() : ring;
}

function ensureCW(ring) {
  return ringArea(ring) > 0 ? [...ring].reverse() : ring;
}

function normalizeStationName(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function fetchCachedJson(cacheFilename, url) {
  const cachePath = path.join(rawDir, cacheFilename);
  if (fs.existsSync(cachePath)) {
    console.log(`Using cached ${cacheFilename}`);
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }
  console.log(`Fetching from CRTM: ${url.slice(0, 85)}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CRTM fetch failed ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  fs.writeFileSync(cachePath, JSON.stringify(data), 'utf8');
  return data;
}

async function fetchPagedFeatures(cacheFilename, baseUrl, maxLimit = 15000) {
  const cachePath = path.join(rawDir, cacheFilename);
  if (fs.existsSync(cachePath)) {
    console.log(`Using cached ${cacheFilename}`);
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }

  console.log(`Fetching paged features from CRTM (${cacheFilename})...`);
  const allFeatures = [];
  const pageSize = 2000;
  let offset = 0;

  while (offset < maxLimit) {
    const pagedUrl = `${baseUrl}&resultOffset=${offset}&resultRecordCount=${pageSize}`;
    const res = await fetch(pagedUrl);
    if (!res.ok) break;
    const data = await res.json();
    if (!data.features || data.features.length === 0) break;
    allFeatures.push(...data.features);
    console.log(`  Fetched ${data.features.length} (total so far: ${allFeatures.length})`);
    if (data.features.length < pageSize) break;
    offset += pageSize;
  }

  const result = { type: 'FeatureCollection', features: allFeatures };
  fs.writeFileSync(cachePath, JSON.stringify(result), 'utf8');
  return result;
}

function perpendicularDistance(point, lineStart, lineEnd) {
  let dx = lineEnd[0] - lineStart[0];
  let dy = lineEnd[1] - lineStart[1];
  const mag = Math.hypot(dx, dy);
  if (mag > 0) {
    dx /= mag;
    dy /= mag;
  }
  const pvx = point[0] - lineStart[0];
  const pvy = point[1] - lineStart[1];
  const pvdot = dx * pvx + dy * pvy;
  const dsx = pvdot * dx;
  const dsy = pvdot * dy;
  const ax = pvx - dsx;
  const ay = pvy - dsy;
  return Math.hypot(ax, ay);
}

function rdp(points, epsilon = 0.00007) {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [points[0], points[points.length - 1]];
  }
}

// ─── HELPER: CHAIN SEGMENTS INTO CONTINUOUS SINGLE LINE ────────────────────────
function chainSegments(tramos, isCircular = false) {
  if (isCircular) {
    const list = [...tramos];
    list.sort((a, b) => (a.properties?.NUMEROORDEN || 0) - (b.properties?.NUMEROORDEN || 0));

    const coords = [];
    for (const item of list) {
      const segCoords = item.geometry?.coordinates;
      if (!Array.isArray(segCoords) || segCoords.length === 0) continue;
      for (let i = 0; i < segCoords.length; i++) {
        const pt = truncateCoords(segCoords[i]);
        if (coords.length === 0) {
          coords.push(pt);
        } else {
          const last = coords[coords.length - 1];
          if (Math.abs(last[0] - pt[0]) > 0.00001 || Math.abs(last[1] - pt[1]) > 0.00001) {
            coords.push(pt);
          }
        }
      }
    }
    // Guarantee 100% closed loop
    if (coords.length > 2) {
      coords.push(coords[0]);
    }
    return { type: 'LineString', coordinates: rdp(coords, 0.00007) };
  }

  // Non-circular lines: group by track/sentido to produce clean continuous line
  const byTrack = new Map();
  for (const t of tramos) {
    const track = `${t.properties?.NUMEROLINEAUSUARIO || ''}_${t.properties?.SENTIDO || '1'}`;
    if (!byTrack.has(track)) byTrack.set(track, []);
    byTrack.get(track).push(t);
  }

  const lines = [];
  for (const [_, list] of byTrack.entries()) {
    list.sort((a, b) => (a.properties?.NUMEROORDEN || 0) - (b.properties?.NUMEROORDEN || 0));
    const coords = [];
    for (const item of list) {
      const segCoords = item.geometry?.coordinates;
      if (!Array.isArray(segCoords) || segCoords.length === 0) continue;
      for (let i = 0; i < segCoords.length; i++) {
        const pt = truncateCoords(segCoords[i]);
        if (coords.length === 0) {
          coords.push(pt);
        } else {
          const last = coords[coords.length - 1];
          if (Math.abs(last[0] - pt[0]) > 0.00001 || Math.abs(last[1] - pt[1]) > 0.00001) {
            coords.push(pt);
          }
        }
      }
    }
    if (coords.length >= 2) {
      lines.push(rdp(coords, 0.00007));
    }
  }

  if (lines.length === 1) {
    return { type: 'LineString', coordinates: lines[0] };
  }
  return { type: 'MultiLineString', coordinates: lines };
}

// ─── 1. TARIFF ZONES (CoronasTarifarias_Vigentes_CRTM) ──────────────────────────
const ZONE_METADATA = {
  'A': {
    color: '#2563EB',
    monthlyPassPriceEur: 32.70,
    nominalMonthlyPriceEur: 54.60,
    tenTripPriceEur: 7.30,
    nominalTenTripPriceEur: 12.20,
    coverageDescription: 'Madrid capital central municipality (Sol, Atocha, Chamartín, Moncloa, Barajas, Vallecas, Carabanchel)'
  },
  'B1': {
    color: '#059669',
    monthlyPassPriceEur: 38.20,
    nominalMonthlyPriceEur: 63.70,
    tenTripPriceEur: 8.70,
    nominalTenTripPriceEur: 14.50,
    coverageDescription: 'First metropolitan crown (Alcobendas, San Sebastián de los Reyes, Pozuelo, Majadahonda, Coslada, San Fernando, Getafe, Leganés, Alcorcón)'
  },
  'B2': {
    color: '#10B981',
    monthlyPassPriceEur: 43.20,
    nominalMonthlyPriceEur: 72.00,
    tenTripPriceEur: 10.20,
    nominalTenTripPriceEur: 17.00,
    coverageDescription: 'Second metropolitan crown (Las Rozas, Móstoles, Fuenlabrada, Parla, Pinto, Rivas-Vaciamadrid, Torrejón de Ardoz, Tres Cantos)'
  },
  'B3': {
    color: '#D97706',
    monthlyPassPriceEur: 49.20,
    nominalMonthlyPriceEur: 82.00,
    tenTripPriceEur: 12.00,
    nominalTenTripPriceEur: 20.00,
    coverageDescription: 'Third metropolitan ring (Alcalá de Henares, Colmenar Viejo, Collado Villalba, Valdemoro, Navalcarnero, Arganda del Rey, Arroyomolinos)'
  },
  'C1': {
    color: '#EA580C',
    monthlyPassPriceEur: 49.20,
    nominalMonthlyPriceEur: 89.50,
    tenTripPriceEur: 14.10,
    nominalTenTripPriceEur: 23.50,
    coverageDescription: 'Outer metropolitan region (Aranjuez, El Escorial, Guadarrama, Chinchón, San Martín de Valdeiglesias, Buitrago del Lozoya)'
  },
  'C2': {
    color: '#DC2626',
    monthlyPassPriceEur: 49.20,
    nominalMonthlyPriceEur: 99.30,
    tenTripPriceEur: 15.90,
    nominalTenTripPriceEur: 26.50,
    coverageDescription: 'Border municipalities of the Community of Madrid (Cercedilla, Santa María de la Alameda, Puebla de la Sierra)'
  },
  'E1': {
    color: '#7C3AED',
    monthlyPassPriceEur: 66.35,
    nominalMonthlyPriceEur: 110.60,
    tenTripPriceEur: 18.60,
    nominalTenTripPriceEur: 31.00,
    coverageDescription: 'Castilla-La Mancha adjacent corridor (Guadalajara, Azuqueca de Henares, Illescas, northern Toledo corridor)'
  },
  'E2': {
    color: '#9333EA',
    monthlyPassPriceEur: 79.05,
    nominalMonthlyPriceEur: 131.80,
    tenTripPriceEur: 22.80,
    nominalTenTripPriceEur: 38.00,
    coverageDescription: 'Castilla-La Mancha extended corridor (Talavera de la Reina, Toledo capital, Tarancón)'
  }
};

async function processTariffZones() {
  console.log('\n--- Processing Tariff Zones (CRTM Coronas) ---');
  const url = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/CoronasTarifarias_Vigentes_CRTM/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson';
  const data = await fetchCachedJson('crtm-coronas.geojson', url);

  const rawFeaturesByCode = new Map();
  for (const f of data.features || []) {
    if (f.properties?.CCORONATAR) {
      rawFeaturesByCode.set(f.properties.CCORONATAR, f);
    }
  }

  // 1. Fetch District 09 (Moncloa - Aravaca) from Geoportal Ayuntamiento de Madrid
  // to ensure legal Zone A covers Aravaca, Valdemarín, El Plantío, and Casaquemada.
  const d09Url = 'https://sigma.madrid.es/hosted/rest/services/CARTOGRAFIA/LIMITES_ADMINISTRATIVOS/MapServer/3/query?where=COD_DIS_TX%3D%2709%27&outFields=*&f=geojson';
  const d09Data = await fetchCachedJson('geoportal-distrito-09.geojson', d09Url);
  const d09Feature = d09Data.features?.[0];

  const rawA = rawFeaturesByCode.get('A');
  const rawB1 = rawFeaturesByCode.get('B1');
  const rawB2 = rawFeaturesByCode.get('B2');
  const rawB3 = rawFeaturesByCode.get('B3');

  // Compute union of CRTM Zone A and District 09
  let aOfficial = rawA;
  if (d09Feature) {
    const polyA = polygon(rawA.geometry.coordinates);
    const poly09 = polygon(d09Feature.geometry.coordinates);
    const unionFn = turfUnion.default || turfUnion;
    aOfficial = unionFn(featureCollection([polyA, poly09])) || rawA;
  }

  // Use topological difference to ensure 0 slivers and 0 overlap:
  // B1 = B1_outer - A
  // B2 = B2_outer - B1_outer
  // B3 = B3_outer - B2_outer
  const polyB1Outer = polygon([rawB1.geometry.coordinates[0]]);
  const polyB2Outer = polygon([rawB2.geometry.coordinates[0]]);
  const polyB3Outer = polygon([rawB3.geometry.coordinates[0]]);

  const diffFn = turfDifference.default || turfDifference;
  const b1Clean = diffFn(featureCollection([polyB1Outer, aOfficial])) || rawB1;
  const b2Clean = diffFn(featureCollection([polyB2Outer, polyB1Outer])) || rawB2;
  const b3Clean = diffFn(featureCollection([polyB3Outer, polyB2Outer])) || rawB3;

  const snappedGeometries = {
    'A': {
      type: aOfficial.geometry.type,
      coordinates: truncateCoords(aOfficial.geometry.coordinates)
    },
    'B1': {
      type: b1Clean.geometry.type,
      coordinates: truncateCoords(b1Clean.geometry.coordinates)
    },
    'B2': {
      type: b2Clean.geometry.type,
      coordinates: truncateCoords(b2Clean.geometry.coordinates)
    },
    'B3': {
      type: b3Clean.geometry.type,
      coordinates: truncateCoords(b3Clean.geometry.coordinates)
    }
  };

  const order = ['A', 'B1', 'B2', 'B3', 'C1', 'C2', 'E1', 'E2'];
  const formattedFeatures = [];

  for (const code of order) {
    const rawFeature = rawFeaturesByCode.get(code);
    if (!rawFeature) continue;

    const meta = ZONE_METADATA[code];
    const geom = snappedGeometries[code] || {
      type: rawFeature.geometry.type,
      coordinates: truncateCoords(rawFeature.geometry.coordinates)
    };

    // 1. Zone Polygon for Fill
    formattedFeatures.push({
      type: 'Feature',
      id: `zone-${code}`,
      geometry: geom,
      properties: {
        type: 'zone',
        code,
        name: `Zona ${code}`,
        color: meta.color,
        monthlyPassPriceEur: meta.monthlyPassPriceEur,
        nominalMonthlyPriceEur: meta.nominalMonthlyPriceEur,
        tenTripPriceEur: meta.tenTripPriceEur,
        nominalTenTripPriceEur: meta.nominalTenTripPriceEur,
        coverageDescription: meta.coverageDescription,
        officialName: rawFeature.properties.NOMBRE,
        source: 'CRTM Official Data'
      }
    });

    // 2. Zone Outer Boundary Line (single stroke per boundary, no double-line overlapping artifacts)
    const outerCoords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
    if (outerCoords && outerCoords.length > 2) {
      formattedFeatures.push({
        type: 'Feature',
        id: `zone-${code}-boundary`,
        geometry: {
          type: 'LineString',
          coordinates: outerCoords
        },
        properties: {
          type: 'boundary',
          code,
          color: meta.color
        }
      });
    }
  }

  const outGeoJson = { type: 'FeatureCollection', features: formattedFeatures };
  fs.writeFileSync(path.join(outputDir, 'zones.geojson'), JSON.stringify(outGeoJson), 'utf8');
  console.log(`Saved zones.geojson with ${formattedFeatures.length} official CRTM zones (topologically snapped).`);
}

// ─── 2. METRO (M4_Red: Estaciones + Tramos) ──────────────────────────────────
const METRO_LINE_CONFIG = {
  '1': { name: 'Línea 1: Pinar de Chamartín - Valdecarros', color: '#00A9E0', order: 1 },
  '2': { name: 'Línea 2: Las Rosas - Cuatro Caminos', color: '#ED1B2F', order: 2 },
  '3': { name: 'Línea 3: Villaverde Alto - Moncloa', color: '#FFD100', order: 3 },
  '4': { name: 'Línea 4: Argüelles - Pinar de Chamartín', color: '#A0522D', order: 4 },
  '5': { name: 'Línea 5: Alameda de Osuna - Casa de Campo', color: '#80BA27', order: 5 },
  '6': { name: 'Línea 6 (Circular)', color: '#7E8082', order: 6, aliases: ['6-1', '6-2'], isCircular: true },
  '7': { name: 'Línea 7: Hospital del Henares - Pitis', color: '#F37021', order: 7, aliases: ['7a', '7b'] },
  '8': { name: 'Línea 8: Nuevos Ministerios - Aeropuerto T4', color: '#F18EBD', order: 8 },
  '9': { name: 'Línea 9: Paco de Lucía - Arganda del Rey', color: '#A11A88', order: 9, aliases: ['9A', '9B'] },
  '10': { name: 'Línea 10: Hospital Infanta Sofía - Puerta del Sur', color: '#003399', order: 10, aliases: ['10a', '10b'] },
  '11': { name: 'Línea 11: Plaza Elíptica - La Fortuna', color: '#007A33', order: 11 },
  '12': { name: 'Línea 12 (MetroSur)', color: '#A4A000', order: 12, aliases: ['12-1', '12-2'], isCircular: true },
  'R': { name: 'Ramal: Ópera - Príncipe Pío', color: '#003399', order: 13 }
};

// ─── 3. CERCANÍAS (M5_Red: Estaciones + Tramos) ──────────────────────────────
// Official Renfe Cercanías Madrid branding colors + parallel layout offsets
const CERCANIAS_LINE_CONFIG = {
  'C-1': { name: 'Línea C-1: Príncipe Pío - Aeropuerto T4', color: '#00A9E0', offset: -4 },
  'C-2': { name: 'Línea C-2: Guadalajara - Chamartín', color: '#15803D', offset: 0 },
  'C-3': { name: 'Línea C-3: Aranjuez - Chamartín', color: '#8A1D7C', offset: -2 },
  'C-4': { name: 'Línea C-4: Parla - Alcobendas / Colmenar Viejo', color: '#003399', isCombined: true, sublines: ['C-4a', 'C-4b'], offset: 2.5 },
  'C-4a': { name: 'Línea C-4a: Parla - Alcobendas-S.S. de los Reyes', color: '#003399', offset: 2.5 },
  'C-4b': { name: 'Línea C-4b: Parla - Colmenar Viejo', color: '#1E1B7D', offset: 3.5 },
  'C-5': { name: 'Línea C-5: Móstoles El Soto - Fuenlabrada / Humanes', color: '#F59E0B', offset: 0 },
  'C-7': { name: 'Línea C-7: Alcalá de Henares - Príncipe Pío', color: '#DC2626', offset: 2 },
  'C-8': { name: 'Línea C-8: Guadalajara - Cercedilla / El Escorial', color: '#6B7280', isCombined: true, sublines: ['C-8a', 'C-8b'], offset: -2.5 },
  'C-8a': { name: 'Línea C-8a: Madrid - El Escorial / Santa María de la Alameda', color: '#6B7280', offset: -2.5 },
  'C-8b': { name: 'Línea C-8b: Madrid - Cercedilla', color: '#4B5563', offset: -3.5 },
  'C-9': { name: 'Línea C-9: Cercedilla - Cotos (Zona Verde)', color: '#F97316', offset: 0 },
  'C-10': { name: 'Línea C-10: Villalba - Aeropuerto T4', color: '#A3B820', offset: 4 }
};

async function processMetroAndCercanias() {
  console.log('\n--- Processing Metro (M4_Red) and Cercanías (M5_Red) ---');
  const metroEstUrl = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M4_Red/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson';
  const metroTramosUrl = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M4_Red/FeatureServer/4/query?where=1%3D1&outFields=*&f=geojson';
  const cercEstUrl = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M5_Red/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson';
  const cercTramosUrl = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M5_Red/FeatureServer/4/query?where=1%3D1&outFields=*&f=geojson';

  const [metroEstData, metroTramosData, cercEstData, cercTramosData] = await Promise.all([
    fetchCachedJson('crtm-metro-estaciones.geojson', metroEstUrl),
    fetchCachedJson('crtm-metro-tramos.geojson', metroTramosUrl),
    fetchCachedJson('crtm-cercanias-estaciones.geojson', cercEstUrl),
    fetchCachedJson('crtm-cercanias-tramos.geojson', cercTramosUrl)
  ]);

  // 1. Identify authentic Cercanías stations and build lookup
  const authenticCercanías = (cercEstData.features || []).filter((s) => {
    const rawLines = s.properties?.LINEAS || '';
    const lines = rawLines.split(',').map((l) => l.trim()).filter(Boolean);
    return lines.length > 0 && lines.some((l) => l.startsWith('C-'));
  });

  const cercaníasNameSet = new Set(
    authenticCercanías.map((s) => normalizeStationName(s.properties?.DENOMINACION))
  );

  // 2. Process METRO: Deduplicate stations by station name so interchange platforms don't overlap!
  const metroStationsByName = new Map();
  for (const s of metroEstData.features || []) {
    const rawName = s.properties?.DENOMINACION || 'Estación de Metro';
    const norm = normalizeStationName(rawName);
    const rawLines = s.properties?.LINEAS || '';
    const lines = rawLines.split(',').map((l) => l.trim()).filter(Boolean);
    const zone = s.properties?.CORONATARIFARIA || 'A';
    const isAccessible = s.properties?.GRADOACCESIBILIDAD === 'T';
    const coords = truncateCoords(s.geometry.coordinates);

    if (!metroStationsByName.has(norm)) {
      metroStationsByName.set(norm, {
        id: `metro-${s.properties?.CODIGOESTACION || s.id}`,
        name: rawName,
        lines: new Set(lines),
        zone,
        wheelchairAccessible: isAccessible,
        coordinates: coords,
        isInterchange: cercaníasNameSet.has(norm)
      });
    } else {
      const existing = metroStationsByName.get(norm);
      for (const l of lines) existing.lines.add(l);
      if (isAccessible) existing.wheelchairAccessible = true;
    }
  }

  const metroFeatures = [];

  // Metro Lines: take ONLY SENTIDO 1 (or 6-1 / 12-1 circular) so lines are NOT drawn as double tracks!
  for (const [lineKey, cfg] of Object.entries(METRO_LINE_CONFIG)) {
    let tramos = [];
    if (cfg.isCircular) {
      tramos = (metroTramosData.features || []).filter((t) =>
        t.properties?.NUMEROLINEAUSUARIO === `${lineKey}-1`
      );
    } else {
      tramos = (metroTramosData.features || []).filter((t) => {
        const raw = t.properties?.NUMEROLINEAUSUARIO;
        const matches = raw === lineKey || cfg.aliases?.includes(raw);
        return matches && t.properties?.SENTIDO === '1';
      });
    }

    if (tramos.length === 0) continue;
    const geom = chainSegments(tramos, cfg.isCircular);
    metroFeatures.push({
      type: 'Feature',
      id: `metro-line-${lineKey}`,
      geometry: geom,
      properties: {
        id: `metro-line-${lineKey}`,
        type: 'line',
        network: 'metro',
        line: lineKey,
        name: cfg.name,
        color: cfg.color
      }
    });
  }

  // Metro Stations: single consolidated station point per name
  for (const s of metroStationsByName.values()) {
    metroFeatures.push({
      type: 'Feature',
      id: s.id,
      geometry: {
        type: 'Point',
        coordinates: s.coordinates
      },
      properties: {
        id: s.id,
        type: 'station',
        network: 'metro',
        name: s.name,
        lines: Array.from(s.lines).sort((a, b) => {
          const na = Number(a) || 999;
          const nb = Number(b) || 999;
          return na - nb || a.localeCompare(b);
        }),
        zone: s.zone,
        wheelchairAccessible: s.wheelchairAccessible,
        isInterchange: s.isInterchange
      }
    });
  }

  fs.writeFileSync(path.join(outputDir, 'metro.geojson'), JSON.stringify({ type: 'FeatureCollection', features: metroFeatures }), 'utf8');
  console.log(`Saved metro.geojson with ${metroFeatures.length} features (${Object.keys(METRO_LINE_CONFIG).length} unified lines, ${metroStationsByName.size} deduplicated stations).`);

  // 3. Process CERCANÍAS: Unified lines with official colors, parallel offsets, and interchange flags
  const cercaníasFeatures = [];

  // Group raw tramos by exact line, filtering SENTIDO 1 to prevent double line rendering
  const tramosByRawLine = new Map();
  for (const t of cercTramosData.features || []) {
    const rawLine = t.properties?.NUMEROLINEAUSUARIO;
    if (!rawLine) continue;
    // Keep Sentido 1 for clean single-track representation
    if (t.properties?.SENTIDO !== '1') continue;

    if (!tramosByRawLine.has(rawLine)) tramosByRawLine.set(rawLine, []);
    tramosByRawLine.get(rawLine).push(t);
  }

  // Create Line features with parallel offsets
  for (const [lineKey, cfg] of Object.entries(CERCANIAS_LINE_CONFIG)) {
    let tramos = [];
    if (cfg.isCombined && cfg.sublines) {
      for (const sub of cfg.sublines) {
        const subTramos = tramosByRawLine.get(sub) || [];
        tramos.push(...subTramos);
      }
    } else {
      tramos = tramosByRawLine.get(lineKey) || [];
    }

    if (tramos.length === 0) continue;
    const geom = chainSegments(tramos);
    cercaníasFeatures.push({
      type: 'Feature',
      id: `cercanias-line-${lineKey}`,
      geometry: geom,
      properties: {
        id: `cercanias-line-${lineKey}`,
        type: 'line',
        network: 'cercanias',
        line: lineKey,
        name: cfg.name,
        color: cfg.color,
        offset: cfg.offset || 0
      }
    });
  }

  // Create Station features with interchange flags
  for (const s of authenticCercanías) {
    const rawName = s.properties?.DENOMINACION || 'Estación de Cercanías';
    const norm = normalizeStationName(rawName);
    const rawLines = s.properties?.LINEAS || '';
    const lines = rawLines.split(',').map((l) => l.trim()).filter(Boolean);
    const stationId = `cercanias-${s.properties?.CODIGOESTACION || s.id}`;

    let zone = s.properties?.CORONATARIFARIA;
    if (!zone) {
      zone = 'C2';
    }

    cercaníasFeatures.push({
      type: 'Feature',
      id: stationId,
      geometry: {
        type: 'Point',
        coordinates: truncateCoords(s.geometry.coordinates)
      },
      properties: {
        id: stationId,
        type: 'station',
        network: 'cercanias',
        name: rawName,
        lines,
        zone,
        wheelchairAccessible: s.properties?.GRADOACCESIBILIDAD === 'T',
        isInterchange: metroStationsByName.has(norm)
      }
    });
  }

  fs.writeFileSync(path.join(outputDir, 'cercanias.geojson'), JSON.stringify({ type: 'FeatureCollection', features: cercaníasFeatures }), 'utf8');
  console.log(`Saved cercanias.geojson with ${cercaníasFeatures.length} features (${Object.keys(CERCANIAS_LINE_CONFIG).length} parallel lines, ${authenticCercanías.length} authentic stations).`);
}

// ─── 4. EMT AUTOBUSES URBANOS (M6_Red) ─────────────────────────────────────────
async function processEmt() {
  console.log('\n--- Processing EMT Buses (M6_Red) ---');
  const estBase = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M6_Red/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson';
  const estData = await fetchPagedFeatures('crtm-emt-estaciones.geojson', estBase, 6000);

  let tramosData;
  const allTramosPath = path.join(rawDir, 'crtm-emt-all-tramos.geojson');
  if (fs.existsSync(allTramosPath)) {
    console.log('Using cached crtm-emt-all-tramos.geojson');
    tramosData = JSON.parse(fs.readFileSync(allTramosPath, 'utf8'));
  } else {
    const keyTramosPath = path.join(rawDir, 'crtm-emt-key-tramos.geojson');
    console.log('Using cached crtm-emt-key-tramos.geojson');
    tramosData = JSON.parse(fs.readFileSync(keyTramosPath, 'utf8'));
  }

  const features = [];

  // Group tramos by line and build route geometries
  const tramosByLine = new Map();
  for (const t of tramosData.features || []) {
    const l = t.properties?.NUMEROLINEAUSUARIO;
    if (!l) continue;
    if (!tramosByLine.has(l)) tramosByLine.set(l, []);
    tramosByLine.get(l).push(t);
  }

  for (const [lineId, tramos] of tramosByLine.entries()) {
    const geom = chainSegments(tramos);
    const color = lineId === '203' ? '#F59E0B' : (lineId.startsWith('00') ? '#10B981' : '#0284C7');
    features.push({
      type: 'Feature',
      id: `emt-line-${lineId}`,
      geometry: geom,
      properties: {
        id: `emt-line-${lineId}`,
        type: 'line',
        network: 'emt',
        line: lineId,
        name: `Línea EMT ${lineId}`,
        color
      }
    });
  }

  // Include ALL EMT stops (4,966 stops across Madrid)
  for (const s of estData.features || []) {
    const rawLines = s.properties?.LINEAS || '';
    const lines = rawLines.split(/[,/ ]+/).map((l) => l.trim()).filter(Boolean);
    const stopId = `emt-stop-${s.properties?.CODIGOESTACION || s.id}`;

    // EMT is the municipal network of Madrid capital (Zone A).
    // All stops inside Madrid (muni '079') belong to Zone A.
    // The few stops extending outside Madrid to Somosaguas (muni '115') are Zone B1.
    // Stops extending to Majadahonda (muni '080') are Zone B2.
    let zone = 'A';
    const muni = s.properties?.CODIGOMUNICIPIO;
    if (muni === '115') {
      zone = 'B1';
    } else if (muni === '080') {
      zone = 'B2';
    } else if (muni === '079') {
      zone = 'A';
    } else {
      zone = s.properties?.CORONATARIFARIA || 'A';
    }

    features.push({
      type: 'Feature',
      id: stopId,
      geometry: {
        type: 'Point',
        coordinates: truncateCoords(s.geometry.coordinates)
      },
      properties: {
        id: stopId,
        type: 'station',
        network: 'emt',
        name: s.properties?.DENOMINACION || 'Parada EMT',
        lines,
        zone,
        wheelchairAccessible: s.properties?.GRADOACCESIBILIDAD === 'T'
      }
    });
  }

  const outGeoJson = { type: 'FeatureCollection', features };
  fs.writeFileSync(path.join(outputDir, 'emt.geojson'), JSON.stringify(outGeoJson), 'utf8');
  console.log(`Saved emt.geojson with ${features.length} features (${tramosByLine.size} lines, ${estData.features?.length} stops).`);
}

// ─── 5. INTERURBAN AUTOBUSES (M8_Red) ─────────────────────────────────────────
async function processInterurban() {
  console.log('\n--- Processing Interurban Buses (M8_Red) ---');
  const estBase = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M8_Red/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson';
  const estData = await fetchPagedFeatures('crtm-interurban-estaciones.geojson', estBase, 10000);

  let tramosData;
  const allTramosPath = path.join(rawDir, 'crtm-interurban-all-tramos.geojson');
  if (fs.existsSync(allTramosPath)) {
    console.log('Using cached crtm-interurban-all-tramos.geojson');
    tramosData = JSON.parse(fs.readFileSync(allTramosPath, 'utf8'));
  } else {
    const keyTramosPath = path.join(rawDir, 'crtm-interurban-key-tramos.geojson');
    console.log('Using cached crtm-interurban-key-tramos.geojson');
    tramosData = JSON.parse(fs.readFileSync(keyTramosPath, 'utf8'));
  }

  const features = [];

  // Group tramos by line and build route geometries
  const tramosByLine = new Map();
  for (const t of tramosData.features || []) {
    const l = t.properties?.NUMEROLINEAUSUARIO;
    if (!l) continue;
    if (!tramosByLine.has(l)) tramosByLine.set(l, []);
    tramosByLine.get(l).push(t);
  }

  for (const [lineId, tramos] of tramosByLine.entries()) {
    const geom = chainSegments(tramos);
    features.push({
      type: 'Feature',
      id: `interurban-line-${lineId}`,
      geometry: geom,
      properties: {
        id: `interurban-line-${lineId}`,
        type: 'line',
        network: 'interurban',
        line: lineId,
        name: `Línea Interurbana ${lineId}`,
        color: '#16A34A'
      }
    });
  }

  // Include ALL Interurban stops (8,686 stops across Community of Madrid)
  for (const s of estData.features || []) {
    const rawLines = s.properties?.LINEAS || '';
    const lines = rawLines.split(/[,/ ]+/).map((l) => l.trim()).filter(Boolean);
    const stopId = `interurban-stop-${s.properties?.CODIGOESTACION || s.id}`;

    let zone = s.properties?.CORONATARIFARIA || 'B1';
    const muni = s.properties?.CODIGOMUNICIPIO;

    // Correct CRTM data anomalies where stops outside Madrid are mistakenly tagged 'A' (e.g. Leganés 074)
    if (muni && muni !== '079' && zone === 'A') {
      zone = 'B1';
    }

    features.push({
      type: 'Feature',
      id: stopId,
      geometry: {
        type: 'Point',
        coordinates: truncateCoords(s.geometry.coordinates)
      },
      properties: {
        id: stopId,
        type: 'station',
        network: 'interurban',
        name: s.properties?.DENOMINACION || 'Parada Interurbana',
        lines,
        zone,
        corridor: s.properties?.CORREDOR ? `Corredor ${s.properties.CORREDOR}` : undefined,
        wheelchairAccessible: s.properties?.GRADOACCESIBILIDAD === 'T'
      }
    });
  }

  const outGeoJson = { type: 'FeatureCollection', features };
  fs.writeFileSync(path.join(outputDir, 'interurban.geojson'), JSON.stringify(outGeoJson), 'utf8');
  console.log(`Saved interurban.geojson with ${features.length} features (${tramosByLine.size} lines, ${estData.features?.length} stops).`);
}

// ─── MAIN EXECUTION ──────────────────────────────────────────────────────────
async function main() {
  console.log('=== Madrid Transport Data Preprocessing (100% Official CRTM) ===\n');
  await processTariffZones();
  await processMetroAndCercanias();
  await processEmt();
  await processInterurban();
  console.log('\n=== All datasets successfully processed and saved! ===');
}

main().catch((err) => {
  console.error('Fatal preprocessing error:', err);
  process.exit(1);
});
