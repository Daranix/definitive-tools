import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// ─── 1. TARIFF ZONES (CoronasTarifarias_Vigentes_CRTM) ──────────────────────────
const ZONE_METADATA = {
  'A': {
    color: '#2563EB',
    monthlyPassPriceEur: 54.60,
    tenTripPriceEur: 12.20,
    coverageDescription: 'Madrid capital central municipality (Sol, Atocha, Chamartín, Moncloa, Barajas, Vallecas, Carabanchel)'
  },
  'B1': {
    color: '#059669',
    monthlyPassPriceEur: 63.70,
    tenTripPriceEur: 14.50,
    coverageDescription: 'First metropolitan crown (Alcobendas, San Sebastián de los Reyes, Pozuelo, Majadahonda, Coslada, San Fernando, Getafe, Leganés, Alcorcón)'
  },
  'B2': {
    color: '#10B981',
    monthlyPassPriceEur: 72.00,
    tenTripPriceEur: 17.00,
    coverageDescription: 'Second metropolitan crown (Las Rozas, Móstoles, Fuenlabrada, Parla, Pinto, Rivas-Vaciamadrid, Torrejón de Ardoz, Tres Cantos)'
  },
  'B3': {
    color: '#D97706',
    monthlyPassPriceEur: 82.00,
    tenTripPriceEur: 20.00,
    coverageDescription: 'Third metropolitan ring (Alcalá de Henares, Colmenar Viejo, Collado Villalba, Valdemoro, Navalcarnero, Arganda del Rey, Arroyomolinos, Ciempozuelos)'
  },
  'C1': {
    color: '#EA580C',
    monthlyPassPriceEur: 89.50,
    tenTripPriceEur: 23.50,
    coverageDescription: 'Outer metropolitan region (Aranjuez, El Escorial, Guadarrama, Chinchón, San Martín de Valdeiglesias, Buitrago del Lozoya)'
  },
  'C2': {
    color: '#DC2626',
    monthlyPassPriceEur: 99.30,
    tenTripPriceEur: 26.50,
    coverageDescription: 'Border municipalities of the Community of Madrid (Cercedilla, Santa María de la Alameda, Puebla de la Sierra)'
  },
  'E1': {
    color: '#7C3AED',
    monthlyPassPriceEur: 110.60,
    tenTripPriceEur: 31.00,
    coverageDescription: 'Castilla-La Mancha adjacent corridor (Guadalajara, Azuqueca de Henares, Illescas, northern Toledo corridor)'
  },
  'E2': {
    color: '#9333EA',
    monthlyPassPriceEur: 131.80,
    tenTripPriceEur: 38.00,
    coverageDescription: 'Castilla-La Mancha extended corridor (Talavera de la Reina, Toledo capital, Tarancón)'
  }
};

async function processTariffZones() {
  console.log('\n--- Processing Tariff Zones (CRTM Coronas) ---');
  const url = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/CoronasTarifarias_Vigentes_CRTM/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson';
  const data = await fetchCachedJson('crtm-coronas.geojson', url);

  const order = ['A', 'B1', 'B2', 'B3', 'C1', 'C2', 'E1', 'E2'];
  const formattedFeatures = [];

  for (const code of order) {
    const rawFeature = data.features.find(f => f.properties?.CCORONATAR === code);
    if (!rawFeature) continue;

    const meta = ZONE_METADATA[code];
    formattedFeatures.push({
      type: 'Feature',
      id: `zone-${code}`,
      geometry: {
        type: rawFeature.geometry.type,
        coordinates: truncateCoords(rawFeature.geometry.coordinates)
      },
      properties: {
        code,
        name: `Zona ${code}`,
        color: meta.color,
        monthlyPassPriceEur: meta.monthlyPassPriceEur,
        tenTripPriceEur: meta.tenTripPriceEur,
        coverageDescription: meta.coverageDescription,
        officialName: rawFeature.properties.NOMBRE,
        source: 'CRTM Official Data'
      }
    });
  }

  const outGeoJson = { type: 'FeatureCollection', features: formattedFeatures };
  fs.writeFileSync(path.join(outputDir, 'zones.geojson'), JSON.stringify(outGeoJson), 'utf8');
  console.log(`Saved zones.geojson with ${formattedFeatures.length} official CRTM zones.`);
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

// ─── HELPER: CHAIN SEGMENTS INTO CONTINUOUS MULTILINE ──────────────────────────
function chainSegments(tramos, isCircular = false) {
  if (isCircular) {
    // For circular lines (Line 6 and Line 12), CRTM defines track 1 (e.g. 6-1 or 12-1)
    // as the complete 360-degree loop encompassing all stations in circular order.
    const primaryTrack = tramos.filter(t => t.properties?.NUMEROLINEAUSUARIO?.endsWith('-1'));
    const list = primaryTrack.length > 0 ? primaryTrack : tramos;
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

  // Non-circular lines: group by individual track/subline to prevent zigzagging
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

async function processMetro() {
  console.log('\n--- Processing Metro (M4_Red) ---');
  const estUrl = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M4_Red/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson';
  const tramosUrl = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M4_Red/FeatureServer/4/query?where=1%3D1&outFields=*&f=geojson';

  const estData = await fetchCachedJson('crtm-metro-estaciones.geojson', estUrl);
  const tramosData = await fetchCachedJson('crtm-metro-tramos.geojson', tramosUrl);

  const features = [];

  // Group tramos by line
  const tramosByLine = new Map();
  for (const t of tramosData.features || []) {
    const rawLine = t.properties?.NUMEROLINEAUSUARIO;
    if (!rawLine) continue;
    // Map to canonical line key
    let canonical = rawLine;
    for (const [key, cfg] of Object.entries(METRO_LINE_CONFIG)) {
      if (key === rawLine || cfg.aliases?.includes(rawLine)) {
        canonical = key;
        break;
      }
    }
    if (!tramosByLine.has(canonical)) tramosByLine.set(canonical, []);
    tramosByLine.get(canonical).push(t);
  }

  // Create Line features
  for (const [lineKey, cfg] of Object.entries(METRO_LINE_CONFIG)) {
    const tramos = tramosByLine.get(lineKey) || [];
    if (tramos.length === 0) continue;
    const geom = chainSegments(tramos, cfg.isCircular);
    features.push({
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

  // Create Station features
  for (const s of estData.features || []) {
    const rawLines = s.properties?.LINEAS || '';
    const lines = rawLines.split(',').map(l => l.trim()).filter(Boolean);
    const stationId = `metro-${s.properties?.CODIGOESTACION || s.id}`;

    features.push({
      type: 'Feature',
      id: stationId,
      geometry: {
        type: 'Point',
        coordinates: truncateCoords(s.geometry.coordinates)
      },
      properties: {
        id: stationId,
        type: 'station',
        network: 'metro',
        name: s.properties?.DENOMINACION || 'Estación de Metro',
        lines,
        zone: s.properties?.CORONATARIFARIA || 'A',
        wheelchairAccessible: s.properties?.GRADOACCESIBILIDAD === 'T'
      }
    });
  }

  const outGeoJson = { type: 'FeatureCollection', features };
  fs.writeFileSync(path.join(outputDir, 'metro.geojson'), JSON.stringify(outGeoJson), 'utf8');
  console.log(`Saved metro.geojson with ${features.length} features (${Object.keys(METRO_LINE_CONFIG).length} lines, ${estData.features?.length} stations).`);
}

// ─── 3. CERCANÍAS (M5_Red: Estaciones + Tramos) ──────────────────────────────
const CERCANIAS_LINE_CONFIG = {
  'C-1': { name: 'Línea C-1: Príncipe Pío - Aeropuerto T4', color: '#00A9E0' },
  'C-2': { name: 'Línea C-2: Guadalajara - Chamartín', color: '#80BA27' },
  'C-3': { name: 'Línea C-3: Aranjuez - Chamartín', color: '#A11A88' },
  'C-4': { name: 'Línea C-4: Parla - Alcobendas / Colmenar Viejo', color: '#003399', aliases: ['C-4a', 'C-4b'] },
  'C-5': { name: 'Línea C-5: Móstoles El Soto - Fuenlabrada / Humanes', color: '#F37021' },
  'C-7': { name: 'Línea C-7: Alcalá de Henares - Príncipe Pío', color: '#ED1B2F' },
  'C-8': { name: 'Línea C-8: Guadalajara - Cercedilla', color: '#7E8082', aliases: ['C-8a', 'C-8b'] },
  'C-9': { name: 'Línea C-9: Cercedilla - Cotos (Zona Verde)', color: '#FFD100' },
  'C-10': { name: 'Línea C-10: Villalba - Aeropuerto T4', color: '#85C441' }
};

async function processCercanias() {
  console.log('\n--- Processing Cercanías (M5_Red) ---');
  const estUrl = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M5_Red/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson';
  const tramosUrl = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M5_Red/FeatureServer/4/query?where=1%3D1&outFields=*&f=geojson';

  const estData = await fetchCachedJson('crtm-cercanias-estaciones.geojson', estUrl);
  const tramosData = await fetchCachedJson('crtm-cercanias-tramos.geojson', tramosUrl);

  const features = [];

  // Group tramos by line
  const tramosByLine = new Map();
  for (const t of tramosData.features || []) {
    const rawLine = t.properties?.NUMEROLINEAUSUARIO;
    if (!rawLine) continue;
    let canonical = rawLine;
    for (const [key, cfg] of Object.entries(CERCANIAS_LINE_CONFIG)) {
      if (key === rawLine || cfg.aliases?.includes(rawLine)) {
        canonical = key;
        break;
      }
    }
    if (!tramosByLine.has(canonical)) tramosByLine.set(canonical, []);
    tramosByLine.get(canonical).push(t);
  }

  // Create Line features
  for (const [lineKey, cfg] of Object.entries(CERCANIAS_LINE_CONFIG)) {
    const tramos = tramosByLine.get(lineKey) || [];
    if (tramos.length === 0) continue;
    const geom = chainSegments(tramos);
    features.push({
      type: 'Feature',
      id: `cercanias-line-${lineKey}`,
      geometry: geom,
      properties: {
        id: `cercanias-line-${lineKey}`,
        type: 'line',
        network: 'cercanias',
        line: lineKey,
        name: cfg.name,
        color: cfg.color
      }
    });
  }

  // Create Station features
  for (const s of estData.features || []) {
    const rawLines = s.properties?.LINEAS || '';
    const lines = rawLines.split(',').map(l => l.trim()).filter(Boolean);
    const stationId = `cercanias-${s.properties?.CODIGOESTACION || s.id}`;

    features.push({
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
        name: s.properties?.DENOMINACION || 'Estación de Cercanías',
        lines,
        zone: s.properties?.CORONATARIFARIA || 'A',
        wheelchairAccessible: s.properties?.GRADOACCESIBILIDAD === 'T'
      }
    });
  }

  const outGeoJson = { type: 'FeatureCollection', features };
  fs.writeFileSync(path.join(outputDir, 'cercanias.geojson'), JSON.stringify(outGeoJson), 'utf8');
  console.log(`Saved cercanias.geojson with ${features.length} features.`);
}

// ─── 4. EMT AUTOBUSES URBANOS (M6_Red) ─────────────────────────────────────────
const EMT_KEY_LINES = [
  '1', '2', '6', '10', '12', '14', '19', '21', '25', '27',
  '32', '34', '35', '51', '52', '54', '56', '70', '138', '142',
  '144', '147', '148', '150', 'C1', 'C2', '001', '203', 'E1', 'E2',
  'E3', 'E4', 'F', 'G'
];

async function processEmt() {
  console.log('\n--- Processing EMT Buses (M6_Red) ---');
  // 1. Fetch all EMT stations (stops) with paging (4,966 stops)
  const estBase = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M6_Red/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson';
  const estData = await fetchPagedFeatures('crtm-emt-estaciones.geojson', estBase, 6000);

  // 2. Fetch tramos for key lines
  const tramosCachePath = path.join(rawDir, 'crtm-emt-key-tramos.geojson');
  let tramosData;

  if (fs.existsSync(tramosCachePath)) {
    console.log('Using cached crtm-emt-key-tramos.geojson');
    tramosData = JSON.parse(fs.readFileSync(tramosCachePath, 'utf8'));
  } else {
    console.log('Fetching EMT tramos for key lines...');
    const allTramos = [];
    for (const lineId of EMT_KEY_LINES) {
      const url = `https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M6_Red/FeatureServer/2/query?where=NUMEROLINEAUSUARIO%3D%27${encodeURIComponent(lineId)}%27&orderByFields=SENTIDO+ASC,NUMEROORDEN+ASC&outFields=*&f=geojson`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features) allTramos.push(...data.features);
      }
    }
    tramosData = { type: 'FeatureCollection', features: allTramos };
    fs.writeFileSync(tramosCachePath, JSON.stringify(tramosData), 'utf8');
  }

  const features = [];
  const lineSet = new Set(EMT_KEY_LINES);

  // Build line route geometries
  const tramosByLine = new Map();
  for (const t of tramosData.features || []) {
    const l = t.properties?.NUMEROLINEAUSUARIO;
    if (!l) continue;
    if (!tramosByLine.has(l)) tramosByLine.set(l, []);
    tramosByLine.get(l).push(t);
  }

  for (const lineId of EMT_KEY_LINES) {
    const tramos = tramosByLine.get(lineId) || [];
    if (tramos.length === 0) continue;
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

  // Filter stops that serve any of our active EMT lines
  const matchedStops = (estData.features || []).filter(s => {
    const rawLines = s.properties?.LINEAS || '';
    const parts = rawLines.split(/[,/ ]+/).map(l => l.trim()).filter(Boolean);
    return parts.some(p => lineSet.has(p));
  });

  for (const s of matchedStops) {
    const rawLines = s.properties?.LINEAS || '';
    const lines = rawLines.split(/[,/ ]+/).map(l => l.trim()).filter(Boolean);
    const stopId = `emt-stop-${s.properties?.CODIGOESTACION || s.id}`;

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
        zone: s.properties?.CORONATARIFARIA || 'A',
        wheelchairAccessible: s.properties?.GRADOACCESIBILIDAD === 'T'
      }
    });
  }

  const outGeoJson = { type: 'FeatureCollection', features };
  fs.writeFileSync(path.join(outputDir, 'emt.geojson'), JSON.stringify(outGeoJson), 'utf8');
  console.log(`Saved emt.geojson with ${features.length} features (${tramosByLine.size} lines, ${matchedStops.length} stops).`);
}

// ─── 5. INTERURBAN AUTOBUSES (M8_Red) ─────────────────────────────────────────
const INTERURBAN_KEY_LINES = [
  '151', '152C', '154', '171', '191',
  '223', '224', '281', '282', '284',
  '331', '332', '333', '351', '352',
  '441', '442', '461', '462', '481', '484',
  '511', '512', '521', '522', '528', '546',
  '621', '622', '627', '651', '652', '681', '682'
];

async function processInterurban() {
  console.log('\n--- Processing Interurban Buses (M8_Red) ---');
  // 1. Fetch Interurban stations with paging (8,686 stops)
  const estBase = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M8_Red/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson';
  const estData = await fetchPagedFeatures('crtm-interurban-estaciones.geojson', estBase, 10000);

  // 2. Fetch tramos for key interurban lines
  const tramosCachePath = path.join(rawDir, 'crtm-interurban-key-tramos.geojson');
  let tramosData;

  if (fs.existsSync(tramosCachePath)) {
    console.log('Using cached crtm-interurban-key-tramos.geojson');
    tramosData = JSON.parse(fs.readFileSync(tramosCachePath, 'utf8'));
  } else {
    console.log('Fetching Interurban tramos for key lines...');
    const allTramos = [];
    for (const lineId of INTERURBAN_KEY_LINES) {
      const url = `https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M8_Red/FeatureServer/2/query?where=NUMEROLINEAUSUARIO%3D%27${encodeURIComponent(lineId)}%27&orderByFields=SENTIDO+ASC,NUMEROORDEN+ASC&outFields=*&f=geojson`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features) allTramos.push(...data.features);
      }
    }
    tramosData = { type: 'FeatureCollection', features: allTramos };
    fs.writeFileSync(tramosCachePath, JSON.stringify(tramosData), 'utf8');
  }

  const features = [];
  const lineSet = new Set(INTERURBAN_KEY_LINES);

  // Build line route geometries
  const tramosByLine = new Map();
  for (const t of tramosData.features || []) {
    const l = t.properties?.NUMEROLINEAUSUARIO;
    if (!l) continue;
    if (!tramosByLine.has(l)) tramosByLine.set(l, []);
    tramosByLine.get(l).push(t);
  }

  for (const lineId of INTERURBAN_KEY_LINES) {
    const tramos = tramosByLine.get(lineId) || [];
    if (tramos.length === 0) continue;
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

  // Filter stops that serve any of our active Interurban lines
  const matchedStops = (estData.features || []).filter(s => {
    const rawLines = s.properties?.LINEAS || '';
    const parts = rawLines.split(/[,/ ]+/).map(l => l.trim()).filter(Boolean);
    return parts.some(p => lineSet.has(p));
  });

  for (const s of matchedStops) {
    const rawLines = s.properties?.LINEAS || '';
    const lines = rawLines.split(/[,/ ]+/).map(l => l.trim()).filter(Boolean);
    const stopId = `interurban-stop-${s.properties?.CODIGOESTACION || s.id}`;

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
        zone: s.properties?.CORONATARIFARIA || 'B1',
        corridor: s.properties?.CORREDOR ? `Corredor ${s.properties.CORREDOR}` : undefined,
        wheelchairAccessible: s.properties?.GRADOACCESIBILIDAD === 'T'
      }
    });
  }

  const outGeoJson = { type: 'FeatureCollection', features };
  fs.writeFileSync(path.join(outputDir, 'interurban.geojson'), JSON.stringify(outGeoJson), 'utf8');
  console.log(`Saved interurban.geojson with ${features.length} features (${tramosByLine.size} lines, ${matchedStops.length} stops).`);
}

// ─── MAIN EXECUTION ──────────────────────────────────────────────────────────
async function main() {
  console.log('=== Madrid Transport Data Preprocessing (100% Official CRTM) ===\n');
  await processTariffZones();
  await processMetro();
  await processCercanias();
  await processEmt();
  await processInterurban();
  console.log('\n=== All datasets successfully processed and saved! ===');
}

main().catch(err => {
  console.error('Fatal preprocessing error:', err);
  process.exit(1);
});
