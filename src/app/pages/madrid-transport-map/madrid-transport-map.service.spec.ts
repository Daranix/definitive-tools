import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MadridTransportMapService } from './madrid-transport-map.service';
import { TransitStopProperties, TARIFF_ZONES } from './madrid-transport-map.models';

describe('MadridTransportMapService', () => {
  let service: MadridTransportMapService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MadridTransportMapService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(MadridTransportMapService);
  });

  describe('Initial Default State', () => {
    it('should initialize with Metro and Cercanías active, and buses inactive', () => {
      const networks = service.networkVisibility();
      expect(networks.metro).toBeTrue();
      expect(networks.cercanias).toBeTrue();
      expect(networks.emt).toBeFalse();
      expect(networks.interurban).toBeFalse();
    });

    it('should initialize with tariff zones visible and default opacity at 0.3', () => {
      expect(service.showZones()).toBeTrue();
      expect(service.zoneOpacity()).toBe(0.3);
    });

    it('should initialize with null selection and empty search query', () => {
      expect(service.selectedItem()).toBeNull();
      expect(service.searchQuery()).toBe('');
      expect(service.searchResults()).toEqual([]);
    });
  });

  describe('Network and Layer Mutations', () => {
    it('should toggle network visibility independently', () => {
      service.toggleNetwork('emt');
      expect(service.networkVisibility().emt).toBeTrue();

      service.toggleNetwork('metro');
      expect(service.networkVisibility().metro).toBeFalse();

      service.setNetworkVisibility('cercanias', false);
      expect(service.networkVisibility().cercanias).toBeFalse();
    });

    it('should toggle tariff zones visibility', () => {
      service.toggleZones();
      expect(service.showZones()).toBeFalse();

      service.toggleZones();
      expect(service.showZones()).toBeTrue();
    });

    it('should update zone opacity within valid bounds', () => {
      service.setZoneOpacity(0.55);
      expect(service.zoneOpacity()).toBe(0.55);
    });

    it('should clamp zone opacity to minimum 0.05 when lower value provided', () => {
      service.setZoneOpacity(0.01);
      expect(service.zoneOpacity()).toBe(0.05);
    });

    it('should clamp zone opacity to maximum 0.80 when higher value provided', () => {
      service.setZoneOpacity(0.95);
      expect(service.zoneOpacity()).toBe(0.8);
    });
  });

  describe('Station and Zone Selection', () => {
    const mockStation: TransitStopProperties = {
      id: 'metro-sol',
      name: 'Puerta del Sol',
      network: 'metro',
      lines: ['1', '2', '3'],
      zone: 'A',
      wheelchairAccessible: true,
      coordinates: [-3.7038, 40.4168]
    };

    it('should select a transit station and update selectedItem signal', () => {
      service.selectStation(mockStation);
      const sel = service.selectedItem();
      expect(sel).not.toBeNull();
      expect(sel?.type).toBe('station');
      expect((sel?.data as TransitStopProperties).name).toBe('Puerta del Sol');
      expect(sel?.coordinates).toEqual([-3.7038, 40.4168]);
    });

    it('should select a tariff zone by code', () => {
      service.selectZone('B1');
      const sel = service.selectedItem();
      expect(sel).not.toBeNull();
      expect(sel?.type).toBe('zone');
      expect(sel?.data).toEqual(TARIFF_ZONES['B1']);
    });

    it('should clear selection when clearSelection is called', () => {
      service.selectStation(mockStation);
      expect(service.selectedItem()).not.toBeNull();

      service.clearSelection();
      expect(service.selectedItem()).toBeNull();
    });
  });

  describe('Search and Camera Navigation', () => {
    const mockRegistry: TransitStopProperties[] = [
      {
        id: 'metro-sol',
        name: 'Puerta del Sol',
        network: 'metro',
        lines: ['1', '2', '3'],
        zone: 'A',
        coordinates: [-3.7038, 40.4168]
      },
      {
        id: 'cercanias-atocha',
        name: 'Atocha Cercanías',
        network: 'cercanias',
        lines: ['C-1', 'C-2', 'C-5'],
        zone: 'A',
        coordinates: [-3.6908, 40.4068]
      },
      {
        id: 'interurban-las-rozas',
        name: 'Las Rozas (Burgo)',
        network: 'interurban',
        lines: ['621', '622'],
        zone: 'B2',
        coordinates: [-3.8741, 40.4934]
      }
    ];

    beforeEach(() => {
      service.registerStations(mockRegistry);
    });

    it('should return empty search results if query is less than 2 characters', () => {
      service.setSearchQuery('S');
      expect(service.searchResults()).toEqual([]);
    });

    it('should find stations matching name', () => {
      service.setSearchQuery('Sol');
      const results = service.searchResults();
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Puerta del Sol');
      expect(results[0].network).toBe('metro');
    });

    it('should find stations matching line numbers', () => {
      service.setSearchQuery('C-5');
      const results = service.searchResults();
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Atocha Cercanías');
    });

    it('should return empty when no matching station exists', () => {
      service.setSearchQuery('XYZ999');
      expect(service.searchResults()).toEqual([]);
    });

    it('should trigger flyTo and set target with coordinates and zoom', () => {
      service.flyTo([-3.7038, 40.4168], 15);
      const target = service.flyToTarget();
      expect(target).not.toBeNull();
      expect(target?.coordinates).toEqual([-3.7038, 40.4168]);
      expect(target?.zoom).toBe(15);
    });

    it('should select search result and dispatch flyTo', () => {
      service.setSearchQuery('Sol');
      const results = service.searchResults();
      expect(results.length).toBeGreaterThan(0);

      service.selectSearchResult(results[0]);
      expect(service.selectedItem()?.type).toBe('station');
      expect((service.selectedItem()?.data as TransitStopProperties).name).toBe('Puerta del Sol');
      expect(service.searchQuery()).toBe('');
      expect(service.flyToTarget()?.coordinates).toEqual([-3.7038, 40.4168]);
    });
  });

  describe('Error and Notification Handling', () => {
    it('should set and clear network error messages', () => {
      service.setError('Failed to fetch dataset');
      expect(service.networkError()).toBe('Failed to fetch dataset');

      service.setError(null);
      expect(service.networkError()).toBeNull();
    });
  });
});
