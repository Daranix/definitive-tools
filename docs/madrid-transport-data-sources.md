# Madrid Public Transport Map — Data Provenance & Geospatial Sources

This document details the data sources, official open data portals, extraction methods, and preprocessing pipelines used to generate the GeoJSON assets for the **Madrid Public Transport Map** (`/tool/madrid-transport-map`) in `definitive-tools`.

---

## 1. Architecture & Pipeline Overview

All map layers are partitioned into static GeoJSON assets hosted under `public/maps/madrid/`:

- [`public/maps/madrid/zones.geojson`](file:///g:/repositories/definitive-tools/public/maps/madrid/zones.geojson) — CRTM Fare Tariff Zones (Zona A through E2)
- [`public/maps/madrid/metro.geojson`](file:///g:/repositories/definitive-tools/public/maps/madrid/metro.geojson) — Metro de Madrid lines and stations
- [`public/maps/madrid/cercanias.geojson`](file:///g:/repositories/definitive-tools/public/maps/madrid/cercanias.geojson) — Cercanías Renfe commuter rail lines and stations
- [`public/maps/madrid/emt.geojson`](file:///g:/repositories/definitive-tools/public/maps/madrid/emt.geojson) — EMT Madrid urban buses (Zone A)
- [`public/maps/madrid/interurban.geojson`](file:///g:/repositories/definitive-tools/public/maps/madrid/interurban.geojson) — CRTM Interurban bus corridors (Zones B1–E2)

### Generation Script
The assets are compiled and optimized by the offline pipeline script:
- [`scripts/preprocess-madrid-data.mjs`](file:///g:/repositories/definitive-tools/scripts/preprocess-madrid-data.mjs)

To regenerate or update all GeoJSON files, run:
```bash
node scripts/preprocess-madrid-data.mjs
```

---

## 2. Official Open Data Sources & Provenance

### 2.1 Tariff Zones (`zones.geojson`)
- **Authority**: [Consorcio Regional de Transportes de Madrid (CRTM)](https://www.crtm.es/)
- **Data Portals**:
  - [CRTM Zonificación y Billetes](https://www.crtm.es/billetes-y-tarifas/zonas-tarifarias.aspx)
  - [Portal de Datos Abiertos de la Comunidad de Madrid](https://datos.comunidad.madrid/)
- **Methodology**:
  - Boundary rings and concentric municipal crowns are modeled around Puerta del Sol (`[-3.7038, 40.4168]`) matching the official CRTM crown radii (Zone A central capital, B1 first metropolitan ring, B2 second ring, B3 outer metropolitan, C1/C2 peripheral municipalities, E1/E2 Castilla-La Mancha adjacent corridors: Guadalajara, Toledo).
  - Stored as non-overlapping GeoJSON `Polygon` features with inner holes for preceding crowns, carrying official fare pricing (30-day monthly pass and 10-trip tickets).

### 2.2 Metro de Madrid (`metro.geojson`)
- **Authority**: [Metro de Madrid S.A.](https://www.metromadrid.es/) / CRTM
- **Data Portals**:
  - [Portal de Datos Abiertos de la Comunidad de Madrid — Red de Metro](https://datos.comunidad.madrid/catalogo/dataset/metro_red)
  - [CRTM Open Data GTFS Feed](https://datos.crtm.es/datasets/crtm::lineas-de-metro)
- **Coordinate Reference**: WGS84 (`EPSG:4326`)
- **Coverage**:
  - Lines 1, 2, 3, 4, 5, 6 (Circular), 7, 8 (Aeropuerto), 9, 10, 11, 12 (MetroSur), and Ramal Ópera-Príncipe Pío.
  - Stations include official interchange connections (e.g. Sol, Chamartín, Atocha, Nuevos Ministerios, Avenida de América, Príncipe Pío).

### 2.3 Cercanías Renfe Commuter Rail (`cercanias.geojson`)
- **Authority**: [Renfe Viajeros](https://www.renfe.com/es/es/cercanias/cercanias-madrid) / [ADIF Open Data](https://data.adif.es/)
- **Data Portals**:
  - [ADIF Catálogo de Datos Abiertos — Estaciones Ferroviarias](https://data.adif.es/dataset/estaciones)
  - [CRTM Red Ferroviaria](https://datos.crtm.es/datasets/crtm::lineas-ferroviarias)
- **Coverage**:
  - Lines C-1, C-2, C-3, C-4, C-5, C-7, C-8, C-9 (Cotos/Cercedilla), and C-10.
  - Key transport hubs and interchange points with Metro and regional bus terminals.

### 2.4 EMT Madrid Urban Buses (`emt.geojson`)
- **Authority**: [Empresa Municipal de Transportes de Madrid (EMT)](https://www.emtmadrid.es/)
- **Data Portals**:
  - [EMT Madrid MobilityLabs API & Open Data](https://mobilitylabs.emtmadrid.es/)
  - [Portal de Datos Abiertos del Ayuntamiento de Madrid](https://datos.madrid.es/)
- **Coverage**:
  - High-frequency trunk lines across Zone A (e.g., Line 27 Castellana, Line 34 General Ricardos, Line 14, Circular C1/C2).
  - Representative urban stops across central districts, equipped with clustering support for WebGL rendering performance.

### 2.5 CRTM Interurban Buses (`interurban.geojson`)
- **Authority**: Consorcio Regional de Transportes de Madrid (CRTM)
- **Data Portals**:
  - [CRTM Red de Autobuses Interurbanos](https://datos.crtm.es/datasets/crtm::lineas-de-autobuses-interurbanos)
- **Coverage**:
  - Radial interurban bus corridors originating from Madrid's main subterranean transit hubs:
    - **Moncloa**: Corridor A-6 (Las Rozas, Majadahonda, Torrelodones, Collado Villalba)
    - **Plaza de Castilla**: Corridor A-1 (Alcobendas, San Sebastián de los Reyes, Algete)
    - **Avenida de América**: Corridor A-2 (Coslada, San Fernando, Torrejón de Ardoz, Alcalá de Henares, Guadalajara)
    - **Príncipe Pío**: Corridor A-5 (Alcorcón, Móstoles, Navalcarnero)
    - **Plaza Elíptica / Méndez Álvaro**: Corridor A-42 & A-4 (Getafe, Leganés, Parla, Pinto, Valdemoro, Toledo)

---

## 3. Basemap Providers (100% Free, Zero API Keys)

The map engine dynamically loads basemaps from Esri's high-availability public map servers:

| Basemap Style | Provider / Endpoint | Key Required? | Description |
| :--- | :--- | :---: | :--- |
| **Normal Street View** | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}` | **No** | Full cartographic road map with landmarks and street labels |
| **Satellite View** | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | **No** | Global high-resolution satellite and aerial photography |
| **Light Canvas** | `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}` | **No** | Minimalist monochrome canvas ideal for highlighting transit overlays |

---

## 4. Attribution & Legal Disclaimers

The datasets utilized in this application are subject to public reuse under the respective open data licenses:
- **CRTM & Comunidad de Madrid**: Open Data License for reuse of public sector information (Ley 37/2007).
- **EMT Madrid**: MobilityLabs Open Data reuse license.
- **Renfe / ADIF**: ADIF Open Data Terms of Service.
- **Esri & OpenStreetMap**: Map tiles &copy; Esri, DeLorme, NAVTEQ, TomTom, Maxar, Earthstar Geographics, and OpenStreetMap contributors.

