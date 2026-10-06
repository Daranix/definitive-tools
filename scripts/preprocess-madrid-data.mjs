import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'public', 'maps', 'madrid');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function round5(num) {
  return Number(num.toFixed(5));
}

function generateRing(centerLng, centerLat, radiusKmX, radiusKmY, steps, noiseFactor = 0.05, seed = 1) {
  const coords = [];
  const kmToLng = 1 / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const kmToLat = 1 / 110.574;

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const pseudoNoise = 1 + Math.sin(angle * 3 + seed) * noiseFactor + Math.cos(angle * 5 + seed * 2) * (noiseFactor * 0.5);
    const lng = centerLng + Math.cos(angle) * radiusKmX * kmToLng * pseudoNoise;
    const lat = centerLat + Math.sin(angle) * radiusKmY * kmToLat * pseudoNoise;
    coords.push([round5(lng), round5(lat)]);
  }
  return coords;
}

// ─── 1. TARIFF ZONES (CRTM) ──────────────────────────────────────────────────
console.log('Generating zones.geojson...');

const zoneDefinitions = [
  {
    code: 'A',
    name: 'Zona A',
    color: '#2563EB',
    monthlyPassPriceEur: 54.60,
    tenTripPriceEur: 12.20,
    coverageDescription: 'Madrid capital central municipality (Sol, Atocha, Chamartín, Moncloa, Barajas, Vallecas, Carabanchel)',
    rX: 8.5,
    rY: 9.8,
    noise: 0.08,
    seed: 1.2
  },
  {
    code: 'B1',
    name: 'Zona B1',
    color: '#059669',
    monthlyPassPriceEur: 63.70,
    tenTripPriceEur: 14.50,
    coverageDescription: 'First metropolitan crown (Alcobendas, San Sebastián de los Reyes, Pozuelo, Majadahonda, Coslada, San Fernando, Getafe, Leganés, Alcorcón)',
    rX: 16.5,
    rY: 17.5,
    noise: 0.07,
    seed: 2.4
  },
  {
    code: 'B2',
    name: 'Zona B2',
    color: '#10B981',
    monthlyPassPriceEur: 72.00,
    tenTripPriceEur: 17.00,
    coverageDescription: 'Second metropolitan crown (Las Rozas, Móstoles, Fuenlabrada, Parla, Pinto, Rivas-Vaciamadrid, Torrejón de Ardoz, Tres Cantos)',
    rX: 25.0,
    rY: 26.5,
    noise: 0.06,
    seed: 3.1
  },
  {
    code: 'B3',
    name: 'Zona B3',
    color: '#D97706',
    monthlyPassPriceEur: 82.00,
    tenTripPriceEur: 20.00,
    coverageDescription: 'Third metropolitan ring (Alcalá de Henares, Colmenar Viejo, Collado Villalba, Valdemoro, Navalcarnero, Arganda del Rey, Arroyomolinos, Ciempozuelos)',
    rX: 35.5,
    rY: 37.0,
    noise: 0.06,
    seed: 4.8
  },
  {
    code: 'C1',
    name: 'Zona C1',
    color: '#EA580C',
    monthlyPassPriceEur: 89.50,
    tenTripPriceEur: 23.50,
    coverageDescription: 'Outer metropolitan region (Aranjuez, El Escorial, Guadarrama, Chinchón, San Martín de Valdeiglesias, Buitrago del Lozoya)',
    rX: 47.0,
    rY: 49.0,
    noise: 0.05,
    seed: 5.5
  },
  {
    code: 'C2',
    name: 'Zona C2',
    color: '#DC2626',
    monthlyPassPriceEur: 99.30,
    tenTripPriceEur: 26.50,
    coverageDescription: 'Border municipalities of the Community of Madrid (Cercedilla, Santa María de la Alameda, Puebla de la Sierra)',
    rX: 59.0,
    rY: 62.0,
    noise: 0.05,
    seed: 6.2
  },
  {
    code: 'E1',
    name: 'Zona E1',
    color: '#7C3AED',
    monthlyPassPriceEur: 110.60,
    tenTripPriceEur: 31.00,
    coverageDescription: 'Castilla-La Mancha adjacent corridor (Guadalajara, Azuqueca de Henares, Illescas, northern Toledo corridor)',
    rX: 72.0,
    rY: 75.0,
    noise: 0.04,
    seed: 7.9
  },
  {
    code: 'E2',
    name: 'Zona E2',
    color: '#9333EA',
    monthlyPassPriceEur: 131.80,
    tenTripPriceEur: 38.00,
    coverageDescription: 'Castilla-La Mancha extended corridor (Talavera de la Reina, Toledo capital, Tarancón)',
    rX: 86.0,
    rY: 90.0,
    noise: 0.04,
    seed: 8.3
  }
];

const center = [-3.7038, 40.4168];

// Generate rings for each zone
const rawRings = zoneDefinitions.map((z) => {
  return generateRing(center[0], center[1], z.rX, z.rY, 48, z.noise, z.seed);
});

// Construct non-overlapping polygons (donut rings for B1..E2, solid for A)
const zoneFeatures = zoneDefinitions.map((z, idx) => {
  let coordinates;
  if (idx === 0) {
    coordinates = [rawRings[0]];
  } else {
    // Outer boundary (CCW) + reversed inner ring (CW hole) per GeoJSON RFC 7946
    coordinates = [rawRings[idx], rawRings[idx - 1].slice().reverse()];
  }

  return {
    type: 'Feature',
    id: `zone-${z.code}`,
    geometry: {
      type: 'Polygon',
      coordinates
    },
    properties: {
      code: z.code,
      name: z.name,
      color: z.color,
      monthlyPassPriceEur: z.monthlyPassPriceEur,
      tenTripPriceEur: z.tenTripPriceEur,
      coverageDescription: z.coverageDescription
    }
  };
});

fs.writeFileSync(
  path.join(outputDir, 'zones.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: zoneFeatures }, null, 2)
);

// ─── 2. METRO DE MADRID ─────────────────────────────────────────────────────
console.log('Generating metro.geojson...');

const metroLinesData = [
  {
    line: '1',
    name: 'Línea 1 (Pinar de Chamartín - Valdecarros)',
    color: '#00A9E0',
    stations: [
      { name: 'Pinar de Chamartín', coords: [-3.6669, 40.4801], zone: 'A', lines: ['1', '4'] },
      { name: 'Bambú', coords: [-3.6766, 40.4768], zone: 'A', lines: ['1'] },
      { name: 'Chamartín', coords: [-3.6823, 40.4721], zone: 'A', lines: ['1', '10', 'C-1', 'C-2', 'C-3', 'C-4', 'C-7', 'C-8', 'C-10'] },
      { name: 'Plaza de Castilla', coords: [-3.6892, 40.4667], zone: 'A', lines: ['1', '9', '10'] },
      { name: 'Valdeacederas', coords: [-3.6961, 40.4639], zone: 'A', lines: ['1'] },
      { name: 'Tetuán', coords: [-3.6983, 40.4601], zone: 'A', lines: ['1'] },
      { name: 'Estrecho', coords: [-3.7018, 40.4536], zone: 'A', lines: ['1'] },
      { name: 'Alvarado', coords: [-3.7031, 40.4501], zone: 'A', lines: ['1'] },
      { name: 'Cuatro Caminos', coords: [-3.7042, 40.4468], zone: 'A', lines: ['1', '2', '6'] },
      { name: 'Ríos Rosas', coords: [-3.7011, 40.4414], zone: 'A', lines: ['1'] },
      { name: 'Iglesia', coords: [-3.6998, 40.4352], zone: 'A', lines: ['1'] },
      { name: 'Bilbao', coords: [-3.7022, 40.4289], zone: 'A', lines: ['1', '4'] },
      { name: 'Tribunal', coords: [-3.7008, 40.4261], zone: 'A', lines: ['1', '10'] },
      { name: 'Gran Vía', coords: [-3.7015, 40.4201], zone: 'A', lines: ['1', '5'] },
      { name: 'Sol', coords: [-3.7038, 40.4168], zone: 'A', lines: ['1', '2', '3'] },
      { name: 'Tirso de Molina', coords: [-3.7049, 40.4124], zone: 'A', lines: ['1'] },
      { name: 'Antón Martín', coords: [-3.6992, 40.4121], zone: 'A', lines: ['1'] },
      { name: 'Estación del Arte', coords: [-3.6934, 40.4088], zone: 'A', lines: ['1'] },
      { name: 'Atocha', coords: [-3.6922, 40.4065], zone: 'A', lines: ['1', 'C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-7', 'C-10'] },
      { name: 'Menéndez Pelayo', coords: [-3.6791, 40.4034], zone: 'A', lines: ['1'] },
      { name: 'Pacífico', coords: [-3.6749, 40.4007], zone: 'A', lines: ['1', '6'] },
      { name: 'Puente de Vallecas', coords: [-3.6685, 40.3982], zone: 'A', lines: ['1'] },
      { name: 'Nueva Numancia', coords: [-3.6624, 40.3955], zone: 'A', lines: ['1'] },
      { name: 'Portazgo', coords: [-3.6565, 40.3927], zone: 'A', lines: ['1'] },
      { name: 'Buenos Aires', coords: [-3.6508, 40.3905], zone: 'A', lines: ['1'] },
      { name: 'Alto del Arenal', coords: [-3.6455, 40.3887], zone: 'A', lines: ['1'] },
      { name: 'Miguel Hernández', coords: [-3.6401, 40.3869], zone: 'A', lines: ['1'] },
      { name: 'Sierra de Guadalupe', coords: [-3.6267, 40.3875], zone: 'A', lines: ['1', 'C-2', 'C-7', 'C-8'] },
      { name: 'Villa de Vallecas', coords: [-3.6202, 40.3792], zone: 'A', lines: ['1'] },
      { name: 'Congosto', coords: [-3.6151, 40.3725], zone: 'A', lines: ['1'] },
      { name: 'La Gavia', coords: [-3.6082, 40.3672], zone: 'A', lines: ['1'] },
      { name: 'Las Suertes', coords: [-3.5991, 40.3621], zone: 'A', lines: ['1'] },
      { name: 'Valdecarros', coords: [-3.5898, 40.3582], zone: 'A', lines: ['1'] }
    ]
  },
  {
    line: '2',
    name: 'Línea 2 (Cuatro Caminos - Las Rosas)',
    color: '#E4002B',
    stations: [
      { name: 'Cuatro Caminos', coords: [-3.7042, 40.4468], zone: 'A', lines: ['1', '2', '6'] },
      { name: 'Canal', coords: [-3.7047, 40.4397], zone: 'A', lines: ['2', '7'] },
      { name: 'Quevedo', coords: [-3.7051, 40.4338], zone: 'A', lines: ['2'] },
      { name: 'San Bernardo', coords: [-3.7061, 40.4299], zone: 'A', lines: ['2', '4'] },
      { name: 'Noviciado', coords: [-3.7078, 40.4252], zone: 'A', lines: ['2', '3', '10'] },
      { name: 'Santo Domingo', coords: [-3.7089, 40.4208], zone: 'A', lines: ['2'] },
      { name: 'Ópera', coords: [-3.7099, 40.4181], zone: 'A', lines: ['2', '5', 'Ramal'] },
      { name: 'Sol', coords: [-3.7038, 40.4168], zone: 'A', lines: ['1', '2', '3'] },
      { name: 'Sevilla', coords: [-3.6997, 40.4174], zone: 'A', lines: ['2'] },
      { name: 'Banco de España', coords: [-3.6948, 40.4189], zone: 'A', lines: ['2'] },
      { name: 'Retiro', coords: [-3.6875, 40.4209], zone: 'A', lines: ['2'] },
      { name: 'Príncipe de Vergara', coords: [-3.6798, 40.4225], zone: 'A', lines: ['2', '9'] },
      { name: 'Goya', coords: [-3.6749, 40.4243], zone: 'A', lines: ['2', '4'] },
      { name: 'Manuel Becerra', coords: [-3.6672, 40.4298], zone: 'A', lines: ['2', '6'] },
      { name: 'Ventas', coords: [-3.6625, 40.4312], zone: 'A', lines: ['2', '5'] },
      { name: 'La Elipa', coords: [-3.6521, 40.4278], zone: 'A', lines: ['2'] },
      { name: 'La Almudena', coords: [-3.6398, 40.4241], zone: 'A', lines: ['2'] },
      { name: 'Alsacia', coords: [-3.6265, 40.4198], zone: 'A', lines: ['2'] },
      { name: 'Guadalajara', coords: [-3.6142, 40.4231], zone: 'A', lines: ['2'] },
      { name: 'Las Rosas', coords: [-3.6021, 40.4265], zone: 'A', lines: ['2'] }
    ]
  },
  {
    line: '3',
    name: 'Línea 3 (Moncloa - Villaverde Alto)',
    color: '#FFCC00',
    stations: [
      { name: 'Moncloa', coords: [-3.7196, 40.4354], zone: 'A', lines: ['3', '6'] },
      { name: 'Argüelles', coords: [-3.7158, 40.4308], zone: 'A', lines: ['3', '4', '6'] },
      { name: 'Ventura Rodríguez', coords: [-3.7121, 40.4267], zone: 'A', lines: ['3'] },
      { name: 'Plaza de España', coords: [-3.7126, 40.4234], zone: 'A', lines: ['3', '10'] },
      { name: 'Callao', coords: [-3.7058, 40.4202], zone: 'A', lines: ['3', '5'] },
      { name: 'Sol', coords: [-3.7038, 40.4168], zone: 'A', lines: ['1', '2', '3'] },
      { name: 'Lavapiés', coords: [-3.7011, 40.4089], zone: 'A', lines: ['3'] },
      { name: 'Embajadores', coords: [-3.7029, 40.4052], zone: 'A', lines: ['3', 'C-5'] },
      { name: 'Palos de la Frontera', coords: [-3.6958, 40.4025], zone: 'A', lines: ['3'] },
      { name: 'Delicias', coords: [-3.6931, 40.3982], zone: 'A', lines: ['3', 'C-1', 'C-10'] },
      { name: 'Legazpi', coords: [-3.6951, 40.3912], zone: 'A', lines: ['3', '6'] },
      { name: 'Almendrales', coords: [-3.7001, 40.3842], zone: 'A', lines: ['3'] },
      { name: 'Hospital 12 de Octubre', coords: [-3.6985, 40.3778], zone: 'A', lines: ['3'] },
      { name: 'San Fermín-Orcasur', coords: [-3.6961, 40.3705], zone: 'A', lines: ['3'] },
      { name: 'Ciudad de los Ángeles', coords: [-3.6952, 40.3601], zone: 'A', lines: ['3'] },
      { name: 'Villaverde Bajo-Cruce', coords: [-3.6981, 40.3518], zone: 'A', lines: ['3'] },
      { name: 'San Cristóbal', coords: [-3.6931, 40.3445], zone: 'A', lines: ['3'] },
      { name: 'Villaverde Alto', coords: [-3.7108, 40.3421], zone: 'A', lines: ['3', 'C-4', 'C-5'] }
    ]
  },
  {
    line: '6',
    name: 'Línea 6 (Circular)',
    color: '#A1A5A8',
    stations: [
      { name: 'Cuatro Caminos', coords: [-3.7042, 40.4468], zone: 'A', lines: ['1', '2', '6'] },
      { name: 'Nuevos Ministerios', coords: [-3.6917, 40.4464], zone: 'A', lines: ['6', '8', '10', 'C-1', 'C-2', 'C-3', 'C-4', 'C-7', 'C-8', 'C-10'] },
      { name: 'República Argentina', coords: [-3.6828, 40.4442], zone: 'A', lines: ['6'] },
      { name: 'Avenida de América', coords: [-3.6769, 40.4381], zone: 'A', lines: ['4', '6', '7', '9'] },
      { name: 'Diego de León', coords: [-3.6751, 40.4335], zone: 'A', lines: ['4', '5', '6'] },
      { name: 'Manuel Becerra', coords: [-3.6672, 40.4298], zone: 'A', lines: ['2', '6'] },
      { name: 'O\'Donnell', coords: [-3.6651, 40.4218], zone: 'A', lines: ['6'] },
      { name: 'Sainz de Baranda', coords: [-3.6698, 40.4149], zone: 'A', lines: ['6', '9'] },
      { name: 'Conde de Casal', coords: [-3.6719, 40.4072], zone: 'A', lines: ['6'] },
      { name: 'Pacífico', coords: [-3.6749, 40.4007], zone: 'A', lines: ['1', '6'] },
      { name: 'Méndez Álvaro', coords: [-3.6781, 40.3956], zone: 'A', lines: ['6', 'C-1', 'C-5', 'C-7', 'C-10'] },
      { name: 'Arganzuela-Planetario', coords: [-3.6881, 40.3921], zone: 'A', lines: ['6'] },
      { name: 'Legazpi', coords: [-3.6951, 40.3912], zone: 'A', lines: ['3', '6'] },
      { name: 'Usera', coords: [-3.7071, 40.3881], zone: 'A', lines: ['6'] },
      { name: 'Plaza Elíptica', coords: [-3.7181, 40.3852], zone: 'A', lines: ['6', '11'] },
      { name: 'Opañel', coords: [-3.7221, 40.3879], zone: 'A', lines: ['6'] },
      { name: 'Oporto', coords: [-3.7311, 40.3888], zone: 'A', lines: ['5', '6'] },
      { name: 'Carpetana', coords: [-3.7412, 40.3929], zone: 'A', lines: ['6'] },
      { name: 'Laguna', coords: [-3.7451, 40.3992], zone: 'A', lines: ['6', 'C-5'] },
      { name: 'Lucero', coords: [-3.7421, 40.4055], zone: 'A', lines: ['6'] },
      { name: 'Alto de Extremadura', coords: [-3.7335, 40.4109], zone: 'A', lines: ['6'] },
      { name: 'Puerta del Ángel', coords: [-3.7275, 40.4132], zone: 'A', lines: ['6'] },
      { name: 'Príncipe Pío', coords: [-3.7198, 40.4208], zone: 'A', lines: ['6', '10', 'Ramal', 'C-1', 'C-7', 'C-10'] },
      { name: 'Argüelles', coords: [-3.7158, 40.4308], zone: 'A', lines: ['3', '4', '6'] },
      { name: 'Moncloa', coords: [-3.7196, 40.4354], zone: 'A', lines: ['3', '6'] },
      { name: 'Ciudad Universitaria', coords: [-3.7258, 40.4439], zone: 'A', lines: ['6'] },
      { name: 'Metropolitano', coords: [-3.7188, 40.4475], zone: 'A', lines: ['6'] },
      { name: 'Guzmán el Bueno', coords: [-3.7121, 40.4461], zone: 'A', lines: ['6', '7'] }
    ]
  },
  {
    line: '8',
    name: 'Línea 8 (Nuevos Ministerios - Aeropuerto T4)',
    color: '#F184B7',
    stations: [
      { name: 'Nuevos Ministerios', coords: [-3.6917, 40.4464], zone: 'A', lines: ['6', '8', '10'] },
      { name: 'Colombia', coords: [-3.6775, 40.4571], zone: 'A', lines: ['8', '9'] },
      { name: 'Pinar del Rey', coords: [-3.6558, 40.4682], zone: 'A', lines: ['8'] },
      { name: 'Mar de Cristal', coords: [-3.6382, 40.4695], zone: 'A', lines: ['4', '8'] },
      { name: 'Feria de Madrid', coords: [-3.6152, 40.4645], zone: 'A', lines: ['8'] },
      { name: 'Aeropuerto T1-T2-T3', coords: [-3.5786, 40.4682], zone: 'A', lines: ['8'] },
      { name: 'Barajas', coords: [-3.5825, 40.4761], zone: 'A', lines: ['8'] },
      { name: 'Aeropuerto T4', coords: [-3.5932, 40.4918], zone: 'A', lines: ['8', 'C-1', 'C-10'] }
    ]
  },
  {
    line: '10',
    name: 'Línea 10 (Hospital Infanta Sofía - Puerta del Sur)',
    color: '#002D72',
    stations: [
      { name: 'Hospital Infanta Sofía', coords: [-3.6148, 40.5592], zone: 'B1', lines: ['10'] },
      { name: 'Baunatal', coords: [-3.6275, 40.5518], zone: 'B1', lines: ['10'] },
      { name: 'Manuel de Falla', coords: [-3.6338, 40.5482], zone: 'B1', lines: ['10'] },
      { name: 'Marqués de la Valdavia', coords: [-3.6391, 40.5428], zone: 'B1', lines: ['10'] },
      { name: 'La Moraleja', coords: [-3.6512, 40.5312], zone: 'B1', lines: ['10'] },
      { name: 'Ronda de la Comunicación', coords: [-3.6625, 40.5175], zone: 'A', lines: ['10'] },
      { name: 'Las Tablas', coords: [-3.6698, 40.5085], zone: 'A', lines: ['10'] },
      { name: 'Montecarmelo', coords: [-3.6895, 40.5051], zone: 'A', lines: ['10'] },
      { name: 'Tres Olivos', coords: [-3.6938, 40.4988], zone: 'A', lines: ['10'] },
      { name: 'Fuencarral', coords: [-3.6922, 40.4912], zone: 'A', lines: ['10'] },
      { name: 'Begoña', coords: [-3.6872, 40.4811], zone: 'A', lines: ['10'] },
      { name: 'Chamartín', coords: [-3.6823, 40.4721], zone: 'A', lines: ['1', '10'] },
      { name: 'Plaza de Castilla', coords: [-3.6892, 40.4667], zone: 'A', lines: ['1', '9', '10'] },
      { name: 'Cuzco', coords: [-3.6901, 40.4582], zone: 'A', lines: ['10'] },
      { name: 'Santiago Bernabéu', coords: [-3.6911, 40.4521], zone: 'A', lines: ['10'] },
      { name: 'Nuevos Ministerios', coords: [-3.6917, 40.4464], zone: 'A', lines: ['6', '8', '10'] },
      { name: 'Gregorio Marañón', coords: [-3.6919, 40.4372], zone: 'A', lines: ['7', '10'] },
      { name: 'Alonso Martínez', coords: [-3.6958, 40.4281], zone: 'A', lines: ['4', '5', '10'] },
      { name: 'Tribunal', coords: [-3.7008, 40.4261], zone: 'A', lines: ['1', '10'] },
      { name: 'Plaza de España', coords: [-3.7126, 40.4234], zone: 'A', lines: ['3', '10'] },
      { name: 'Príncipe Pío', coords: [-3.7198, 40.4208], zone: 'A', lines: ['6', '10', 'Ramal'] },
      { name: 'Lago', coords: [-3.7365, 40.4172], zone: 'A', lines: ['10'] },
      { name: 'Batán', coords: [-3.7531, 40.4068], zone: 'A', lines: ['10'] },
      { name: 'Casa de Campo', coords: [-3.7582, 40.4172], zone: 'A', lines: ['5', '10'] },
      { name: 'Colonia Jardín', coords: [-3.7745, 40.3981], zone: 'A', lines: ['10'] },
      { name: 'Aviación Española', coords: [-3.7845, 40.3842], zone: 'A', lines: ['10'] },
      { name: 'Cuatro Vientos', coords: [-3.7938, 40.3732], zone: 'A', lines: ['10', 'C-5'] },
      { name: 'Joaquín Vilumbrales', coords: [-3.8112, 40.3582], zone: 'B1', lines: ['10'] },
      { name: 'Puerta del Sur', coords: [-3.8242, 40.3475], zone: 'B1', lines: ['10', '12'] }
    ]
  },
  {
    line: '12',
    name: 'Línea 12 (MetroSur)',
    color: '#B1A934',
    stations: [
      { name: 'Puerta del Sur', coords: [-3.8242, 40.3475], zone: 'B1', lines: ['10', '12'] },
      { name: 'San Nicasio', coords: [-3.7745, 40.3342], zone: 'B1', lines: ['12'] },
      { name: 'Leganés Central', coords: [-3.7663, 40.3308], zone: 'B1', lines: ['12', 'C-5'] },
      { name: 'Hospital Severo Ochoa', coords: [-3.7582, 40.3242], zone: 'B1', lines: ['12'] },
      { name: 'Casa del Reloj', coords: [-3.7621, 40.3201], zone: 'B1', lines: ['12'] },
      { name: 'Julián Besteiro', coords: [-3.7681, 40.3152], zone: 'B1', lines: ['12'] },
      { name: 'El Carrascal', coords: [-3.7612, 40.3105], zone: 'B1', lines: ['12'] },
      { name: 'El Casar', coords: [-3.7198, 40.3168], zone: 'B1', lines: ['12', 'C-3'] },
      { name: 'Juan de la Cierva', coords: [-3.7242, 40.3112], zone: 'B1', lines: ['12'] },
      { name: 'Getafe Central', coords: [-3.7315, 40.3075], zone: 'B1', lines: ['12', 'C-4'] },
      { name: 'Alonso de Mendoza', coords: [-3.7365, 40.2982], zone: 'B1', lines: ['12'] },
      { name: 'Conservatorio', coords: [-3.7425, 40.2921], zone: 'B1', lines: ['12'] },
      { name: 'Arroyo Culebro', coords: [-3.7512, 40.2865], zone: 'B1', lines: ['12'] },
      { name: 'Parque de los Estados', coords: [-3.7825, 40.2842], zone: 'B2', lines: ['12'] },
      { name: 'Fuenlabrada Central', coords: [-3.7937, 40.2828], zone: 'B2', lines: ['12', 'C-5'] },
      { name: 'Parque Europa', coords: [-3.8052, 40.2812], zone: 'B2', lines: ['12'] },
      { name: 'Hospital de Fuenlabrada', coords: [-3.8198, 40.2835], zone: 'B2', lines: ['12'] },
      { name: 'Loranca', coords: [-3.8375, 40.2952], zone: 'B2', lines: ['12'] },
      { name: 'Manuela Malasaña', coords: [-3.8542, 40.3082], zone: 'B2', lines: ['12'] },
      { name: 'Hospital de Móstoles', coords: [-3.8612, 40.3155], zone: 'B2', lines: ['12'] },
      { name: 'Pradillo', coords: [-3.8642, 40.3201], zone: 'B2', lines: ['12'] },
      { name: 'Móstoles Central', coords: [-3.8646, 40.3235], zone: 'B2', lines: ['12', 'C-5'] },
      { name: 'Universidad Rey Juan Carlos', coords: [-3.8682, 40.3335], zone: 'B2', lines: ['12'] },
      { name: 'Parque Oeste', coords: [-3.8475, 40.3421], zone: 'B1', lines: ['12'] },
      { name: 'Alcorcón Central', coords: [-3.8291, 40.3486], zone: 'B1', lines: ['12', 'C-5'] }
    ]
  }
];

const metroFeatures = [];
const uniqueMetroStations = new Map();

for (const lineDef of metroLinesData) {
  // Add line feature
  const lineCoords = lineDef.stations.map((s) => [round5(s.coords[0]), round5(s.coords[1])]);
  metroFeatures.push({
    type: 'Feature',
    id: `metro-line-${lineDef.line}`,
    geometry: {
      type: 'LineString',
      coordinates: lineCoords
    },
    properties: {
      type: 'line',
      network: 'metro',
      line: lineDef.line,
      name: lineDef.name,
      color: lineDef.color
    }
  });

  // Track stations
  for (const st of lineDef.stations) {
    const key = `${st.name}-${st.zone}`;
    if (!uniqueMetroStations.has(key)) {
      uniqueMetroStations.set(key, {
        id: `metro-st-${st.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: st.name,
        network: 'metro',
        zone: st.zone,
        coordinates: [round5(st.coords[0]), round5(st.coords[1])],
        lines: [...st.lines],
        wheelchairAccessible: true
      });
    } else {
      const existing = uniqueMetroStations.get(key);
      for (const l of st.lines) {
        if (!existing.lines.includes(l)) existing.lines.push(l);
      }
    }
  }
}

for (const st of uniqueMetroStations.values()) {
  metroFeatures.push({
    type: 'Feature',
    id: st.id,
    geometry: {
      type: 'Point',
      coordinates: st.coordinates
    },
    properties: {
      id: st.id,
      name: st.name,
      network: 'metro',
      lines: st.lines,
      zone: st.zone,
      wheelchairAccessible: st.wheelchairAccessible,
      type: 'station'
    }
  });
}

fs.writeFileSync(
  path.join(outputDir, 'metro.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: metroFeatures }, null, 2)
);

// ─── 3. CERCANÍAS RENFE ─────────────────────────────────────────────────────
console.log('Generating cercanias.geojson...');

const cercaniasLinesData = [
  {
    line: 'C-1',
    name: 'Línea C-1 (Príncipe Pío - Chamartín - Aeropuerto T4)',
    color: '#009FE3',
    stations: [
      { name: 'Príncipe Pío', coords: [-3.7198, 40.4208], zone: 'A', lines: ['C-1', 'C-7', 'C-10'] },
      { name: 'Pirámides', coords: [-3.7121, 40.4022], zone: 'A', lines: ['C-1', 'C-10'] },
      { name: 'Delicias', coords: [-3.6931, 40.3982], zone: 'A', lines: ['C-1', 'C-10'] },
      { name: 'Méndez Álvaro', coords: [-3.6781, 40.3956], zone: 'A', lines: ['C-1', 'C-5', 'C-7', 'C-10'] },
      { name: 'Atocha', coords: [-3.6908, 40.4068], zone: 'A', lines: ['C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-7', 'C-8', 'C-10'] },
      { name: 'Recoletos', coords: [-3.6912, 40.4225], zone: 'A', lines: ['C-1', 'C-2', 'C-7', 'C-8', 'C-10'] },
      { name: 'Nuevos Ministerios', coords: [-3.6917, 40.4464], zone: 'A', lines: ['C-1', 'C-2', 'C-3', 'C-4', 'C-7', 'C-8', 'C-10'] },
      { name: 'Chamartín', coords: [-3.6823, 40.4721], zone: 'A', lines: ['C-1', 'C-2', 'C-3', 'C-4', 'C-7', 'C-8', 'C-10'] },
      { name: 'Fuente de la Mora', coords: [-3.6631, 40.4842], zone: 'A', lines: ['C-1', 'C-10'] },
      { name: 'Valdebebas', coords: [-3.6212, 40.4891], zone: 'A', lines: ['C-1', 'C-10'] },
      { name: 'Aeropuerto T4', coords: [-3.5932, 40.4918], zone: 'A', lines: ['C-1', 'C-10'] }
    ]
  },
  {
    line: 'C-2',
    name: 'Línea C-2 (Guadalajara - Atocha - Chamartín)',
    color: '#00843D',
    stations: [
      { name: 'Guadalajara', coords: [-3.1788, 40.6402], zone: 'E1', lines: ['C-2', 'C-8'] },
      { name: 'Azuqueca', coords: [-3.2642, 40.5695], zone: 'E1', lines: ['C-2', 'C-8'] },
      { name: 'Meco', coords: [-3.3242, 40.5312], zone: 'B3', lines: ['C-2', 'C-8'] },
      { name: 'Alcalá de Henares Universidad', coords: [-3.3452, 40.5052], zone: 'B3', lines: ['C-2', 'C-8'] },
      { name: 'Alcalá de Henares', coords: [-3.3615, 40.4891], zone: 'B3', lines: ['C-2', 'C-7', 'C-8'] },
      { name: 'La Garena', coords: [-3.3951, 40.4802], zone: 'B3', lines: ['C-2', 'C-7', 'C-8'] },
      { name: 'Soto del Henares', coords: [-3.4421, 40.4621], zone: 'B2', lines: ['C-2', 'C-7', 'C-8'] },
      { name: 'Torrejón de Ardoz', coords: [-3.4795, 40.4578], zone: 'B2', lines: ['C-2', 'C-7', 'C-8'] },
      { name: 'San Fernando', coords: [-3.5352, 40.4308], zone: 'B1', lines: ['C-2', 'C-7'] },
      { name: 'Coslada', coords: [-3.5623, 40.4258], zone: 'B1', lines: ['C-2', 'C-7'] },
      { name: 'Vicálvaro', coords: [-3.6052, 40.4038], zone: 'A', lines: ['C-2', 'C-7', 'C-8'] },
      { name: 'Santa Eugenia', coords: [-3.6148, 40.3882], zone: 'A', lines: ['C-2', 'C-7', 'C-8'] },
      { name: 'Vallecas', coords: [-3.6267, 40.3875], zone: 'A', lines: ['C-2', 'C-7', 'C-8'] },
      { name: 'El Pozo', coords: [-3.6558, 40.3901], zone: 'A', lines: ['C-2', 'C-7', 'C-8'] },
      { name: 'Asamblea de Madrid-Entrevías', coords: [-3.6685, 40.3942], zone: 'A', lines: ['C-2', 'C-7', 'C-8'] },
      { name: 'Atocha', coords: [-3.6908, 40.4068], zone: 'A', lines: ['C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-7', 'C-8', 'C-10'] }
    ]
  },
  {
    line: 'C-3',
    name: 'Línea C-3 (Aranjuez - Atocha - Chamartín - El Escorial)',
    color: '#782F40',
    stations: [
      { name: 'Aranjuez', coords: [-3.6167, 40.0384], zone: 'C1', lines: ['C-3'] },
      { name: 'Ciempozuelos', coords: [-3.6148, 40.1582], zone: 'B3', lines: ['C-3'] },
      { name: 'Valdemoro', coords: [-3.6738, 40.1892], zone: 'B3', lines: ['C-3'] },
      { name: 'Pinto', coords: [-3.6998, 40.2435], zone: 'B2', lines: ['C-3'] },
      { name: 'Getafe Industrial', coords: [-3.7082, 40.2982], zone: 'B1', lines: ['C-3'] },
      { name: 'El Casar', coords: [-3.7198, 40.3168], zone: 'B1', lines: ['C-3', '12'] },
      { name: 'San Cristóbal Industrial', coords: [-3.6958, 40.3375], zone: 'A', lines: ['C-3'] },
      { name: 'San Cristóbal de los Ángeles', coords: [-3.6931, 40.3445], zone: 'A', lines: ['C-3'] },
      { name: 'Villaverde Bajo', coords: [-3.6901, 40.3582], zone: 'A', lines: ['C-3', 'C-4'] },
      { name: 'Atocha', coords: [-3.6908, 40.4068], zone: 'A', lines: ['C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-7', 'C-8', 'C-10'] },
      { name: 'Sol', coords: [-3.7038, 40.4168], zone: 'A', lines: ['C-3', 'C-4', '1', '2', '3'] },
      { name: 'Nuevos Ministerios', coords: [-3.6917, 40.4464], zone: 'A', lines: ['C-1', 'C-2', 'C-3', 'C-4', 'C-7', 'C-8', 'C-10'] },
      { name: 'Chamartín', coords: [-3.6823, 40.4721], zone: 'A', lines: ['C-1', 'C-2', 'C-3', 'C-4', 'C-7', 'C-8', 'C-10'] }
    ]
  },
  {
    line: 'C-4',
    name: 'Línea C-4 (Parla - Atocha - Chamartín - Colmenar / Alcobendas)',
    color: '#003865',
    stations: [
      { name: 'Parla', coords: [-3.7712, 40.2371], zone: 'B2', lines: ['C-4'] },
      { name: 'Getafe Sector 3', coords: [-3.7371, 40.2922], zone: 'B1', lines: ['C-4'] },
      { name: 'Getafe Centro', coords: [-3.7315, 40.3075], zone: 'B1', lines: ['C-4', '12'] },
      { name: 'Las Margaritas Universidad', coords: [-3.7225, 40.3201], zone: 'B1', lines: ['C-4'] },
      { name: 'Villaverde Alto', coords: [-3.7108, 40.3421], zone: 'A', lines: ['C-4', 'C-5', '3'] },
      { name: 'Villaverde Bajo', coords: [-3.6901, 40.3582], zone: 'A', lines: ['C-3', 'C-4'] },
      { name: 'Atocha', coords: [-3.6908, 40.4068], zone: 'A', lines: ['C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-7', 'C-8', 'C-10'] },
      { name: 'Sol', coords: [-3.7038, 40.4168], zone: 'A', lines: ['C-3', 'C-4'] },
      { name: 'Nuevos Ministerios', coords: [-3.6917, 40.4464], zone: 'A', lines: ['C-1', 'C-2', 'C-3', 'C-4', 'C-7', 'C-8', 'C-10'] },
      { name: 'Chamartín', coords: [-3.6823, 40.4721], zone: 'A', lines: ['C-1', 'C-2', 'C-3', 'C-4', 'C-7', 'C-8', 'C-10'] },
      { name: 'Fuencarral', coords: [-3.6922, 40.4912], zone: 'A', lines: ['C-4'] },
      { name: 'Cantoblanco Universidad', coords: [-3.6958, 40.5422], zone: 'B1', lines: ['C-4'] },
      { name: 'Tres Cantos', coords: [-3.7128, 40.5982], zone: 'B2', lines: ['C-4'] },
      { name: 'Colmenar Viejo', coords: [-3.7621, 40.6482], zone: 'B3', lines: ['C-4'] }
    ]
  },
  {
    line: 'C-5',
    name: 'Línea C-5 (Móstoles El Soto - Atocha - Humanes)',
    color: '#F1B434',
    stations: [
      { name: 'Móstoles El Soto', coords: [-3.8824, 40.3168], zone: 'B2', lines: ['C-5'] },
      { name: 'Móstoles', coords: [-3.8646, 40.3235], zone: 'B2', lines: ['C-5', '12'] },
      { name: 'Las Retamas', coords: [-3.8421, 40.3392], zone: 'B1', lines: ['C-5'] },
      { name: 'Alcorcón', coords: [-3.8291, 40.3486], zone: 'B1', lines: ['C-5', '12'] },
      { name: 'San José de Valderas', coords: [-3.8082, 40.3601], zone: 'B1', lines: ['C-5'] },
      { name: 'Cuatro Vientos', coords: [-3.7938, 40.3732], zone: 'A', lines: ['C-5', '10'] },
      { name: 'Las Águilas', coords: [-3.7765, 40.3802], zone: 'A', lines: ['C-5'] },
      { name: 'Fanjul', coords: [-3.7652, 40.3851], zone: 'A', lines: ['C-5'] },
      { name: 'Aluche', coords: [-3.7558, 40.3892], zone: 'A', lines: ['C-5', '5'] },
      { name: 'Laguna', coords: [-3.7451, 40.3992], zone: 'A', lines: ['C-5', '6'] },
      { name: 'Embajadores', coords: [-3.7029, 40.4052], zone: 'A', lines: ['C-5', '3'] },
      { name: 'Atocha', coords: [-3.6908, 40.4068], zone: 'A', lines: ['C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-7', 'C-8', 'C-10'] },
      { name: 'Méndez Álvaro', coords: [-3.6781, 40.3956], zone: 'A', lines: ['C-1', 'C-5', 'C-7', 'C-10'] },
      { name: 'Doce de Octubre', coords: [-3.6975, 40.3782], zone: 'A', lines: ['C-5'] },
      { name: 'Orcasitas', coords: [-3.7082, 40.3685], zone: 'A', lines: ['C-5'] },
      { name: 'Puente Alcocer', coords: [-3.7125, 40.3551], zone: 'A', lines: ['C-5'] },
      { name: 'Villaverde Alto', coords: [-3.7108, 40.3421], zone: 'A', lines: ['C-4', 'C-5'] },
      { name: 'Zarzaquemada', coords: [-3.7482, 40.3385], zone: 'B1', lines: ['C-5'] },
      { name: 'Leganés', coords: [-3.7663, 40.3308], zone: 'B1', lines: ['C-5', '12'] },
      { name: 'Parque Polvoranca', coords: [-3.7801, 40.3152], zone: 'B1', lines: ['C-5'] },
      { name: 'La Serna', coords: [-3.7885, 40.2982], zone: 'B2', lines: ['C-5'] },
      { name: 'Fuenlabrada', coords: [-3.7937, 40.2828], zone: 'B2', lines: ['C-5', '12'] },
      { name: 'Humanes', coords: [-3.8341, 40.2523], zone: 'B3', lines: ['C-5'] }
    ]
  }
];

const cercaniasFeatures = [];
const uniqueCercaniasStations = new Map();

for (const lineDef of cercaniasLinesData) {
  const lineCoords = lineDef.stations.map((s) => [round5(s.coords[0]), round5(s.coords[1])]);
  cercaniasFeatures.push({
    type: 'Feature',
    id: `cercanias-line-${lineDef.line}`,
    geometry: {
      type: 'LineString',
      coordinates: lineCoords
    },
    properties: {
      type: 'line',
      network: 'cercanias',
      line: lineDef.line,
      name: lineDef.name,
      color: lineDef.color
    }
  });

  for (const st of lineDef.stations) {
    const key = `${st.name}-${st.zone}`;
    if (!uniqueCercaniasStations.has(key)) {
      uniqueCercaniasStations.set(key, {
        id: `cercanias-st-${st.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: st.name,
        network: 'cercanias',
        zone: st.zone,
        coordinates: [round5(st.coords[0]), round5(st.coords[1])],
        lines: [...st.lines],
        wheelchairAccessible: true
      });
    } else {
      const existing = uniqueCercaniasStations.get(key);
      for (const l of st.lines) {
        if (!existing.lines.includes(l)) existing.lines.push(l);
      }
    }
  }
}

for (const st of uniqueCercaniasStations.values()) {
  cercaniasFeatures.push({
    type: 'Feature',
    id: st.id,
    geometry: {
      type: 'Point',
      coordinates: st.coordinates
    },
    properties: {
      id: st.id,
      name: st.name,
      network: 'cercanias',
      lines: st.lines,
      zone: st.zone,
      wheelchairAccessible: st.wheelchairAccessible,
      type: 'station'
    }
  });
}

fs.writeFileSync(
  path.join(outputDir, 'cercanias.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: cercaniasFeatures }, null, 2)
);

// ─── 4. EMT BUSES (MADRID CAPITAL) ──────────────────────────────────────────
console.log('Generating emt.geojson...');

// Real central bus hubs & routes across Madrid
const emtHubs = [
  { name: 'Plaza de Cibeles', coords: [-3.6922, 40.4196], lines: ['1', '2', '9', '14', '15', '20', '27', '34', '51', '52', '53', '74', '146', '203'] },
  { name: 'Puerta de Alcalá', coords: [-3.6888, 40.4199], lines: ['1', '2', '9', '15', '19', '20', '28', '51', '52', '74', '146'] },
  { name: 'Plaza de Colón', coords: [-3.6901, 40.4252], lines: ['5', '14', '21', '27', '45', '53', '150'] },
  { name: 'Paseo del Prado - Atocha', coords: [-3.6931, 40.4101], lines: ['6', '10', '14', '26', '27', '32', '34', '45', 'C1', 'C2'] },
  { name: 'Plaza de Neptuno', coords: [-3.6942, 40.4152], lines: ['10', '14', '27', '34', '37', '45', '001'] },
  { name: 'Plaza de Callao', coords: [-3.7058, 40.4202], lines: ['44', '75', '133', '146', '147', '148'] },
  { name: 'Plaza de España', coords: [-3.7126, 40.4234], lines: ['1', '2', '3', '25', '39', '44', '46', '74', '75', '133', '138', '148'] },
  { name: 'Moncloa (Intercambiador EMT)', coords: [-3.7196, 40.4354], lines: ['1', '16', '44', '46', '61', '82', '83', '132', '133', '160', '161', '162', 'A', 'G'] },
  { name: 'Plaza de Castilla (Intercambiador EMT)', coords: [-3.6892, 40.4667], lines: ['5', '27', '42', '49', '66', '67', '70', '107', '124', '129', '134', '135', '147', '173'] },
  { name: 'Nuevos Ministerios EMT', coords: [-3.6917, 40.4464], lines: ['7', '14', '27', '40', '126', '147', '150', 'C1', 'C2'] },
  { name: 'Cuatro Caminos EMT', coords: [-3.7042, 40.4468], lines: ['3', '37', '45', '64', '66', '124', '127', '128', 'F', 'C1', 'C2'] },
  { name: 'Manuel Becerra EMT', coords: [-3.6672, 40.4298], lines: ['2', '12', '21', '38', '43', '48', '53', '56', '71', '106', '110', '143', '146', '156', 'C1', 'C2'] },
  { name: 'Avenida de América EMT', coords: [-3.6769, 40.4381], lines: ['12', '72', '73', '114', '115', '122', '200', 'C1', 'C2'] },
  { name: 'Plaza Elíptica EMT', coords: [-3.7181, 40.3852], lines: ['47', '55', '60', '81', '116', '155', '247', 'E1'] },
  { name: 'Legazpi EMT', coords: [-3.6951, 40.3912], zone: 'A', lines: ['6', '8', '18', '19', '22', '45', '47', '59', '62', '76', '78', '79', '85', '86', '123', '148', '156'] },
  { name: 'Aluche EMT', coords: [-3.7558, 40.3892], zone: 'A', lines: ['17', '31', '121', '131', '138', '139', '155', 'H'] },
  { name: 'Oporto EMT', coords: [-3.7311, 40.3888], zone: 'A', lines: ['34', '35', '55', '81', '108', '118'] },
  { name: 'Méndez Álvaro EMT', coords: [-3.6781, 40.3956], zone: 'A', lines: ['8', '102', '113', '148', '152'] },
  { name: 'Conde de Casal EMT', coords: [-3.6719, 40.4072], zone: 'A', lines: ['14', '32', '56', '63', '143', '145', '156'] },
  { name: 'Feria de Madrid EMT', coords: [-3.6152, 40.4645], zone: 'A', lines: ['73', '104', '112', '122'] },
  { name: 'Aeropuerto T1-T2 EMT', coords: [-3.5786, 40.4682], zone: 'A', lines: ['101', '200', '203'] },
  { name: 'Aeropuerto T4 EMT', coords: [-3.5932, 40.4918], zone: 'A', lines: ['200', '203'] }
];

// Generate comprehensive EMT stops along main urban avenues
const emtFeatures = [];
let stopIndex = 1;

// Add principal hubs
for (const hub of emtHubs) {
  emtFeatures.push({
    type: 'Feature',
    id: `emt-stop-${stopIndex++}`,
    geometry: {
      type: 'Point',
      coordinates: [round5(hub.coords[0]), round5(hub.coords[1])]
    },
    properties: {
      id: `emt-${stopIndex}`,
      name: hub.name,
      network: 'emt',
      lines: hub.lines,
      zone: 'A',
      wheelchairAccessible: true,
      type: 'stop'
    }
  });
}

// Generate intermediate stops along major avenues (Castellana, Bravo Murillo, Alcalá, Gran Vía, etc.)
const corridors = [
  { name: 'Paseo de la Castellana', start: [-3.6892, 40.4667], end: [-3.6917, 40.4252], count: 20, lines: ['14', '27', '40', '147', '150'] },
  { name: 'Calle de Alcalá', start: [-3.7015, 40.4181], end: [-3.6265, 40.4352], count: 24, lines: ['21', '38', '53', '70', '106', '146'] },
  { name: 'Calle Bravo Murillo', start: [-3.7042, 40.4468], end: [-3.6961, 40.4639], count: 14, lines: ['3', '64', '66', '124', '128'] },
  { name: 'Gran Vía', start: [-3.6948, 40.4189], end: [-3.7126, 40.4234], count: 8, lines: ['1', '2', '46', '74', '146', '001'] },
  { name: 'Princesa', start: [-3.7126, 40.4234], end: [-3.7196, 40.4354], count: 10, lines: ['1', '44', '133', 'C1', 'C2'] },
  { name: 'General Ricardos', start: [-3.7181, 40.3952], end: [-3.7425, 40.3802], count: 12, lines: ['34', '35', '118', '119'] },
  { name: 'Albufera', start: [-3.6685, 40.3982], end: [-3.6267, 40.3875], count: 14, lines: ['10', '24', '54', '57', '58', '111', '144'] },
  { name: 'Santa María de la Cabeza', start: [-3.6958, 40.4025], end: [-3.7181, 40.3852], count: 12, lines: ['47', '55', '60', '81', '247'] },
  { name: 'Arturo Soria', start: [-3.6558, 40.4402], end: [-3.6669, 40.4801], count: 18, lines: ['9', '11', '70', '72', '73'] }
];

for (const c of corridors) {
  for (let i = 1; i <= c.count; i++) {
    const fraction = i / (c.count + 1);
    const lng = c.start[0] + (c.end[0] - c.start[0]) * fraction + (Math.sin(i * 1.5) * 0.0006);
    const lat = c.start[1] + (c.end[1] - c.start[1]) * fraction + (Math.cos(i * 1.5) * 0.0006);
    emtFeatures.push({
      type: 'Feature',
      id: `emt-stop-${stopIndex++}`,
      geometry: {
        type: 'Point',
        coordinates: [round5(lng), round5(lat)]
      },
      properties: {
        id: `emt-${stopIndex}`,
        name: `${c.name} - Parada ${i}`,
        network: 'emt',
        lines: c.lines,
        zone: 'A',
        wheelchairAccessible: i % 5 !== 0,
        type: 'stop'
      }
    });
  }
}

fs.writeFileSync(
  path.join(outputDir, 'emt.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: emtFeatures }, null, 2)
);

// ─── 5. INTERURBAN BUSES (CRTM CORRIDORS) ───────────────────────────────────
console.log('Generating interurban.geojson...');

const interurbanFeatures = [];
let interStopIndex = 1;

const interurbanCorridors = [
  {
    corridor: 'Corredor 1 (A-1 Burgos)',
    hub: 'Plaza de Castilla',
    destinations: [
      { name: 'Alcobendas (Av. España)', coords: [-3.6375, 40.5471], zone: 'B1', lines: ['151', '152C', '153', '158'] },
      { name: 'San Sebastián de los Reyes', coords: [-3.6275, 40.5518], zone: 'B1', lines: ['152C', '154', '156'] },
      { name: 'San Agustín del Guadalix', coords: [-3.6165, 40.6782], zone: 'B3', lines: ['191', '193'] },
      { name: 'El Molar', coords: [-3.5821, 40.7342], zone: 'C1', lines: ['191', '193', '197D'] },
      { name: 'Buitrago del Lozoya', coords: [-3.6375, 40.9932], zone: 'C2', lines: ['191'] }
    ]
  },
  {
    corridor: 'Corredor 2 (A-2 Barcelona)',
    hub: 'Avenida de América',
    destinations: [
      { name: 'Coslada (Plaza Mayor)', coords: [-3.5623, 40.4258], zone: 'B1', lines: ['281', '282', '283', '284'] },
      { name: 'San Fernando de Henares', coords: [-3.5352, 40.4308], zone: 'B1', lines: ['281', '282', '284'] },
      { name: 'Torrejón de Ardoz (Terminal)', coords: [-3.4795, 40.4578], zone: 'B2', lines: ['223', '224', '224A', '226'] },
      { name: 'Alcalá de Henares (Vía Complutense)', coords: [-3.3615, 40.4891], zone: 'B3', lines: ['223', '227', '229', '252'] },
      { name: 'Azuqueca de Henares', coords: [-3.2642, 40.5695], zone: 'E1', lines: ['221A'] },
      { name: 'Guadalajara (Estación de Autobuses)', coords: [-3.1675, 40.6321], zone: 'E1', lines: ['221', 'VAC-243'] }
    ]
  },
  {
    corridor: 'Corredor 3 (A-3 Valencia)',
    hub: 'Conde de Casal',
    destinations: [
      { name: 'Rivas Urbanizaciones', coords: [-3.5412, 40.3582], zone: 'B1', lines: ['331', '332', '333', '334'] },
      { name: 'Rivas Futura', coords: [-3.5185, 40.3421], zone: 'B2', lines: ['331', '332', '334'] },
      { name: 'Arganda del Rey (Plaza de la Constitución)', coords: [-3.4447, 40.2982], zone: 'B3', lines: ['312', '312A', '313', '350A'] },
      { name: 'Perales de Tajuña', coords: [-3.3512, 40.2341], zone: 'B3', lines: ['351', '352', '353'] },
      { name: 'Chinchón', coords: [-3.4242, 40.1412], zone: 'C1', lines: ['337'] },
      { name: 'Tarancón', coords: [-3.0075, 40.0105], zone: 'E2', lines: ['352', '353'] }
    ]
  },
  {
    corridor: 'Corredor 4 (A-4 / A-42 Andalucía & Toledo)',
    hub: 'Plaza Elíptica / Méndez Álvaro',
    destinations: [
      { name: 'Getafe (Calle Madrid)', coords: [-3.7315, 40.3075], zone: 'B1', lines: ['441', '442', '443', '444', '448'] },
      { name: 'Leganés (Av. Fuenlabrada)', coords: [-3.7663, 40.3308], zone: 'B1', lines: ['480', '481', '484', '485', '486'] },
      { name: 'Parla (Calle Real)', coords: [-3.7712, 40.2371], zone: 'B2', lines: ['461', '462', '463', '469'] },
      { name: 'Pinto (Parque Egido)', coords: [-3.6998, 40.2435], zone: 'B2', lines: ['421', '422', '428'] },
      { name: 'Valdemoro (Paseo de la Estación)', coords: [-3.6738, 40.1892], zone: 'B3', lines: ['422', '424', '428'] },
      { name: 'Ciempozuelos', coords: [-3.6148, 40.1582], zone: 'B3', lines: ['425', '426'] },
      { name: 'Aranjuez (Infantas)', coords: [-3.6067, 40.0321], zone: 'C1', lines: ['423', '429', '430'] },
      { name: 'Illescas (Señorío)', coords: [-3.8475, 40.1282], zone: 'E1', lines: ['VAC-023'] },
      { name: 'Toledo (Estación de Autobuses)', coords: [-4.0201, 39.8652], zone: 'E2', lines: ['VAC-023'] }
    ]
  },
  {
    corridor: 'Corredor 5 (A-5 Extremadura)',
    hub: 'Príncipe Pío',
    destinations: [
      { name: 'Alcorcón (Los Castillos)', coords: [-3.8291, 40.3486], zone: 'B1', lines: ['511', '512', '513', '514', '516'] },
      { name: 'Móstoles (Av. Portugal)', coords: [-3.8646, 40.3235], zone: 'B2', lines: ['521', '522', '523', '524', '526'] },
      { name: 'Villaviciosa de Odón', coords: [-3.9031, 40.3582], zone: 'B2', lines: ['518', '519'] },
      { name: 'Navalcarnero (Plaza de Toros)', coords: [-4.0152, 40.2882], zone: 'B3', lines: ['528', '529', '530', '531'] },
      { name: 'San Martín de Valdeiglesias', coords: [-4.4021, 40.3621], zone: 'C1', lines: ['551'] },
      { name: 'Talavera de la Reina (Estación Central)', coords: [-4.8312, 39.9601], zone: 'E2', lines: ['VAC-087'] }
    ]
  },
  {
    corridor: 'Corredor 6 (A-6 Coruña)',
    hub: 'Moncloa',
    destinations: [
      { name: 'Pozuelo de Alarcón (Av. Europa)', coords: [-3.8058, 40.4431], zone: 'B1', lines: ['656', '656A', '657', '658'] },
      { name: 'Majadahonda (Doctor Marañón)', coords: [-3.8631, 40.4682], zone: 'B1', lines: ['651', '652', '653', '654', '655'] },
      { name: 'Las Rozas (Burgo)', coords: [-3.8741, 40.4934], zone: 'B2', lines: ['621', '622', '624', '625', '626'] },
      { name: 'Torrelodones (Pueblo)', coords: [-3.9312, 40.5752], zone: 'B3', lines: ['611', '612', '613'] },
      { name: 'Collado Villalba (Estación Zoco)', coords: [-3.9984, 40.6288], zone: 'B3', lines: ['681', '682', '684', '687'] },
      { name: 'El Escorial / San Lorenzo', coords: [-4.1264, 40.5832], zone: 'C1', lines: ['661', '664'] },
      { name: 'Guadarrama', coords: [-4.0891, 40.6721], zone: 'C1', lines: ['682', '684', '688'] },
      { name: 'Cercedilla (Plaza Mayor)', coords: [-4.0578, 40.7389], zone: 'C2', lines: ['684'] }
    ]
  }
];

// Corridors lines
for (const corr of interurbanCorridors) {
  for (const dest of corr.destinations) {
    interurbanFeatures.push({
      type: 'Feature',
      id: `interurban-stop-${interStopIndex++}`,
      geometry: {
        type: 'Point',
        coordinates: [round5(dest.coords[0]), round5(dest.coords[1])]
      },
      properties: {
        id: `interurban-${interStopIndex}`,
        name: dest.name,
        corridor: corr.corridor,
        network: 'interurban',
        lines: dest.lines,
        zone: dest.zone,
        wheelchairAccessible: true,
        type: 'stop'
      }
    });
  }
}

fs.writeFileSync(
  path.join(outputDir, 'interurban.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: interurbanFeatures }, null, 2)
);

console.log('✅ GeoJSON preprocessing completed successfully!');
