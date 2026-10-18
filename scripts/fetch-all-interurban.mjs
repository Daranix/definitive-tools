import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rawDir = path.join(__dirname, 'raw-crtm-data');
const cachePath = path.join(rawDir, 'crtm-interurban-all-tramos.geojson');

async function run() {
  if (fs.existsSync(cachePath)) {
    console.log('Already downloaded:', cachePath);
    return;
  }

  const baseUrl = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M8_Red/FeatureServer/2/query?where=1%3D1&outFields=*&f=geojson';
  const allFeatures = [];
  const pageSize = 2000;
  let offset = 0;

  console.log('Starting download of all CRTM Interurban tramos (M8_Red FeatureServer 2)...');
  while (offset < 50000) {
    const url = `${baseUrl}&resultOffset=${offset}&resultRecordCount=${pageSize}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Fetch failed ${res.status}: ${res.statusText}`);
      break;
    }
    const data = await res.json();
    if (!data.features || data.features.length === 0) break;
    allFeatures.push(...data.features);
    console.log(`  Fetched ${data.features.length} tramos (total so far: ${allFeatures.length})`);
    if (data.features.length < pageSize) break;
    offset += pageSize;
  }

  fs.writeFileSync(cachePath, JSON.stringify({ type: 'FeatureCollection', features: allFeatures }), 'utf8');
  console.log(`Successfully saved ${allFeatures.length} interurban tramos to ${cachePath}`);
}

run().catch(console.error);

