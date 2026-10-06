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

const emtLinesData = [
  {
    line: '27',
    name: 'Línea 27 (Embajadores - Plaza de Castilla)',
    color: '#0284C7',
    stations: [
      { name: 'Glorieta de Embajadores (EMT)', coords: [-3.7029, 40.4052], zone: 'A', lines: ['27', 'C1', 'C2'] },
      { name: 'Ronda de Atocha', coords: [-3.6975, 40.4072], zone: 'A', lines: ['27', '34'] },
      { name: 'Paseo del Prado - Atocha', coords: [-3.6931, 40.4101], zone: 'A', lines: ['14', '27', '34', 'C1', '001'] },
      { name: 'Museo del Prado - Jardín Botánico', coords: [-3.6928, 40.4132], zone: 'A', lines: ['14', '27', '34', '001'] },
      { name: 'Plaza de Cánovas del Castillo (Neptuno)', coords: [-3.6942, 40.4152], zone: 'A', lines: ['14', '27', '34', '001'] },
      { name: 'Plaza de Cibeles', coords: [-3.6922, 40.4196], zone: 'A', lines: ['1', '2', '14', '27', '34', '001', '203'] },
      { name: 'Paseo de Recoletos - Biblioteca Nacional', coords: [-3.6912, 40.4225], zone: 'A', lines: ['14', '27', '150'] },
      { name: 'Plaza de Colón', coords: [-3.6901, 40.4252], zone: 'A', lines: ['14', '27', '150'] },
      { name: 'Paseo de la Castellana - Rubén Darío', coords: [-3.6898, 40.4312], zone: 'A', lines: ['14', '27', '150'] },
      { name: 'Paseo de la Castellana - Emilio Castelar', coords: [-3.6895, 40.4358], zone: 'A', lines: ['14', '27', '150'] },
      { name: 'Paseo de la Castellana - Gregorio Marañón', coords: [-3.6902, 40.4385], zone: 'A', lines: ['14', '27', '147', '150'] },
      { name: 'Museo de Ciencias Naturales', coords: [-3.6908, 40.4418], zone: 'A', lines: ['14', '27', '147', '150'] },
      { name: 'Nuevos Ministerios - Castellana', coords: [-3.6917, 40.4464], zone: 'A', lines: ['14', '27', '147', '150', 'C1', 'C2'] },
      { name: 'Paseo de la Castellana - Raimundo Fernández Villaverde', coords: [-3.6912, 40.4485], zone: 'A', lines: ['14', '27', '147', '150'] },
      { name: 'Paseo de la Castellana - San Germán', coords: [-3.6905, 40.4528], zone: 'A', lines: ['14', '27', '147', '150'] },
      { name: 'Santiago Bernabéu', coords: [-3.6899, 40.4552], zone: 'A', lines: ['14', '27', '147', '150'] },
      { name: 'Paseo de la Castellana - Rafael Salgado', coords: [-3.6895, 40.4585], zone: 'A', lines: ['14', '27', '147'] },
      { name: 'Paseo de la Castellana - Cuzco', coords: [-3.6892, 40.4612], zone: 'A', lines: ['14', '27', '147'] },
      { name: 'Paseo de la Castellana - Alberto Alcocer', coords: [-3.6888, 40.4638], zone: 'A', lines: ['14', '27', '147'] },
      { name: 'Plaza de Castilla (Intercambiador EMT)', coords: [-3.6892, 40.4667], zone: 'A', lines: ['27', '70', '147'] }
    ]
  },
  {
    line: '34',
    name: 'Línea 34 (Cibeles - Las Águilas)',
    color: '#0284C7',
    stations: [
      { name: 'Plaza de Cibeles', coords: [-3.6922, 40.4196], zone: 'A', lines: ['1', '2', '14', '27', '34', '001', '203'] },
      { name: 'Sevilla - Alcalá', coords: [-3.6997, 40.4174], zone: 'A', lines: ['2', '34', '150'] },
      { name: 'Sol - Benavente', coords: [-3.7038, 40.4145], zone: 'A', lines: ['34'] },
      { name: 'Tirso de Molina (EMT)', coords: [-3.7049, 40.4124], zone: 'A', lines: ['34'] },
      { name: 'Plaza de la Cebada - La Latina', coords: [-3.7095, 40.4112], zone: 'A', lines: ['34'] },
      { name: 'Puerta de Toledo (EMT)', coords: [-3.7118, 40.4068], zone: 'A', lines: ['34', 'C1', 'C2'] },
      { name: 'Glorieta de Pirámides', coords: [-3.7142, 40.4021], zone: 'A', lines: ['34'] },
      { name: 'Marqués de Vadillo', coords: [-3.7168, 40.3982], zone: 'A', lines: ['34'] },
      { name: 'General Ricardos - Comillas', coords: [-3.7212, 40.3951], zone: 'A', lines: ['34'] },
      { name: 'General Ricardos - Urgel', coords: [-3.7258, 40.3921], zone: 'A', lines: ['34'] },
      { name: 'Oporto (Intercambiador EMT)', coords: [-3.7311, 40.3888], zone: 'A', lines: ['34'] },
      { name: 'General Ricardos - Vista Alegre', coords: [-3.7365, 40.3852], zone: 'A', lines: ['34'] },
      { name: 'Eugenia de Montijo (EMT)', coords: [-3.7425, 40.3802], zone: 'A', lines: ['34'] },
      { name: 'Avenida de los Poblados - Empalme', coords: [-3.7501, 40.3831], zone: 'A', lines: ['34'] },
      { name: 'Aluche (Intercambiador EMT)', coords: [-3.7558, 40.3892], zone: 'A', lines: ['34'] },
      { name: 'Avenida de las Águilas', coords: [-3.7652, 40.3845], zone: 'A', lines: ['34'] },
      { name: 'Las Águilas - Cercanías (Terminal)', coords: [-3.7765, 40.3802], zone: 'A', lines: ['34'] }
    ]
  },
  {
    line: '1',
    name: 'Línea 1 (Cristo Rey - Prosperidad)',
    color: '#0284C7',
    stations: [
      { name: 'Plaza de Cristo Rey (Terminal)', coords: [-3.7185, 40.4398], zone: 'A', lines: ['1', 'C1', 'C2'] },
      { name: 'Moncloa (Intercambiador EMT)', coords: [-3.7196, 40.4354], zone: 'A', lines: ['1', 'C1', 'C2', '001'] },
      { name: 'Princesa - Alberto Aguilera', coords: [-3.7158, 40.4308], zone: 'A', lines: ['1', '001', 'C1'] },
      { name: 'Plaza de España - Princesa', coords: [-3.7126, 40.4234], zone: 'A', lines: ['1', '001'] },
      { name: 'Gran Vía - Santo Domingo', coords: [-3.7089, 40.4208], zone: 'A', lines: ['1', '001', '146', '147'] },
      { name: 'Gran Vía - Callao', coords: [-3.7058, 40.4202], zone: 'A', lines: ['1', '001', '146', '147'] },
      { name: 'Gran Vía - Red de San Luis', coords: [-3.7015, 40.4201], zone: 'A', lines: ['1', '001', '146', '147'] },
      { name: 'Plaza de Cibeles', coords: [-3.6922, 40.4196], zone: 'A', lines: ['1', '2', '14', '27', '34', '001', '203'] },
      { name: 'Puerta de Alcalá', coords: [-3.6888, 40.4199], zone: 'A', lines: ['1', '2', '146'] },
      { name: 'Velázquez - Villanueva', coords: [-3.6852, 40.4231], zone: 'A', lines: ['1'] },
      { name: 'Velázquez - Goya', coords: [-3.6841, 40.4262], zone: 'A', lines: ['1'] },
      { name: 'Velázquez - Diego de León', coords: [-3.6828, 40.4345], zone: 'A', lines: ['1'] },
      { name: 'Avenida de América (Intercambiador EMT)', coords: [-3.6769, 40.4381], zone: 'A', lines: ['1', 'C1', 'C2', '200'] },
      { name: 'Prosperidad - Cartagena (Terminal)', coords: [-3.6712, 40.4425], zone: 'A', lines: ['1'] }
    ]
  },
  {
    line: '2',
    name: 'Línea 2 (Manuel Becerra - Reina Victoria)',
    color: '#0284C7',
    stations: [
      { name: 'Manuel Becerra (Terminal EMT)', coords: [-3.6672, 40.4298], zone: 'A', lines: ['2', 'C1', 'C2'] },
      { name: 'Goya - Conde de Peñalver', coords: [-3.6749, 40.4243], zone: 'A', lines: ['2'] },
      { name: 'Goya - Príncipe de Vergara', coords: [-3.6798, 40.4225], zone: 'A', lines: ['2'] },
      { name: 'Puerta de Alcalá', coords: [-3.6888, 40.4199], zone: 'A', lines: ['1', '2', '146'] },
      { name: 'Plaza de Cibeles', coords: [-3.6922, 40.4196], zone: 'A', lines: ['1', '2', '14', '27', '34', '001', '203'] },
      { name: 'Sevilla - Alcalá', coords: [-3.6997, 40.4174], zone: 'A', lines: ['2', '34', '150'] },
      { name: 'San Bernardo - Glorieta de Ruiz Jiménez', coords: [-3.7061, 40.4299], zone: 'A', lines: ['2', '147'] },
      { name: 'Glorieta de Quevedo', coords: [-3.7051, 40.4338], zone: 'A', lines: ['2', '147'] },
      { name: 'Cuatro Caminos (Intercambiador EMT)', coords: [-3.7042, 40.4468], zone: 'A', lines: ['2', 'C1', 'C2'] },
      { name: 'Avenida de Reina Victoria (Terminal)', coords: [-3.7112, 40.4478], zone: 'A', lines: ['2', 'C1', 'C2'] }
    ]
  },
  {
    line: '14',
    name: 'Línea 14 (Conde de Casal - Avenida Pío XII)',
    color: '#0284C7',
    stations: [
      { name: 'Conde de Casal (Intercambiador EMT)', coords: [-3.6719, 40.4072], zone: 'A', lines: ['14', 'C1', 'C2'] },
      { name: 'Mariano de Cavia', coords: [-3.6781, 40.4085], zone: 'A', lines: ['14'] },
      { name: 'Paseo de la Reina Cristina', coords: [-3.6852, 40.4095], zone: 'A', lines: ['14'] },
      { name: 'Paseo del Prado - Atocha', coords: [-3.6931, 40.4101], zone: 'A', lines: ['14', '27', '34', 'C1', '001'] },
      { name: 'Plaza de Cánovas del Castillo (Neptuno)', coords: [-3.6942, 40.4152], zone: 'A', lines: ['14', '27', '34', '001'] },
      { name: 'Plaza de Cibeles', coords: [-3.6922, 40.4196], zone: 'A', lines: ['1', '2', '14', '27', '34', '001', '203'] },
      { name: 'Plaza de Colón', coords: [-3.6901, 40.4252], zone: 'A', lines: ['14', '27', '150'] },
      { name: 'Paseo de la Castellana - Gregorio Marañón', coords: [-3.6902, 40.4385], zone: 'A', lines: ['14', '27', '147', '150'] },
      { name: 'Nuevos Ministerios - Castellana', coords: [-3.6917, 40.4464], zone: 'A', lines: ['14', '27', '147', '150', 'C1', 'C2'] },
      { name: 'Santiago Bernabéu', coords: [-3.6899, 40.4552], zone: 'A', lines: ['14', '27', '147', '150'] },
      { name: 'Plaza de Cuzco', coords: [-3.6892, 40.4612], zone: 'A', lines: ['14', '27', '147'] },
      { name: 'Alberto Alcocer - Padre Damián', coords: [-3.6821, 40.4625], zone: 'A', lines: ['14'] },
      { name: 'Plaza de la República Dominicana', coords: [-3.6761, 40.4608], zone: 'A', lines: ['14'] },
      { name: 'Avenida de Pío XII (Terminal)', coords: [-3.6728, 40.4682], zone: 'A', lines: ['14', '70'] }
    ]
  },
  {
    line: '70',
    name: 'Línea 70 (Plaza de Castilla - Alsacia)',
    color: '#0284C7',
    stations: [
      { name: 'Plaza de Castilla (Intercambiador EMT)', coords: [-3.6892, 40.4667], zone: 'A', lines: ['27', '70', '147'] },
      { name: 'Mateo Inurria - Chamartín', coords: [-3.6823, 40.4685], zone: 'A', lines: ['70'] },
      { name: 'Pío XII - Arturo Soria', coords: [-3.6698, 40.4695], zone: 'A', lines: ['14', '70'] },
      { name: 'Arturo Soria - Gran Vía de Hortaleza', coords: [-3.6645, 40.4652], zone: 'A', lines: ['70'] },
      { name: 'Arturo Soria - Arturo Soria Plaza', coords: [-3.6601, 40.4558], zone: 'A', lines: ['70'] },
      { name: 'Arturo Soria - Avenida de América', coords: [-3.6558, 40.4442], zone: 'A', lines: ['70'] },
      { name: 'Arturo Soria - Condesa de Venadito', coords: [-3.6521, 40.4385], zone: 'A', lines: ['70'] },
      { name: 'Ciudad Lineal (Intercambiador)', coords: [-3.6482, 40.4352], zone: 'A', lines: ['70', '146'] },
      { name: 'Hermanos García Noblejas - Alcalá', coords: [-3.6412, 40.4312], zone: 'A', lines: ['70'] },
      { name: 'Hermanos García Noblejas - Simancas', coords: [-3.6358, 40.4265], zone: 'A', lines: ['70'] },
      { name: 'Alsacia (Intercambiador EMT)', coords: [-3.6265, 40.4198], zone: 'A', lines: ['70'] }
    ]
  },
  {
    line: 'C1',
    name: 'Línea C1 (Circular 1 - Moncloa por Cuatro Caminos)',
    color: '#0284C7',
    stations: [
      { name: 'Moncloa (Intercambiador EMT)', coords: [-3.7196, 40.4354], zone: 'A', lines: ['1', 'C1', 'C2', '001'] },
      { name: 'Plaza de Cristo Rey (EMT)', coords: [-3.7185, 40.4398], zone: 'A', lines: ['1', 'C1', 'C2'] },
      { name: 'Avenida Reina Victoria', coords: [-3.7112, 40.4478], zone: 'A', lines: ['2', 'C1', 'C2'] },
      { name: 'Cuatro Caminos (EMT)', coords: [-3.7042, 40.4468], zone: 'A', lines: ['2', 'C1', 'C2'] },
      { name: 'Raimundo Fernández Villaverde - Castellana', coords: [-3.6917, 40.4464], zone: 'A', lines: ['14', '27', 'C1', 'C2'] },
      { name: 'República Argentina', coords: [-3.6841, 40.4452], zone: 'A', lines: ['C1', 'C2'] },
      { name: 'Avenida de América (EMT)', coords: [-3.6769, 40.4381], zone: 'A', lines: ['1', 'C1', 'C2', '200'] },
      { name: 'Francisco Silvela - Diego de León', coords: [-3.6732, 40.4345], zone: 'A', lines: ['C1', 'C2'] },
      { name: 'Manuel Becerra (EMT)', coords: [-3.6672, 40.4298], zone: 'A', lines: ['2', 'C1', 'C2'] },
      { name: 'Doctor Esquerdo - O\'Donnell', coords: [-3.6685, 40.4215], zone: 'A', lines: ['C1', 'C2', '203'] },
      { name: 'Doctor Esquerdo - Sainz de Baranda', coords: [-3.6698, 40.4158], zone: 'A', lines: ['C1', 'C2'] },
      { name: 'Conde de Casal (EMT)', coords: [-3.6719, 40.4072], zone: 'A', lines: ['14', 'C1', 'C2'] },
      { name: 'Paseo de la Reina Cristina', coords: [-3.6852, 40.4095], zone: 'A', lines: ['14', 'C1', 'C2'] },
      { name: 'Atocha (Intercambiador EMT)', coords: [-3.6931, 40.4101], zone: 'A', lines: ['14', '27', '34', 'C1', '001', '203'] },
      { name: 'Glorieta de Embajadores (EMT)', coords: [-3.7029, 40.4052], zone: 'A', lines: ['27', 'C1', 'C2'] },
      { name: 'Puerta de Toledo (EMT)', coords: [-3.7118, 40.4068], zone: 'A', lines: ['34', 'C1', 'C2'] },
      { name: 'Ronda de Segovia', coords: [-3.7165, 40.4112], zone: 'A', lines: ['C1', 'C2'] },
      { name: 'Príncipe Pío (EMT)', coords: [-3.7198, 40.4208], zone: 'A', lines: ['C1', 'C2'] },
      { name: 'Moncloa (Intercambiador EMT)', coords: [-3.7196, 40.4354], zone: 'A', lines: ['1', 'C1', 'C2', '001'] }
    ]
  },
  {
    line: '001',
    name: 'Línea 001 Cero Emisiones (Atocha - Moncloa)',
    color: '#0284C7',
    stations: [
      { name: 'Atocha (Intercambiador EMT)', coords: [-3.6931, 40.4101], zone: 'A', lines: ['14', '27', '34', 'C1', '001', '203'] },
      { name: 'Paseo del Prado - Jardín Botánico', coords: [-3.6928, 40.4132], zone: 'A', lines: ['14', '27', '34', '001'] },
      { name: 'Plaza de Cánovas del Castillo (Neptuno)', coords: [-3.6942, 40.4152], zone: 'A', lines: ['14', '27', '34', '001'] },
      { name: 'Plaza de Cibeles', coords: [-3.6922, 40.4196], zone: 'A', lines: ['1', '2', '14', '27', '34', '001', '203'] },
      { name: 'Gran Vía - Alcalá', coords: [-3.6985, 40.4189], zone: 'A', lines: ['1', '001'] },
      { name: 'Gran Vía - Red de San Luis', coords: [-3.7015, 40.4201], zone: 'A', lines: ['1', '001', '146', '147'] },
      { name: 'Gran Vía - Callao', coords: [-3.7058, 40.4202], zone: 'A', lines: ['1', '001', '146', '147'] },
      { name: 'Gran Vía - Plaza de España', coords: [-3.7126, 40.4234], zone: 'A', lines: ['1', '001'] },
      { name: 'Princesa - Ventura Rodríguez', coords: [-3.7142, 40.4272], zone: 'A', lines: ['1', '001'] },
      { name: 'Princesa - Argüelles', coords: [-3.7158, 40.4308], zone: 'A', lines: ['1', '001', 'C1'] },
      { name: 'Moncloa (Intercambiador EMT)', coords: [-3.7196, 40.4354], zone: 'A', lines: ['1', 'C1', 'C2', '001'] }
    ]
  },
  {
    line: '203',
    name: 'Línea 203 Exprés Aeropuerto (Atocha - Cibeles - Barajas T4)',
    color: '#F59E0B',
    stations: [
      { name: 'Atocha (Intercambiador EMT)', coords: [-3.6931, 40.4101], zone: 'A', lines: ['14', '27', '34', 'C1', '001', '203'] },
      { name: 'Plaza de Cibeles', coords: [-3.6922, 40.4196], zone: 'A', lines: ['1', '2', '14', '27', '34', '001', '203'] },
      { name: 'O\'Donnell (EMT Exprés)', coords: [-3.6685, 40.4215], zone: 'A', lines: ['C1', 'C2', '203'] },
      { name: 'Aeropuerto T1 (Llegadas)', coords: [-3.5786, 40.4682], zone: 'A', lines: ['200', '203'] },
      { name: 'Aeropuerto T2 (Salidas)', coords: [-3.5762, 40.4725], zone: 'A', lines: ['200', '203'] },
      { name: 'Aeropuerto T4 (Terminal)', coords: [-3.5932, 40.4918], zone: 'A', lines: ['200', '203'] }
    ]
  }
];

const emtFeatures = [];
const uniqueEmtStops = new Map();

for (const lineDef of emtLinesData) {
  const lineCoords = lineDef.stations.map((s) => [round5(s.coords[0]), round5(s.coords[1])]);
  emtFeatures.push({
    type: 'Feature',
    id: `emt-line-${lineDef.line}`,
    geometry: {
      type: 'LineString',
      coordinates: lineCoords
    },
    properties: {
      type: 'line',
      network: 'emt',
      line: lineDef.line,
      name: lineDef.name,
      color: lineDef.color
    }
  });

  for (const st of lineDef.stations) {
    const key = `${st.name}-${st.zone}`;
    if (!uniqueEmtStops.has(key)) {
      uniqueEmtStops.set(key, {
        id: `emt-stop-${st.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: st.name,
        network: 'emt',
        zone: st.zone,
        coordinates: [round5(st.coords[0]), round5(st.coords[1])],
        lines: [...st.lines],
        wheelchairAccessible: true
      });
    } else {
      const existing = uniqueEmtStops.get(key);
      for (const l of st.lines) {
        if (!existing.lines.includes(l)) existing.lines.push(l);
      }
    }
  }
}

// Add intermediate stops along key avenues to provide complete citywide density
const avenueCorridors = [
  { name: 'Paseo de la Castellana', start: [-3.6892, 40.4667], end: [-3.6917, 40.4252], count: 18, lines: ['14', '27', '147', '150'] },
  { name: 'Calle de Alcalá', start: [-3.7015, 40.4181], end: [-3.6265, 40.4352], count: 20, lines: ['2', '70', '146'] },
  { name: 'Calle Bravo Murillo', start: [-3.7042, 40.4468], end: [-3.6961, 40.4639], count: 12, lines: ['2', 'C1', 'C2'] },
  { name: 'Gran Vía', start: [-3.6948, 40.4189], end: [-3.7126, 40.4234], count: 8, lines: ['1', '001', '146', '147'] },
  { name: 'General Ricardos', start: [-3.7181, 40.3952], end: [-3.7425, 40.3802], count: 10, lines: ['34'] },
  { name: 'Avenida de la Albufera', start: [-3.6685, 40.3982], end: [-3.6267, 40.3875], count: 12, lines: ['10', '54', '58'] },
  { name: 'Arturo Soria', start: [-3.6558, 40.4402], end: [-3.6669, 40.4801], count: 14, lines: ['70'] }
];

let extraStopIndex = 1;
for (const c of avenueCorridors) {
  for (let i = 1; i <= c.count; i++) {
    const fraction = i / (c.count + 1);
    const lng = c.start[0] + (c.end[0] - c.start[0]) * fraction + (Math.sin(i * 1.5) * 0.0004);
    const lat = c.start[1] + (c.end[1] - c.start[1]) * fraction + (Math.cos(i * 1.5) * 0.0004);
    const stName = `${c.name} - Parada ${i}`;
    const key = `${stName}-A`;
    if (!uniqueEmtStops.has(key)) {
      uniqueEmtStops.set(key, {
        id: `emt-stop-extra-${extraStopIndex++}`,
        name: stName,
        network: 'emt',
        zone: 'A',
        coordinates: [round5(lng), round5(lat)],
        lines: [...c.lines],
        wheelchairAccessible: true
      });
    }
  }
}

for (const st of uniqueEmtStops.values()) {
  emtFeatures.push({
    type: 'Feature',
    id: st.id,
    geometry: {
      type: 'Point',
      coordinates: st.coordinates
    },
    properties: {
      id: st.id,
      name: st.name,
      network: 'emt',
      lines: st.lines,
      zone: st.zone,
      wheelchairAccessible: st.wheelchairAccessible,
      type: 'stop'
    }
  });
}

fs.writeFileSync(
  path.join(outputDir, 'emt.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: emtFeatures }, null, 2)
);

// ─── 5. INTERURBAN BUSES (CRTM CORRIDORS) ───────────────────────────────────
console.log('Generating interurban.geojson...');

const interurbanLinesData = [
  {
    line: '151',
    name: 'Línea 151 (Plaza de Castilla - Alcobendas)',
    color: '#16A34A',
    stations: [
      { name: 'Plaza de Castilla (Intercambiador)', coords: [-3.6892, 40.4667], zone: 'A', lines: ['151', '191'] },
      { name: 'Paseo de la Castellana - Las Cuatro Torres', coords: [-3.6875, 40.4782], zone: 'A', lines: ['151', '191'] },
      { name: 'A-1 Fuencarral', coords: [-3.6752, 40.5012], zone: 'A', lines: ['151', '191'] },
      { name: 'A-1 Las Tablas', coords: [-3.6621, 40.5185], zone: 'A', lines: ['151', '191'] },
      { name: 'Alcobendas - La Moraleja', coords: [-3.6482, 40.5342], zone: 'B1', lines: ['151'] },
      { name: 'Alcobendas - Avenida de España', coords: [-3.6375, 40.5471], zone: 'B1', lines: ['151'] }
    ]
  },
  {
    line: '191',
    name: 'Línea 191 (Plaza de Castilla - Buitrago del Lozoya)',
    color: '#16A34A',
    stations: [
      { name: 'Plaza de Castilla (Intercambiador)', coords: [-3.6892, 40.4667], zone: 'A', lines: ['151', '191'] },
      { name: 'San Sebastián de los Reyes (A-1)', coords: [-3.6275, 40.5518], zone: 'B1', lines: ['191'] },
      { name: 'San Agustín del Guadalix', coords: [-3.6165, 40.6782], zone: 'B3', lines: ['191'] },
      { name: 'El Molar (Centro)', coords: [-3.5821, 40.7342], zone: 'C1', lines: ['191'] },
      { name: 'Venturada', coords: [-3.6185, 40.7982], zone: 'C1', lines: ['191'] },
      { name: 'La Cabrera', coords: [-3.6125, 40.8621], zone: 'C1', lines: ['191'] },
      { name: 'Buitrago del Lozoya (Terminal)', coords: [-3.6375, 40.9932], zone: 'C2', lines: ['191'] }
    ]
  },
  {
    line: '223',
    name: 'Línea 223 (Avenida de América - Alcalá de Henares)',
    color: '#16A34A',
    stations: [
      { name: 'Avenida de América (Intercambiador)', coords: [-3.6769, 40.4381], zone: 'A', lines: ['223', '281'] },
      { name: 'A-2 Canillejas', coords: [-3.6082, 40.4485], zone: 'A', lines: ['223', '281'] },
      { name: 'A-2 San Fernando de Henares', coords: [-3.5352, 40.4308], zone: 'B1', lines: ['223'] },
      { name: 'Torrejón de Ardoz (Terminal)', coords: [-3.4795, 40.4578], zone: 'B2', lines: ['223'] },
      { name: 'La Garena (Alcalá)', coords: [-3.3982, 40.4812], zone: 'B3', lines: ['223'] },
      { name: 'Alcalá de Henares (Vía Complutense)', coords: [-3.3615, 40.4891], zone: 'B3', lines: ['223'] }
    ]
  },
  {
    line: '281',
    name: 'Línea 281 (Avenida de América - San Fernando)',
    color: '#16A34A',
    stations: [
      { name: 'Avenida de América (Intercambiador)', coords: [-3.6769, 40.4381], zone: 'A', lines: ['223', '281'] },
      { name: 'Coslada (Plaza Mayor)', coords: [-3.5623, 40.4258], zone: 'B1', lines: ['281'] },
      { name: 'San Fernando de Henares (Centro)', coords: [-3.5352, 40.4308], zone: 'B1', lines: ['281'] }
    ]
  },
  {
    line: '331',
    name: 'Línea 331 (Conde de Casal - Rivas Futura)',
    color: '#16A34A',
    stations: [
      { name: 'Conde de Casal (Intercambiador)', coords: [-3.6719, 40.4072], zone: 'A', lines: ['331', '352'] },
      { name: 'A-3 Santa Eugenia', coords: [-3.6012, 40.3812], zone: 'A', lines: ['331', '352'] },
      { name: 'Rivas Urbanizaciones', coords: [-3.5412, 40.3582], zone: 'B1', lines: ['331'] },
      { name: 'Rivas Futura', coords: [-3.5185, 40.3421], zone: 'B2', lines: ['331'] }
    ]
  },
  {
    line: '352',
    name: 'Línea 352 (Conde de Casal - Tarancón)',
    color: '#16A34A',
    stations: [
      { name: 'Conde de Casal (Intercambiador)', coords: [-3.6719, 40.4072], zone: 'A', lines: ['331', '352'] },
      { name: 'Arganda del Rey (Plaza)', coords: [-3.4447, 40.2982], zone: 'B3', lines: ['352'] },
      { name: 'Perales de Tajuña', coords: [-3.3512, 40.2341], zone: 'B3', lines: ['352'] },
      { name: 'Villarejo de Salvanés', coords: [-3.2758, 40.1685], zone: 'C1', lines: ['352'] },
      { name: 'Tarancón (Terminal)', coords: [-3.0075, 40.0105], zone: 'E2', lines: ['352'] }
    ]
  },
  {
    line: '441',
    name: 'Línea 441 (Plaza Elíptica - Getafe)',
    color: '#16A34A',
    stations: [
      { name: 'Plaza Elíptica (Intercambiador)', coords: [-3.7181, 40.3852], zone: 'A', lines: ['441', '461', '481'] },
      { name: 'A-42 Villaverde', coords: [-3.7125, 40.3551], zone: 'A', lines: ['441', '461'] },
      { name: 'Getafe (Calle Madrid)', coords: [-3.7315, 40.3075], zone: 'B1', lines: ['441'] },
      { name: 'Getafe Sector 3', coords: [-3.7371, 40.2922], zone: 'B1', lines: ['441'] }
    ]
  },
  {
    line: '461',
    name: 'Línea 461 (Plaza Elíptica - Parla)',
    color: '#16A34A',
    stations: [
      { name: 'Plaza Elíptica (Intercambiador)', coords: [-3.7181, 40.3852], zone: 'A', lines: ['441', '461', '481'] },
      { name: 'Getafe (A-42)', coords: [-3.7251, 40.3012], zone: 'B1', lines: ['461'] },
      { name: 'Pinto (A-42)', coords: [-3.6998, 40.2435], zone: 'B2', lines: ['461'] },
      { name: 'Parla (Calle Real)', coords: [-3.7712, 40.2371], zone: 'B2', lines: ['461'] }
    ]
  },
  {
    line: '481',
    name: 'Línea 481 (Plaza Elíptica - Leganés)',
    color: '#16A34A',
    stations: [
      { name: 'Plaza Elíptica (Intercambiador)', coords: [-3.7181, 40.3852], zone: 'A', lines: ['441', '461', '481'] },
      { name: 'Oporto (Intercambiador)', coords: [-3.7311, 40.3888], zone: 'A', lines: ['481'] },
      { name: 'Leganés (Avenida de Fuenlabrada)', coords: [-3.7663, 40.3308], zone: 'B1', lines: ['481'] }
    ]
  },
  {
    line: '511',
    name: 'Línea 511 (Príncipe Pío - Alcorcón)',
    color: '#16A34A',
    stations: [
      { name: 'Príncipe Pío (Intercambiador)', coords: [-3.7198, 40.4208], zone: 'A', lines: ['511', '521'] },
      { name: 'Campamento (A-5)', coords: [-3.7682, 40.3921], zone: 'A', lines: ['511', '521'] },
      { name: 'Cuatro Vientos (A-5)', coords: [-3.7938, 40.3732], zone: 'A', lines: ['511', '521'] },
      { name: 'Alcorcón (Los Castillos)', coords: [-3.8291, 40.3486], zone: 'B1', lines: ['511'] }
    ]
  },
  {
    line: '521',
    name: 'Línea 521 (Príncipe Pío - Móstoles)',
    color: '#16A34A',
    stations: [
      { name: 'Príncipe Pío (Intercambiador)', coords: [-3.7198, 40.4208], zone: 'A', lines: ['511', '521'] },
      { name: 'Campamento (A-5)', coords: [-3.7682, 40.3921], zone: 'A', lines: ['511', '521'] },
      { name: 'Alcorcón (A-5)', coords: [-3.8212, 40.3551], zone: 'B1', lines: ['521'] },
      { name: 'Móstoles (Avenida de Portugal)', coords: [-3.8646, 40.3235], zone: 'B2', lines: ['521'] }
    ]
  },
  {
    line: '621',
    name: 'Línea 621 (Moncloa - Las Rozas)',
    color: '#16A34A',
    stations: [
      { name: 'Moncloa (Intercambiador)', coords: [-3.7196, 40.4354], zone: 'A', lines: ['621', '651', '681'] },
      { name: 'A-6 Puerta de Hierro', coords: [-3.7482, 40.4582], zone: 'A', lines: ['621', '651', '681'] },
      { name: 'Las Rozas (El Burgo)', coords: [-3.8741, 40.4934], zone: 'B2', lines: ['621'] }
    ]
  },
  {
    line: '651',
    name: 'Línea 651 (Moncloa - Majadahonda)',
    color: '#16A34A',
    stations: [
      { name: 'Moncloa (Intercambiador)', coords: [-3.7196, 40.4354], zone: 'A', lines: ['621', '651', '681'] },
      { name: 'Pozuelo de Alarcón (A-6)', coords: [-3.8058, 40.4431], zone: 'B1', lines: ['651'] },
      { name: 'Majadahonda (Doctor Marañón)', coords: [-3.8631, 40.4682], zone: 'B1', lines: ['651'] }
    ]
  },
  {
    line: '681',
    name: 'Línea 681 (Moncloa - Collado Villalba)',
    color: '#16A34A',
    stations: [
      { name: 'Moncloa (Intercambiador)', coords: [-3.7196, 40.4354], zone: 'A', lines: ['621', '651', '681'] },
      { name: 'Torrelodones (A-6)', coords: [-3.9312, 40.5752], zone: 'B3', lines: ['681'] },
      { name: 'Collado Villalba (Estación Zoco)', coords: [-3.9984, 40.6288], zone: 'B3', lines: ['681'] }
    ]
  }
];

const interurbanFeatures = [];
const uniqueInterurbanStops = new Map();

for (const lineDef of interurbanLinesData) {
  const lineCoords = lineDef.stations.map((s) => [round5(s.coords[0]), round5(s.coords[1])]);
  interurbanFeatures.push({
    type: 'Feature',
    id: `interurban-line-${lineDef.line}`,
    geometry: {
      type: 'LineString',
      coordinates: lineCoords
    },
    properties: {
      type: 'line',
      network: 'interurban',
      line: lineDef.line,
      name: lineDef.name,
      color: lineDef.color
    }
  });

  for (const st of lineDef.stations) {
    const key = `${st.name}-${st.zone}`;
    if (!uniqueInterurbanStops.has(key)) {
      uniqueInterurbanStops.set(key, {
        id: `interurban-stop-${st.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: st.name,
        network: 'interurban',
        zone: st.zone,
        coordinates: [round5(st.coords[0]), round5(st.coords[1])],
        lines: [...st.lines],
        wheelchairAccessible: true
      });
    } else {
      const existing = uniqueInterurbanStops.get(key);
      for (const l of st.lines) {
        if (!existing.lines.includes(l)) existing.lines.push(l);
      }
    }
  }
}

for (const st of uniqueInterurbanStops.values()) {
  interurbanFeatures.push({
    type: 'Feature',
    id: st.id,
    geometry: {
      type: 'Point',
      coordinates: st.coordinates
    },
    properties: {
      id: st.id,
      name: st.name,
      network: 'interurban',
      lines: st.lines,
      zone: st.zone,
      wheelchairAccessible: st.wheelchairAccessible,
      type: 'stop'
    }
  });
}

fs.writeFileSync(
  path.join(outputDir, 'interurban.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: interurbanFeatures }, null, 2)
);

console.log('✅ GeoJSON preprocessing completed successfully!');
