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
import { MadridZbeMapService } from './madrid-zbe-map.service';
import { MapSearchComponent } from './components/map-search/map-search.component';
import { LayerControlsComponent } from './components/layer-controls/layer-controls.component';
import { ZoneLegendComponent } from './components/zone-legend/zone-legend.component';
import { DetailDrawerComponent } from './components/detail-drawer/detail-drawer.component';
import { AccessCheckerComponent } from './components/access-checker/access-checker.component';
import {
  BasemapType,
  ZBE_ZONES_META,
  ZbeCameraProperties,
  ZbeParkingProperties,
  ZbeZoneId,
  ZbeZoneProperties
} from './madrid-zbe-map.models';
import type * as MapLibreGL from 'maplibre-gl';
import type { FilterSpecification } from 'maplibre-gl';

const CAMERA_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="16.5" fill="#0284C7" stroke="#FFFFFF" stroke-width="2.5"/>
  <path d="M12 14.5h2.2l1.6-2.5h4.4l1.6 2.5H24a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V16.5a2 2 0 0 1 2-2z" fill="#FFFFFF"/>
  <circle cx="18" cy="20.2" r="3.2" fill="#0284C7" stroke="#FFFFFF" stroke-width="1.4"/>
</svg>`;

const PARKING_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="16.5" fill="#059669" stroke="#FFFFFF" stroke-width="2.5"/>
  <text x="18" y="21" fill="#FFFFFF" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="17" text-anchor="middle" dominant-baseline="central">P</text>
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
  selector: 'app-madrid-zbe-map',
  standalone: true,
  imports: [
    TopNavbarComponent,
    LucideIconComponent,
    MapSearchComponent,
    LayerControlsComponent,
    ZoneLegendComponent,
    DetailDrawerComponent,
    AccessCheckerComponent
  ],
  templateUrl: './madrid-zbe-map.component.html',
  styleUrl: './madrid-zbe-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full w-full'
  }
})
export class MadridZbeMapComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly metadataService = inject(MetadataService);
  readonly service = inject(MadridZbeMapService);

  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  private map: MapLibreGL.Map | null = null;
  private maplibreglModule: typeof MapLibreGL | null = null;
  private activeMarker: MapLibreGL.Marker | null = null;
  private resizeObserver: ResizeObserver | null = null;
  readonly isMapReady = signal<boolean>(false);
  readonly desktopTab = signal<'layers' | 'detail' | 'checker'>('layers');
  readonly isDesktopPanelCollapsed = signal<boolean>(false);

  // Mobile Bottom Sheet Gesture state
  readonly isDrawerExpanded = signal<boolean>(false);
  private touchStartY = 0;
  private currentTouchY = 0;
  private isDragging = false;

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Madrid 360 & ZBE Map - Zonas de Bajas Emisiones Interactivas',
      description:
        'Mapa interactivo de Madrid 360 y Zonas de Bajas Emisiones (ZBE Distrito Centro, Plaza Elíptica, M-30, cámaras de control OCR y simulador de etiquetas DGT).',
      keywords:
        'Madrid 360, ZBE Madrid, Madrid Central, Distrito Centro ZBEDEP, Plaza Eliptica ZBE, M-30 bajas emisiones, camaras ZBE Madrid, etiquetas DGT Madrid'
    });

    afterNextRender(async () => {
      if (isPlatformBrowser(this.platformId)) {
        await this.initMap();
      }
    });

    // Reactive effect for layer visibility & opacity
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

    // Reactive effect for selected zone / marker highlight
    effect(() => {
      const selected = this.service.selectedItem();
      if (!this.map || !this.isMapReady()) return;

      let zoneId = '';
      if (selected && selected.type === 'zone') {
        zoneId = (selected.data as ZbeZoneProperties).id;
        this.clearMarker();
      } else if (selected && selected.coordinates) {
        this.setMarker(selected.coordinates, (selected.data as { name: string }).name);
      } else {
        this.clearMarker();
      }

      const safeFilter: FilterSpecification = zoneId
        ? ['==', ['get', 'id'], zoneId]
        : ['==', ['get', 'id'], '__none__'];

      if (this.map.getLayer('zbe-selected-outline')) {
        this.map.setFilter('zbe-selected-outline', safeFilter);
      }

      if (selected) {
        this.desktopTab.set('detail');
        this.isDesktopPanelCollapsed.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.clearMarker();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  selectDesktopTab(tab: 'layers' | 'detail' | 'checker'): void {
    this.desktopTab.set(tab);
    this.isDesktopPanelCollapsed.set(false);
  }

  toggleDesktopPanelCollapse(): void {
    this.isDesktopPanelCollapsed.update((v) => !v);
  }

  toggleDesktopSimulator(): void {
    if (this.desktopTab() === 'checker') {
      this.desktopTab.set('layers');
    } else {
      this.desktopTab.set('checker');
      this.isDesktopPanelCollapsed.set(false);
    }
  }

  // Mobile Bottom Sheet Gestures
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

    if (deltaY < -35) {
      this.isDrawerExpanded.set(true);
    } else if (deltaY > 40 && this.isDrawerExpanded()) {
      this.isDrawerExpanded.set(false);
    } else if (deltaY > 75 && !this.isDrawerExpanded()) {
      this.closeMobileDrawer();
    }
  }

  openMobileLayers(): void {
    this.service.openMobileDrawer('layers');
  }

  openMobileZones(): void {
    this.service.openMobileDrawer('zones');
  }

  openMobileChecker(): void {
    this.service.openMobileDrawer('checker');
  }

  closeMobileDrawer(): void {
    this.isDrawerExpanded.set(false);
    this.service.closeMobileDrawer();
  }

  private setMarker(coords: [number, number], name: string): void {
    if (!this.map || !this.maplibreglModule) return;
    this.clearMarker();

    const el = document.createElement('div');
    el.className = 'relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none';
    el.innerHTML = `
      <div class="relative flex items-center justify-center">
        <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-5 w-5 bg-emerald-600 border-2 border-white shadow-lg"></span>
      </div>
    `;

    this.activeMarker = new this.maplibreglModule.Marker({ element: el })
      .setLngLat(coords)
      .addTo(this.map);
  }

  private clearMarker(): void {
    if (this.activeMarker) {
      this.activeMarker.remove();
      this.activeMarker = null;
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
        zoom: 11.5,
        minZoom: 8,
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
      this.service.setError('No se pudo inicializar el motor gráfico del mapa.');
    }
  }

  private async onMapLoaded(): Promise<void> {
    if (!this.map) return;

    try {
      const [cameraImg, parkingImg] = await Promise.all([
        createSvgImage(CAMERA_ICON_SVG, 36, 36),
        createSvgImage(PARKING_ICON_SVG, 36, 36)
      ]);
      this.map.addImage('icon-camera', cameraImg, { pixelRatio: 2 });
      this.map.addImage('icon-parking', parkingImg, { pixelRatio: 2 });
    } catch (e) {
      console.warn('Failed to register icon sprites:', e);
    }

    // ─── 1. Add ZBE Zones Source & Layers ────────────────────────────────────
    this.map.addSource('zbe-zones-source', {
      type: 'geojson',
      data: '/maps/madrid-360/zbe-zones.geojson'
    });

    // Zones Fill
    this.map.addLayer({
      id: 'zbe-zones-fill',
      type: 'fill',
      source: 'zbe-zones-source',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': this.service.zoneOpacity()
      }
    });

    // Zones Boundary Line
    this.map.addLayer({
      id: 'zbe-zones-line',
      type: 'line',
      source: 'zbe-zones-source',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 2.4,
        'line-opacity': 0.95
      }
    });

    // Selected Zone Glowing Highlight Outline
    this.map.addLayer({
      id: 'zbe-selected-outline',
      type: 'line',
      source: 'zbe-zones-source',
      filter: ['==', ['get', 'id'], '__none__'],
      paint: {
        'line-color': '#FFFFFF',
        'line-width': 4.5,
        'line-opacity': 1
      }
    });

    // ─── 2. Add Points (Cameras & Parkings) Source & Layers ───────────────────
    this.map.addSource('zbe-points-source', {
      type: 'geojson',
      data: '/maps/madrid-360/zbe-points.geojson'
    });

    // Parkings Symbol Layer
    this.map.addLayer({
      id: 'zbe-parkings-layer',
      type: 'symbol',
      source: 'zbe-points-source',
      filter: ['==', ['get', 'type'], 'parking'],
      layout: {
        'icon-image': 'icon-parking',
        'icon-size': 0.8,
        'icon-allow-overlap': true,
        'text-field': ['get', 'shortName'],
        'text-size': 11,
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
        'text-optional': true
      },
      paint: {
        'text-color': '#064E3B',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1.8
      }
    });

    // Cameras Symbol Layer
    this.map.addLayer({
      id: 'zbe-cameras-layer',
      type: 'symbol',
      source: 'zbe-points-source',
      filter: ['==', ['get', 'type'], 'camera'],
      layout: {
        'icon-image': 'icon-camera',
        'icon-size': 0.75,
        'icon-allow-overlap': true,
        'text-field': ['get', 'name'],
        'text-size': 10,
        'text-offset': [0, 1.3],
        'text-anchor': 'top',
        'text-optional': true
      },
      minzoom: 11,
      paint: {
        'text-color': '#0C4A6E',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1.5
      }
    });

    // ─── 3. Interactivity & Click Handlers ──────────────────────────────────
    // Click on Zones
    this.map.on('click', 'zbe-zones-fill', (e) => {
      if (!e.features || e.features.length === 0) return;
      // Prefer innermost / most specific zone clicked (Centro or Plaza Eliptica over Municipio)
      const priorityOrder: Record<string, number> = {
        'zbe-distrito-centro': 5,
        'zbe-plaza-eliptica': 5,
        'zbe-getafe': 4,
        'zbe-fuenlabrada': 4,
        'zbe-alcorcon': 4,
        'zbe-alcala': 4,
        'zbe-alcobendas': 4,
        'zbe-mostoles': 4,
        'zbe-parla': 4,
        'zbe-rivas': 4,
        'zbe-interior-m30': 3,
        'zbe-municipio': 1
      };

      const sorted = [...e.features].sort((a, b) => {
        const pA = priorityOrder[a.properties?.['id']] || 0;
        const pB = priorityOrder[b.properties?.['id']] || 0;
        return pB - pA;
      });

      const feat = sorted[0];
      const zoneId = feat.properties?.['id'] as ZbeZoneId;
      const zoneMeta = ZBE_ZONES_META[zoneId];
      if (zoneMeta) {
        this.service.selectZone(zoneMeta);
      }
    });

    // Click on Cameras
    this.map.on('click', 'zbe-cameras-layer', (e) => {
      if (!e.features || e.features.length === 0) return;
      const feat = e.features[0];
      const camId = feat.properties?.['id'];
      const cam = this.service.camerasRegistry().find((c) => c.id === camId);
      if (cam) {
        this.service.selectCamera(cam);
      }
    });

    // Click on Parkings
    this.map.on('click', 'zbe-parkings-layer', (e) => {
      if (!e.features || e.features.length === 0) return;
      const feat = e.features[0];
      const prkId = feat.properties?.['id'];
      const prk = this.service.parkingsRegistry().find((p) => p.id === prkId);
      if (prk) {
        this.service.selectParking(prk);
      }
    });

    // Mouse pointer feedbacks
    const interactiveLayers = ['zbe-zones-fill', 'zbe-cameras-layer', 'zbe-parkings-layer'];
    for (const layerId of interactiveLayers) {
      this.map.on('mouseenter', layerId, () => {
        if (this.map) this.map.getCanvas().style.cursor = 'pointer';
      });
      this.map.on('mouseleave', layerId, () => {
        if (this.map) this.map.getCanvas().style.cursor = '';
      });
    }

    this.isMapReady.set(true);
  }

  private syncLayerState(layers: {
    zones: Record<ZbeZoneId, boolean>;
    showCameras: boolean;
    showParkings: boolean;
    zoneOpacity: number;
  }): void {
    if (!this.map) return;

    // Build filter for zones fill & line based on active toggles
    const activeZoneIds = (Object.keys(layers.zones) as ZbeZoneId[]).filter(
      (z) => layers.zones[z]
    );

    const zonesFilter: FilterSpecification =
      activeZoneIds.length > 0
        ? ['in', ['get', 'id'], ['literal', activeZoneIds]]
        : ['==', ['get', 'id'], '__none__'];

    if (this.map.getLayer('zbe-zones-fill')) {
      this.map.setFilter('zbe-zones-fill', zonesFilter);
      this.map.setPaintProperty('zbe-zones-fill', 'fill-opacity', layers.zoneOpacity);
    }

    if (this.map.getLayer('zbe-zones-line')) {
      this.map.setFilter('zbe-zones-line', zonesFilter);
    }

    // Cameras Layer
    if (this.map.getLayer('zbe-cameras-layer')) {
      this.map.setLayoutProperty(
        'zbe-cameras-layer',
        'visibility',
        layers.showCameras ? 'visible' : 'none'
      );

      if (layers.showCameras) {
        const cameraFilter: FilterSpecification =
          activeZoneIds.length > 0
            ? [
                'all',
                ['==', ['get', 'type'], 'camera'],
                ['in', ['get', 'zoneId'], ['literal', activeZoneIds]]
              ]
            : ['==', ['get', 'id'], '__none__'];
        this.map.setFilter('zbe-cameras-layer', cameraFilter);
      }
    }

    // Parkings Layer
    if (this.map.getLayer('zbe-parkings-layer')) {
      this.map.setLayoutProperty(
        'zbe-parkings-layer',
        'visibility',
        layers.showParkings ? 'visible' : 'none'
      );

      if (layers.showParkings) {
        const parkingFilter: FilterSpecification =
          activeZoneIds.length > 0
            ? [
                'all',
                ['==', ['get', 'type'], 'parking'],
                ['in', ['get', 'zoneId'], ['literal', activeZoneIds]]
              ]
            : ['==', ['get', 'id'], '__none__'];
        this.map.setFilter('zbe-parkings-layer', parkingFilter);
      }
    }
  }

  dismissError(): void {
    this.service.dismissError();
  }
}
