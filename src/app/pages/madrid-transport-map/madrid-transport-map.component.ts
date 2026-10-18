import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MetadataService } from '@/app/services/metadata.service';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { MadridTransportMapService } from './madrid-transport-map.service';
import { MapSearchComponent } from './components/map-search/map-search.component';
import { LayerControlsComponent } from './components/layer-controls/layer-controls.component';
import { ZoneLegendComponent } from './components/zone-legend/zone-legend.component';
import { DetailDrawerComponent } from './components/detail-drawer/detail-drawer.component';
import {
  BasemapType,
  NetworkId,
  SelectedLineInfo,
  TariffZoneInfo,
  TransitStopProperties
} from './madrid-transport-map.models';
import type * as MapLibreGL from 'maplibre-gl';
import type { FilterSpecification } from 'maplibre-gl';
import type { Feature, FeatureCollection, Point } from 'geojson';

const METRO_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="16.5" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1.5"/>
  <polygon points="18,3.5 30.5,18 18,32.5 5.5,18" fill="#E4002B"/>
  <polygon points="18,7 26.5,18 18,29 9.5,18" fill="#FFFFFF"/>
  <rect x="3" y="14" width="30" height="8" rx="1.5" fill="#002F6C"/>
  <text x="18" y="19.5" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="5.8" letter-spacing="0.5" text-anchor="middle" dominant-baseline="central">METRO</text>
</svg>`;

const CERCANIAS_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="16.5" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1.5"/>
  <circle cx="18" cy="18" r="13.5" fill="#E4002B"/>
  <text x="18" y="19" fill="#FFFFFF" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="18" text-anchor="middle" dominant-baseline="central">C</text>
</svg>`;

const EMT_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="16.5" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1.5"/>
  <circle cx="18" cy="18" r="13.5" fill="#0284C7"/>
  <g fill="#FFFFFF" transform="translate(1, 0)">
    <rect x="9.5" y="8" width="15" height="15" rx="3"/>
    <rect x="11.5" y="10" width="11" height="5.5" rx="1" fill="#0284C7"/>
    <circle cx="12.5" cy="19.5" r="1.6" fill="#0284C7"/>
    <circle cx="21.5" cy="19.5" r="1.6" fill="#0284C7"/>
    <rect x="11" y="23" width="2.5" height="2" rx="0.5"/>
    <rect x="20.5" y="23" width="2.5" height="2" rx="0.5"/>
  </g>
</svg>`;

const INTERURBAN_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="16.5" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1.5"/>
  <circle cx="18" cy="18" r="13.5" fill="#16A34A"/>
  <g fill="#FFFFFF" transform="translate(0.5, 0)">
    <rect x="8.5" y="9" width="18" height="14" rx="3"/>
    <rect x="10.5" y="11" width="14" height="4.5" rx="1" fill="#16A34A"/>
    <rect x="11" y="17.5" width="2.5" height="2" rx="0.5" fill="#16A34A"/>
    <rect x="21.5" y="17.5" width="2.5" height="2" rx="0.5" fill="#16A34A"/>
    <circle cx="12" cy="23" r="1.5"/>
    <circle cx="23" cy="23" r="1.5"/>
  </g>
</svg>`;

function createSvgImage(svg: string, width = 36, height = 36): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image(width, height);
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallback = new Image(width, height);
      fallback.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      resolve(fallback);
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.trim());
  });
}

@Component({
  selector: 'app-madrid-transport-map',
  standalone: true,
  imports: [
    TopNavbarComponent,
    LucideIconComponent,
    MapSearchComponent,
    LayerControlsComponent,
    ZoneLegendComponent,
    DetailDrawerComponent
  ],
  templateUrl: './madrid-transport-map.component.html',
  styleUrl: './madrid-transport-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full w-full'
  }
})
export class MadridTransportMapComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly metadataService = inject(MetadataService);
  readonly service = inject(MadridTransportMapService);

  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  private map: MapLibreGL.Map | null = null;
  private maplibreglModule: typeof MapLibreGL | null = null;
  private emtLoaded = false;
  private interurbanLoaded = false;
  private activeStationMarker: MapLibreGL.Marker | null = null;
  private loadedGeojsonData: Partial<Record<NetworkId, FeatureCollection>> = {};
  private resizeObserver: ResizeObserver | null = null;
  readonly isMapReady = signal<boolean>(false);

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Madrid Transport Map - Metro, Cercanías & Fare Zones',
      description:
        'Interactive transit network and CRTM fare zones map for Madrid. Explore Metro, Cercanías, EMT, Interurban buses and tariff zones A through E2.',
      keywords:
        'Madrid transport map, Metro Madrid, Cercanias Renfe, EMT Madrid, CRTM zones, abono transporte, fare zones'
    });

    afterNextRender(async () => {
      if (isPlatformBrowser(this.platformId)) {
        await this.initMap();
      }
    });

    // Reactive effect for layer visibility and opacity
    effect(() => {
      const layers = this.service.layers();
      if (!this.map || !this.isMapReady()) return;

      this.syncLayerState(layers);
    });

    // Reactive effect for camera navigation
    effect(() => {
      const target = this.service.flyToTarget();
      if (!this.map || !this.isMapReady() || !target) return;

      this.map.flyTo({
        center: target.coordinates,
        zoom: target.zoom,
        essential: true,
        duration: 1200
      });
    });

    // Reactive effect for basemap switching (streets / satellite / gray)
    effect(() => {
      const activeBasemap = this.service.activeBasemap();
      if (!this.map || !this.isMapReady()) return;

      const basemaps: BasemapType[] = ['streets', 'satellite', 'gray'];
      for (const b of basemaps) {
        const layerId = `basemap-${b}-layer`;
        if (this.map.getLayer(layerId)) {
          this.map.setLayoutProperty(
            layerId,
            'visibility',
            b === activeBasemap ? 'visible' : 'none'
          );
        }
      }
    });

    // Reactive effect for selected zone & station highlight
    effect(() => {
      const selected = this.service.selectedItem();
      if (!this.map || !this.isMapReady()) return;

      let zoneCode = '';
      if (selected && selected.type === 'zone') {
        zoneCode = (selected.data as TariffZoneInfo).code;
        this.clearStationMarker();
      } else if (selected && selected.type === 'station') {
        const station = selected.data as TransitStopProperties;
        if (station.zone) {
          zoneCode = station.zone;
        }
        if (station.coordinates) {
          this.setStationMarker(station.coordinates, station.name);
        }
      } else {
        this.clearStationMarker();
      }

      const safeFilter: FilterSpecification = zoneCode
        ? ['all', ['==', ['get', 'type'], 'zone'], ['==', ['get', 'code'], zoneCode]]
        : ['==', ['get', 'code'], '__none__'];
      if (this.map.getLayer('zones-selected-fill')) {
        this.map.setFilter('zones-selected-fill', safeFilter);
      }
      if (this.map.getLayer('zones-selected-outline-casing')) {
        this.map.setFilter('zones-selected-outline-casing', safeFilter);
      }
      if (this.map.getLayer('zones-selected-outline')) {
        this.map.setFilter('zones-selected-outline', safeFilter);
      }
    });

    // Reactive effect for selected transit line route highlight & bounds framing
    effect(() => {
      const selectedLine = this.service.selectedLine();
      if (!this.map || !this.isMapReady()) return;

      void this.updateSelectedLineHighlight(selectedLine);
    });
  }

  readonly isDrawerExpanded = signal<boolean>(false);
  private touchStartY = 0;
  private currentTouchY = 0;
  private isDragging = false;

  toggleDrawerExpand(): void {
    this.isDrawerExpanded.update((v) => !v);
  }

  onDrawerTouchStart(event: TouchEvent): void {
    if (event.touches.length > 0) {
      this.touchStartY = event.touches[0].clientY;
      this.currentTouchY = event.touches[0].clientY;
      this.isDragging = true;
    }
  }

  onDrawerTouchMove(event: TouchEvent): void {
    if (!this.isDragging || event.touches.length === 0) return;
    this.currentTouchY = event.touches[0].clientY;
  }

  onDrawerTouchEnd(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    const deltaY = this.currentTouchY - this.touchStartY;

    // Dragged UP by more than 35px -> expand
    if (deltaY < -35) {
      this.isDrawerExpanded.set(true);
    }
    // Dragged DOWN by more than 40px while expanded -> collapse to compact
    else if (deltaY > 40 && this.isDrawerExpanded()) {
      this.isDrawerExpanded.set(false);
    }
    // Dragged DOWN by more than 75px while compact -> dismiss drawer
    else if (deltaY > 75 && !this.isDrawerExpanded()) {
      this.closeMobileDrawer();
    }
  }

  openMobileLayers(): void {
    this.service.openMobileDrawer('layers');
  }

  openMobileZones(): void {
    this.service.openMobileDrawer('zones');
  }

  closeMobileDrawer(): void {
    this.isDrawerExpanded.set(false);
    this.service.closeMobileDrawer();
  }

  private setStationMarker(coords: [number, number], name: string): void {
    if (!this.map || !this.maplibreglModule) return;

    this.clearStationMarker();

    const el = document.createElement('div');
    el.className = 'relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none';
    el.innerHTML = `
      <div class="absolute w-9 h-9 rounded-full bg-indigo-500/40 animate-ping"></div>
      <div class="relative w-6 h-6 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-[11px] font-bold">
        📍
      </div>
    `;

    this.activeStationMarker = new this.maplibreglModule.Marker({
      element: el,
      anchor: 'center'
    })
      .setLngLat(coords)
      .addTo(this.map);
  }

  private clearStationMarker(): void {
    if (this.activeStationMarker) {
      this.activeStationMarker.remove();
      this.activeStationMarker = null;
    }
  }

  private async initMap(): Promise<void> {
    const container = this.mapContainer()?.nativeElement;
    if (!container) return;

    try {
      this.maplibreglModule = await import('maplibre-gl');
      this.maplibreglModule.setWorkerUrl(new URL('maplibre-gl-worker.mjs', document.baseURI).href);
      await this.service.loadInitialData();

      const initialBasemap = this.service.activeBasemap();

      // Multi-basemap raster style (100% free, zero API key required, high availability)
      const multiBasemapStyle: MapLibreGL.StyleSpecification = {
        version: 8,
        sources: {
          'esri-streets': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            maxzoom: 17,
            attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom'
          },
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics'
          },
          'esri-gray': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            maxzoom: 16,
            attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
          }
        },
        layers: [
          {
            id: 'basemap-streets-layer',
            type: 'raster',
            source: 'esri-streets',
            minzoom: 0,
            layout: {
              visibility: initialBasemap === 'streets' ? 'visible' : 'none'
            }
          },
          {
            id: 'basemap-satellite-layer',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            layout: {
              visibility: initialBasemap === 'satellite' ? 'visible' : 'none'
            }
          },
          {
            id: 'basemap-gray-layer',
            type: 'raster',
            source: 'esri-gray',
            minzoom: 0,
            layout: {
              visibility: initialBasemap === 'gray' ? 'visible' : 'none'
            }
          }
        ]
      };

      this.map = new this.maplibreglModule.Map({
        container,
        style: multiBasemapStyle,
        center: [-3.7038, 40.4168], // Madrid Puerta del Sol
        zoom: 11,
        minZoom: 7,
        maxZoom: 18.5
      });

      const triggerResize = () => {
        if (this.map) {
          this.map.resize();
        }
      };

      this.resizeObserver = new ResizeObserver(() => {
        triggerResize();
      });
      this.resizeObserver.observe(container);
      if (container.parentElement) {
        this.resizeObserver.observe(container.parentElement);
      }

      // Schedule aggressive resize checks across initial rendering passes
      requestAnimationFrame(triggerResize);
      setTimeout(triggerResize, 60);
      setTimeout(triggerResize, 150);
      setTimeout(triggerResize, 300);
      setTimeout(triggerResize, 600);
      setTimeout(() => {
        triggerResize();
        window.dispatchEvent(new Event('resize'));
      }, 1000);

      this.map.on('error', (err) => {
        console.warn('MapLibre internal event:', err);
      });

      this.map.addControl(
        new this.maplibreglModule.NavigationControl({ showCompass: true, visualizePitch: true }),
        'bottom-right'
      );

      this.map.on('load', () => {
        triggerResize();
        void this.onMapLoaded();
      });
    } catch (err) {
      console.error('Failed to initialize MapLibre GL:', err);
      this.service.setError('Failed to initialize map graphics engine.');
    }
  }

  private async onMapLoaded(): Promise<void> {
    if (!this.map) return;

    // Register custom high-contrast network badges (Retina 2x resolution)
    try {
      const [metroImg, cercaniasImg, emtImg, interurbanImg] = await Promise.all([
        createSvgImage(METRO_ICON_SVG, 36, 36),
        createSvgImage(CERCANIAS_ICON_SVG, 36, 36),
        createSvgImage(EMT_ICON_SVG, 36, 36),
        createSvgImage(INTERURBAN_ICON_SVG, 36, 36)
      ]);
      this.map.addImage('icon-metro', metroImg, { pixelRatio: 2 });
      this.map.addImage('icon-cercanias', cercaniasImg, { pixelRatio: 2 });
      this.map.addImage('icon-emt', emtImg, { pixelRatio: 2 });
      this.map.addImage('icon-interurban', interurbanImg, { pixelRatio: 2 });
    } catch (e) {
      console.warn('Failed to register network icon sprites:', e);
    }

    // ─── 1. Add Tariff Zones ────────────────────────────────────────────────
    this.map.addSource('zones-source', {
      type: 'geojson',
      data: '/maps/madrid/zones.geojson'
    });

    this.map.addLayer({
      id: 'zones-fill',
      type: 'fill',
      source: 'zones-source',
      filter: ['==', ['get', 'type'], 'zone'],
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': this.service.zoneOpacity()
      }
    });

    this.map.addLayer({
      id: 'zones-line',
      type: 'line',
      source: 'zones-source',
      filter: ['==', ['get', 'type'], 'boundary'],
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 2.2,
        'line-opacity': 0.95
      }
    });

    // Dedicated selected zone highlight fill (rendered beneath transit lines)
    this.map.addLayer({
      id: 'zones-selected-fill',
      type: 'fill',
      source: 'zones-source',
      filter: ['all', ['==', ['get', 'type'], 'zone'], ['==', ['get', 'code'], '__none__']],
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.55
      }
    });

    // ─── 2. Add Metro de Madrid ─────────────────────────────────────────────
    this.map.addSource('metro-source', {
      type: 'geojson',
      data: '/maps/madrid/metro.geojson'
    });

    this.map.addLayer({
      id: 'metro-lines',
      type: 'line',
      source: 'metro-source',
      filter: ['==', ['get', 'type'], 'line'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 3.5,
        'line-opacity': 0.95
      }
    });

    this.map.addLayer({
      id: 'metro-stations',
      type: 'symbol',
      source: 'metro-source',
      filter: ['==', ['get', 'type'], 'station'],
      layout: {
        'icon-image': 'icon-metro',
        'icon-size': 0.65,
        'icon-offset': ['case', ['get', 'isInterchange'], ['literal', [-8, 0]], ['literal', [0, 0]]],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    });

    // ─── 3. Add Cercanías Renfe ─────────────────────────────────────────────
    this.map.addSource('cercanias-source', {
      type: 'geojson',
      data: '/maps/madrid/cercanias.geojson'
    });

    this.map.addLayer({
      id: 'cercanias-lines',
      type: 'line',
      source: 'cercanias-source',
      filter: ['==', ['get', 'type'], 'line'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 3.5,
        'line-offset': ['coalesce', ['get', 'offset'], 0],
        'line-opacity': 0.95
      }
    });

    this.map.addLayer({
      id: 'cercanias-stations',
      type: 'symbol',
      source: 'cercanias-source',
      filter: ['==', ['get', 'type'], 'station'],
      layout: {
        'icon-image': 'icon-cercanias',
        'icon-size': 0.65,
        'icon-offset': ['case', ['get', 'isInterchange'], ['literal', [8, 0]], ['literal', [0, 0]]],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    });

    // Dedicated selected zone outlines (rendered ON TOP of lines and stations)
    this.map.addLayer({
      id: 'zones-selected-outline-casing',
      type: 'line',
      source: 'zones-source',
      filter: ['==', ['get', 'code'], '__none__'],
      paint: {
        'line-color': '#0F172A',
        'line-width': 7.5,
        'line-opacity': 0.95
      }
    });

    this.map.addLayer({
      id: 'zones-selected-outline',
      type: 'line',
      source: 'zones-source',
      filter: ['==', ['get', 'code'], '__none__'],
      paint: {
        'line-color': '#FACC15',
        'line-width': 5,
        'line-opacity': 1
      }
    });

    // ─── 4. Selected Line Highlight Layers (glow & animated focus) ──────────
    this.map.addSource('selected-line-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    this.map.addLayer({
      id: 'selected-line-casing',
      type: 'line',
      source: 'selected-line-source',
      filter: ['==', ['get', 'type'], 'line'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#0F172A',
        'line-width': 8.5,
        'line-opacity': 0.95
      }
    });

    this.map.addLayer({
      id: 'selected-line-core',
      type: 'line',
      source: 'selected-line-source',
      filter: ['==', ['get', 'type'], 'line'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': ['coalesce', ['get', 'color'], '#FACC15'],
        'line-width': 5.5,
        'line-opacity': 1
      }
    });

    this.map.addLayer({
      id: 'selected-line-stops',
      type: 'circle',
      source: 'selected-line-source',
      filter: ['!=', ['get', 'type'], 'line'],
      paint: {
        'circle-color': ['coalesce', ['get', 'color'], '#FACC15'],
        'circle-radius': 7,
        'circle-stroke-color': '#0F172A',
        'circle-stroke-width': 2.5
      }
    });

    this.setupInteractions();
    this.isMapReady.set(true);

    // Trigger initial sync
    this.syncLayerState(this.service.layers());
  }

  private setupInteractions(): void {
    if (!this.map) return;

    const interactiveLayers = [
      'metro-stations',
      'cercanias-stations',
      'zones-fill',
      'zones-selected-fill'
    ];

    for (const layerId of interactiveLayers) {
      this.map.on('mouseenter', layerId, () => {
        if (this.map) this.map.getCanvas().style.cursor = 'pointer';
      });

      this.map.on('mouseleave', layerId, () => {
        if (this.map) this.map.getCanvas().style.cursor = '';
      });
    }

    // Station clicks
    this.map.on('click', 'metro-stations', (e) => {
      const feat = e.features?.[0];
      if (feat && feat.geometry.type === 'Point') {
        const props = feat.properties || {};
        let lines: string[] = [];
        try {
          lines = typeof props['lines'] === 'string' ? JSON.parse(props['lines']) : (props['lines'] || []);
        } catch {
          lines = [];
        }

        this.service.selectStation({
          id: props['id'] || 'metro-station',
          name: props['name'],
          network: 'metro',
          lines,
          zone: props['zone'],
          wheelchairAccessible: props['wheelchairAccessible'] === true || props['wheelchairAccessible'] === 'true',
          coordinates: feat.geometry.coordinates as [number, number]
        });
      }
    });

    this.map.on('click', 'cercanias-stations', (e) => {
      const feat = e.features?.[0];
      if (feat && feat.geometry.type === 'Point') {
        const props = feat.properties || {};
        let lines: string[] = [];
        try {
          lines = typeof props['lines'] === 'string' ? JSON.parse(props['lines']) : (props['lines'] || []);
        } catch {
          lines = [];
        }

        this.service.selectStation({
          id: props['id'] || 'cercanias-station',
          name: props['name'],
          network: 'cercanias',
          lines,
          zone: props['zone'],
          wheelchairAccessible: props['wheelchairAccessible'] === true || props['wheelchairAccessible'] === 'true',
          coordinates: feat.geometry.coordinates as [number, number]
        });
      }
    });

    // Transit Line clicks (selects & highlights full line route)
    const lineLayers = ['metro-lines', 'cercanias-lines'];
    for (const lid of lineLayers) {
      this.map.on('mouseenter', lid, () => {
        if (this.map) this.map.getCanvas().style.cursor = 'pointer';
      });
      this.map.on('mouseleave', lid, () => {
        if (this.map) this.map.getCanvas().style.cursor = '';
      });
      this.map.on('click', lid, (e) => {
        const feat = e.features?.[0];
        if (feat?.properties) {
          const net = feat.properties['network'] as NetworkId;
          const line = feat.properties['line'];
          if (net && line) {
            this.service.selectLine(net, line);
            this.service.openMobileDrawer('detail');
          }
        }
      });
    }

    // Tariff zone click handler
    const handleZoneClick = (
      e: MapLibreGL.MapMouseEvent & { features?: MapLibreGL.MapGeoJSONFeature[] }
    ) => {
      // Only select zone if we didn't click a station marker
      const stationFeatures = this.map?.queryRenderedFeatures(e.point, {
        layers: ['metro-stations', 'cercanias-stations', 'emt-unclustered', 'interurban-unclustered'].filter(
          (id) => this.map?.getLayer(id)
        )
      });

      if (stationFeatures && stationFeatures.length > 0) return;

      const feat = e.features?.[0];
      if (feat && feat.properties) {
        this.service.selectZone({
          code: feat.properties['code'],
          name: feat.properties['name'],
          color: feat.properties['color'],
          monthlyPassPriceEur: Number(feat.properties['monthlyPassPriceEur']),
          tenTripPriceEur: Number(feat.properties['tenTripPriceEur']),
          coverageDescription: feat.properties['coverageDescription']
        });
      }
    };

    this.map.on('click', 'zones-fill', handleZoneClick);
    this.map.on('click', 'zones-selected-fill', handleZoneClick);
  }

  private async syncLayerState(layers: ReturnType<typeof this.service.layers>): Promise<void> {
    if (!this.map) return;

    // Zone visibility & opacity
    const zoneVis = layers.showZones ? 'visible' : 'none';
    if (this.map.getLayer('zones-fill')) {
      this.map.setLayoutProperty('zones-fill', 'visibility', zoneVis);
      this.map.setPaintProperty('zones-fill', 'fill-opacity', layers.zoneOpacity);
    }
    if (this.map.getLayer('zones-line')) {
      this.map.setLayoutProperty('zones-line', 'visibility', zoneVis);
    }
    if (this.map.getLayer('zones-selected-fill')) {
      this.map.setLayoutProperty('zones-selected-fill', 'visibility', zoneVis);
    }
    if (this.map.getLayer('zones-selected-outline-casing')) {
      this.map.setLayoutProperty('zones-selected-outline-casing', 'visibility', zoneVis);
    }
    if (this.map.getLayer('zones-selected-outline')) {
      this.map.setLayoutProperty('zones-selected-outline', 'visibility', zoneVis);
    }

    // Metro visibility
    const metroVis = layers.networks.metro ? 'visible' : 'none';
    if (this.map.getLayer('metro-lines')) {
      this.map.setLayoutProperty('metro-lines', 'visibility', metroVis);
    }
    if (this.map.getLayer('metro-stations')) {
      this.map.setLayoutProperty('metro-stations', 'visibility', metroVis);
    }

    // Cercanías visibility
    const cercaniasVis = layers.networks.cercanias ? 'visible' : 'none';
    if (this.map.getLayer('cercanias-lines')) {
      this.map.setLayoutProperty('cercanias-lines', 'visibility', cercaniasVis);
    }
    if (this.map.getLayer('cercanias-stations')) {
      this.map.setLayoutProperty('cercanias-stations', 'visibility', cercaniasVis);
    }

    // EMT On-demand loading
    if (layers.networks.emt) {
      if (!this.emtLoaded) {
        await this.loadEmtBusLayer();
      }
      this.setBusLayerVisibility('emt', 'visible');
    } else {
      this.setBusLayerVisibility('emt', 'none');
    }

    // Interurban On-demand loading
    if (layers.networks.interurban) {
      if (!this.interurbanLoaded) {
        await this.loadInterurbanBusLayer();
      }
      this.setBusLayerVisibility('interurban', 'visible');
    } else {
      this.setBusLayerVisibility('interurban', 'none');
    }
  }

  private async loadEmtBusLayer(): Promise<void> {
    if (!this.map || this.emtLoaded) return;

    const data = await this.service.loadBusData('emt');
    if (!data) return;

    this.loadedGeojsonData['emt'] = data;

    this.map.addSource('emt-source', {
      type: 'geojson',
      data,
      cluster: true,
      clusterMaxZoom: 12,
      clusterRadius: 35
    });

    // EMT Lines layer
    this.map.addLayer({
      id: 'emt-lines',
      type: 'line',
      source: 'emt-source',
      filter: ['==', ['get', 'type'], 'line'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#0284C7',
        'line-width': 3,
        'line-opacity': 0.85
      }
    });

    this.map.addLayer({
      id: 'emt-clusters',
      type: 'circle',
      source: 'emt-source',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#0284C7',
        'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 30, 22],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFFFF'
      }
    });

    this.map.addLayer({
      id: 'emt-cluster-count',
      type: 'symbol',
      source: 'emt-source',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Semibold'],
        'text-size': 11
      },
      paint: {
        'text-color': '#FFFFFF'
      }
    });

    this.map.addLayer({
      id: 'emt-unclustered',
      type: 'symbol',
      source: 'emt-source',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': 'icon-emt',
        'icon-size': 0.55,
        'icon-allow-overlap': true
      }
    });

    this.setupBusInteractions('emt');
    this.emtLoaded = true;
  }

  private async loadInterurbanBusLayer(): Promise<void> {
    if (!this.map || this.interurbanLoaded) return;

    const data = await this.service.loadBusData('interurban');
    if (!data) return;

    this.loadedGeojsonData['interurban'] = data;

    this.map.addSource('interurban-source', {
      type: 'geojson',
      data,
      cluster: true,
      clusterMaxZoom: 12,
      clusterRadius: 35
    });

    // Interurban Lines layer
    this.map.addLayer({
      id: 'interurban-lines',
      type: 'line',
      source: 'interurban-source',
      filter: ['==', ['get', 'type'], 'line'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#16A34A',
        'line-width': 3,
        'line-dasharray': [3, 1],
        'line-opacity': 0.85
      }
    });

    this.map.addLayer({
      id: 'interurban-clusters',
      type: 'circle',
      source: 'interurban-source',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#16A34A',
        'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 30, 22],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFFFF'
      }
    });

    this.map.addLayer({
      id: 'interurban-cluster-count',
      type: 'symbol',
      source: 'interurban-source',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Semibold'],
        'text-size': 11
      },
      paint: {
        'text-color': '#FFFFFF'
      }
    });

    this.map.addLayer({
      id: 'interurban-unclustered',
      type: 'symbol',
      source: 'interurban-source',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': 'icon-interurban',
        'icon-size': 0.55,
        'icon-allow-overlap': true
      }
    });

    this.setupBusInteractions('interurban');
    this.interurbanLoaded = true;
  }

  private setupBusInteractions(network: 'emt' | 'interurban'): void {
    if (!this.map) return;

    const unclusteredLayer = `${network}-unclustered`;
    const clusterLayer = `${network}-clusters`;
    const lineLayer = `${network}-lines`;

    this.map.on('mouseenter', unclusteredLayer, () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', unclusteredLayer, () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });
    this.map.on('mouseenter', clusterLayer, () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', clusterLayer, () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });
    this.map.on('mouseenter', lineLayer, () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', lineLayer, () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });

    // Line click: select & highlight full route
    this.map.on('click', lineLayer, (e) => {
      const feat = e.features?.[0];
      if (feat?.properties) {
        const line = feat.properties['line'];
        if (line) {
          this.service.selectLine(network, line);
          this.service.openMobileDrawer('detail');
        }
      }
    });

    // Unclustered stop click
    this.map.on('click', unclusteredLayer, (e) => {
      const feat = e.features?.[0];
      if (feat && feat.geometry.type === 'Point') {
        const props = feat.properties || {};
        let lines: string[] = [];
        try {
          lines = typeof props['lines'] === 'string' ? JSON.parse(props['lines']) : (props['lines'] || []);
        } catch {
          lines = [];
        }

        this.service.selectStation({
          id: props['id'] || `${network}-stop`,
          name: props['name'],
          network,
          lines,
          zone: props['zone'],
          wheelchairAccessible: props['wheelchairAccessible'] === true || props['wheelchairAccessible'] === 'true',
          coordinates: feat.geometry.coordinates as [number, number]
        });
      }
    });

    // Cluster click: zoom in
    this.map.on('click', clusterLayer, async (e) => {
      if (!this.map) return;
      const features = this.map.queryRenderedFeatures(e.point, { layers: [clusterLayer] });
      const clusterId = features[0]?.properties?.['cluster_id'];
      const source = this.map.getSource(`${network}-source`) as MapLibreGL.GeoJSONSource;

      if (source && typeof source.getClusterExpansionZoom === 'function' && clusterId !== undefined) {
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          if (features[0].geometry.type === 'Point') {
            this.map.easeTo({
              center: features[0].geometry.coordinates as [number, number],
              zoom
            });
          }
        } catch {
          // ignore
        }
      }
    });
  }

  private setBusLayerVisibility(network: 'emt' | 'interurban', visibility: 'visible' | 'none'): void {
    if (!this.map) return;
    const layers = [`${network}-lines`, `${network}-clusters`, `${network}-cluster-count`, `${network}-unclustered`];
    for (const l of layers) {
      if (this.map.getLayer(l)) {
        this.map.setLayoutProperty(l, 'visibility', visibility);
      }
    }
  }

  private async updateSelectedLineHighlight(selected: SelectedLineInfo | null): Promise<void> {
    if (!this.map) return;
    const source = this.map.getSource('selected-line-source') as MapLibreGL.GeoJSONSource | undefined;
    if (!source) return;

    if (!selected) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    // Ensure bus layer data is loaded if selected line belongs to EMT or Interurban
    if (selected.network === 'emt' && !this.emtLoaded) {
      await this.loadEmtBusLayer();
    } else if (selected.network === 'interurban' && !this.interurbanLoaded) {
      await this.loadInterurbanBusLayer();
    }

    // Load and cache GeoJSON for the target network
    let geojson = this.loadedGeojsonData[selected.network];
    if (!geojson) {
      try {
        const url = `/maps/madrid/${selected.network}.geojson`;
        const res = await fetch(url);
        geojson = await res.json();
        this.loadedGeojsonData[selected.network] = geojson;
      } catch (err) {
        console.warn('Could not fetch line geometry:', err);
        return;
      }
    }

    if (!geojson) return;

    // Extract the line feature and all stops serving this line
    const matchedFeatures = (geojson.features || []).filter((f: Feature) => {
      const isLine = f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString';
      if (isLine && f.properties?.['line'] === selected.line) {
        return true;
      }
      if (f.geometry?.type === 'Point') {
        let lines: string[] = [];
        try {
          const rawLines = f.properties?.['lines'];
          lines = typeof rawLines === 'string' ? JSON.parse(rawLines) : (rawLines || []);
        } catch {
          lines = [];
        }
        return lines.includes(selected.line);
      }
      return false;
    });

    const hasLineGeom = matchedFeatures.some(
      (f: Feature) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString'
    );

    // If no explicit line segment exists, generate a connected route path from the stops
    if (!hasLineGeom) {
      const stopCoords = matchedFeatures
        .filter((f: Feature) => f.geometry?.type === 'Point')
        .map((f: Feature) => (f.geometry as Point).coordinates as [number, number]);

      if (stopCoords.length >= 2) {
        matchedFeatures.unshift({
          type: 'Feature',
          id: `fallback-line-${selected.line}`,
          geometry: {
            type: 'LineString',
            coordinates: stopCoords
          },
          properties: {
            id: `fallback-line-${selected.line}`,
            type: 'line',
            network: selected.network,
            line: selected.line,
            name: selected.name,
            color: selected.color || '#FACC15'
          }
        });
      }
    }

    const lineFeatures: Feature[] = matchedFeatures.map((f: Feature) => ({
      ...f,
      properties: {
        ...f.properties,
        color: selected.color || f.properties?.['color'] || '#FACC15'
      }
    }));

    source.setData({
      type: 'FeatureCollection',
      features: lineFeatures
    });

    // Compute bounding box and fit bounds to show the entire route
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    for (const f of lineFeatures) {
      if (f.geometry.type === 'LineString') {
        for (const coord of f.geometry.coordinates) {
          minLng = Math.min(minLng, coord[0]);
          maxLng = Math.max(maxLng, coord[0]);
          minLat = Math.min(minLat, coord[1]);
          maxLat = Math.max(maxLat, coord[1]);
        }
      } else if (f.geometry.type === 'MultiLineString') {
        for (const segment of f.geometry.coordinates) {
          for (const coord of segment) {
            minLng = Math.min(minLng, coord[0]);
            maxLng = Math.max(maxLng, coord[0]);
            minLat = Math.min(minLat, coord[1]);
            maxLat = Math.max(maxLat, coord[1]);
          }
        }
      } else if (f.geometry.type === 'Point') {
        minLng = Math.min(minLng, f.geometry.coordinates[0]);
        maxLng = Math.max(maxLng, f.geometry.coordinates[0]);
        minLat = Math.min(minLat, f.geometry.coordinates[1]);
        maxLat = Math.max(maxLat, f.geometry.coordinates[1]);
      }
    }

    if (minLng !== Infinity && maxLng !== -Infinity) {
      this.map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat]
        ],
        {
          padding: { top: 90, bottom: 90, left: 100, right: 100 },
          maxZoom: 15,
          duration: 1200
        }
      );
    }
  }

  dismissError(): void {
    this.service.setError(null);
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.clearStationMarker();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
