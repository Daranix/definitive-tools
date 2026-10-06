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
import { BasemapType, TariffZoneInfo, TransitStopProperties } from './madrid-transport-map.models';
import type * as MapLibreGL from 'maplibre-gl';

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
  changeDetection: ChangeDetectionStrategy.OnPush
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

    // Reactive effect for selected zone highlight
    effect(() => {
      const selected = this.service.selectedItem();
      if (!this.map || !this.isMapReady()) return;

      let zoneCode = '';
      if (selected && selected.type === 'zone') {
        zoneCode = (selected.data as TariffZoneInfo).code;
      } else if (selected && selected.type === 'station') {
        const station = selected.data as TransitStopProperties;
        if (station.zone) {
          zoneCode = station.zone;
        }
      }

      if (this.map.getLayer('zones-selected-fill')) {
        this.map.setFilter('zones-selected-fill', ['==', ['get', 'code'], zoneCode]);
      }
      if (this.map.getLayer('zones-selected-outline-casing')) {
        this.map.setFilter('zones-selected-outline-casing', ['==', ['get', 'code'], zoneCode]);
      }
      if (this.map.getLayer('zones-selected-outline')) {
        this.map.setFilter('zones-selected-outline', ['==', ['get', 'code'], zoneCode]);
      }
    });
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
            maxzoom: 17,
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
        maxZoom: 18
      });

      this.map.on('error', (err) => {
        console.warn('MapLibre internal event:', err);
      });

      this.map.addControl(
        new this.maplibreglModule.NavigationControl({ showCompass: true, visualizePitch: true }),
        'bottom-right'
      );

      this.map.on('load', () => {
        this.onMapLoaded();
      });
    } catch (err) {
      console.error('Failed to initialize MapLibre GL:', err);
      this.service.setError('Failed to initialize map graphics engine.');
    }
  }

  private onMapLoaded(): void {
    if (!this.map) return;

    // ─── 1. Add Tariff Zones ────────────────────────────────────────────────
    this.map.addSource('zones-source', {
      type: 'geojson',
      data: '/maps/madrid/zones.geojson'
    });

    this.map.addLayer({
      id: 'zones-fill',
      type: 'fill',
      source: 'zones-source',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': this.service.zoneOpacity()
      }
    });

    this.map.addLayer({
      id: 'zones-line',
      type: 'line',
      source: 'zones-source',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 1.8,
        'line-opacity': 0.85
      }
    });

    // Dedicated selected zone highlight layers (high-contrast dual outline + tint fill)
    this.map.addLayer({
      id: 'zones-selected-fill',
      type: 'fill',
      source: 'zones-source',
      filter: ['==', ['get', 'code'], ''],
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.55
      }
    });

    this.map.addLayer({
      id: 'zones-selected-outline-casing',
      type: 'line',
      source: 'zones-source',
      filter: ['==', ['get', 'code'], ''],
      paint: {
        'line-color': '#000000',
        'line-width': 7,
        'line-opacity': 0.95
      }
    });

    this.map.addLayer({
      id: 'zones-selected-outline',
      type: 'line',
      source: 'zones-source',
      filter: ['==', ['get', 'code'], ''],
      paint: {
        'line-color': '#FACC15',
        'line-width': 4.5,
        'line-opacity': 1
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
      type: 'circle',
      source: 'metro-source',
      filter: ['==', ['get', 'type'], 'station'],
      paint: {
        'circle-radius': 5.5,
        'circle-color': '#FFFFFF',
        'circle-stroke-color': '#00A9E0',
        'circle-stroke-width': 2.5
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
        'line-dasharray': [4, 1.5],
        'line-opacity': 0.95
      }
    });

    this.map.addLayer({
      id: 'cercanias-stations',
      type: 'circle',
      source: 'cercanias-source',
      filter: ['==', ['get', 'type'], 'station'],
      paint: {
        'circle-radius': 5.5,
        'circle-color': '#FFFFFF',
        'circle-stroke-color': '#E4002B',
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

    this.map.addSource('emt-source', {
      type: 'geojson',
      data,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 40
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
      type: 'circle',
      source: 'emt-source',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#0284C7',
        'circle-radius': 4.5,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#FFFFFF'
      }
    });

    this.setupBusInteractions('emt');
    this.emtLoaded = true;
  }

  private async loadInterurbanBusLayer(): Promise<void> {
    if (!this.map || this.interurbanLoaded) return;

    const data = await this.service.loadBusData('interurban');
    if (!data) return;

    this.map.addSource('interurban-source', {
      type: 'geojson',
      data,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 40
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
      type: 'circle',
      source: 'interurban-source',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#16A34A',
        'circle-radius': 4.5,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#FFFFFF'
      }
    });

    this.setupBusInteractions('interurban');
    this.interurbanLoaded = true;
  }

  private setupBusInteractions(network: 'emt' | 'interurban'): void {
    if (!this.map) return;

    const unclusteredLayer = `${network}-unclustered`;
    const clusterLayer = `${network}-clusters`;

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
    const layers = [`${network}-clusters`, `${network}-cluster-count`, `${network}-unclustered`];
    for (const l of layers) {
      if (this.map.getLayer(l)) {
        this.map.setLayoutProperty(l, 'visibility', visibility);
      }
    }
  }

  dismissError(): void {
    this.service.setError(null);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
