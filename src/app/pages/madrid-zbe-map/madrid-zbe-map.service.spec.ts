import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MadridZbeMapService } from './madrid-zbe-map.service';
import { ZBE_ZONES_META } from './madrid-zbe-map.models';

describe('MadridZbeMapService', () => {
  let service: MadridZbeMapService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MadridZbeMapService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(MadridZbeMapService);
  });

  describe('Initial Default State', () => {
    it('should initialize with all 4 ZBE zones active', () => {
      const visibility = service.zoneVisibility();
      expect(visibility['zbe-distrito-centro']).toBeTrue();
      expect(visibility['zbe-plaza-eliptica']).toBeTrue();
      expect(visibility['zbe-interior-m30']).toBeTrue();
      expect(visibility['zbe-municipio']).toBeTrue();
    });

    it('should initialize with cameras and parkings visible and opacity at 0.35', () => {
      expect(service.showCameras()).toBeTrue();
      expect(service.showParkings()).toBeTrue();
      expect(service.zoneOpacity()).toBe(0.35);
    });

    it('should initialize with streets basemap and null selection', () => {
      expect(service.activeBasemap()).toBe('streets');
      expect(service.selectedItem()).toBeNull();
      expect(service.searchQuery()).toBe('');
      expect(service.searchResults()).toEqual([]);
    });
  });

  describe('Layer and Opacity Mutations', () => {
    it('should toggle zones independently', () => {
      service.toggleZone('zbe-distrito-centro');
      expect(service.zoneVisibility()['zbe-distrito-centro']).toBeFalse();

      service.toggleZone('zbe-distrito-centro');
      expect(service.zoneVisibility()['zbe-distrito-centro']).toBeTrue();
    });

    it('should toggle cameras and parkings', () => {
      service.toggleCameras();
      expect(service.showCameras()).toBeFalse();

      service.toggleParkings();
      expect(service.showParkings()).toBeFalse();
    });

    it('should clamp opacity between 0.10 and 0.85', () => {
      service.setZoneOpacity(0.99);
      expect(service.zoneOpacity()).toBe(0.85);

      service.setZoneOpacity(0.01);
      expect(service.zoneOpacity()).toBe(0.1);

      service.setZoneOpacity(0.5);
      expect(service.zoneOpacity()).toBe(0.5);
    });

    it('should update basemap', () => {
      service.setBasemap('satellite');
      expect(service.activeBasemap()).toBe('satellite');

      service.setBasemap('gray');
      expect(service.activeBasemap()).toBe('gray');
    });
  });

  describe('Selection and FlyTo State', () => {
    it('should select zone and set fly-to target', () => {
      const zone = ZBE_ZONES_META['zbe-distrito-centro'];
      service.selectZone(zone);

      expect(service.selectedItem()?.type).toBe('zone');
      expect(service.selectedItem()?.data).toEqual(zone);
      expect(service.flyToTarget()?.coordinates).toEqual(zone.center!);
    });

    it('should clear selection', () => {
      const zone = ZBE_ZONES_META['zbe-plaza-eliptica'];
      service.selectZone(zone);
      expect(service.selectedItem()).not.toBeNull();

      service.clearSelection();
      expect(service.selectedItem()).toBeNull();
    });
  });

  describe('DGT Access Simulator Logic', () => {
    it('should allow CERO badge everywhere with unlimited SER parking', () => {
      service.simBadge.set('cero');
      const results = service.simulationResults();

      for (const res of results) {
        expect(res.allowed).toBe('yes');
        expect(res.fineRisk).toBeFalse();
      }
      const centro = results.find((r) => r.zoneId === 'zbe-distrito-centro');
      expect(centro?.serParkingAllowed).toBeTrue();
    });

    it('should require parking or grant max 2h SER in Distrito Centro for ECO', () => {
      service.simBadge.set('eco');
      const results = service.simulationResults();
      const centro = results.find((r) => r.zoneId === 'zbe-distrito-centro');

      expect(centro?.allowed).toBe('yes');
      expect(centro?.serMaxHours).toBe(2);
    });

    it('should conditionally allow badge C if parking is selected, but prohibit if transit only', () => {
      service.simBadge.set('c');
      service.simResidentStatus.set('non-resident');

      // With public parking
      service.simPurpose.set('public-parking');
      let results = service.simulationResults();
      let centro = results.find((r) => r.zoneId === 'zbe-distrito-centro');
      expect(centro?.allowed).toBe('conditional');
      expect(centro?.fineRisk).toBeFalse();

      // Transit only (through traffic)
      service.simPurpose.set('transit');
      results = service.simulationResults();
      centro = results.find((r) => r.zoneId === 'zbe-distrito-centro');
      expect(centro?.allowed).toBe('no');
      expect(centro?.fineRisk).toBeTrue();
    });

    it('should strictly prohibit Badge A for non-residents with 200€ fine risk', () => {
      service.simBadge.set('a');
      service.simResidentStatus.set('non-resident');

      const results = service.simulationResults();
      const centro = results.find((r) => r.zoneId === 'zbe-distrito-centro');
      const eliptica = results.find((r) => r.zoneId === 'zbe-plaza-eliptica');
      const m30 = results.find((r) => r.zoneId === 'zbe-interior-m30');
      const muni = results.find((r) => r.zoneId === 'zbe-municipio');

      expect(centro?.allowed).toBe('no');
      expect(centro?.fineRisk).toBeTrue();

      expect(eliptica?.allowed).toBe('no');
      expect(eliptica?.fineRisk).toBeTrue();

      expect(m30?.allowed).toBe('no');
      expect(m30?.fineRisk).toBeTrue();

      expect(muni?.allowed).toBe('no');
      expect(muni?.fineRisk).toBeTrue();
    });
  });

  describe('Search Functionality', () => {
    it('should return empty matches for query length < 2', () => {
      service.setSearchQuery('a');
      expect(service.searchResults()).toEqual([]);
    });

    it('should match zones by name or keyword', () => {
      service.setSearchQuery('Centro');
      const results = service.searchResults();
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.id === 'zbe-distrito-centro')).toBeTrue();
    });
  });
});
