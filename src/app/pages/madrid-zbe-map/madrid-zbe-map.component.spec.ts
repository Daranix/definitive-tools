import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MadridZbeMapComponent } from './madrid-zbe-map.component';
import { MadridZbeMapService } from './madrid-zbe-map.service';
import { MetadataService } from '@/app/services/metadata.service';

describe('MadridZbeMapComponent', () => {
  describe('Server-Side Rendering (SSR) Isolation', () => {
    let fixture: ComponentFixture<MadridZbeMapComponent>;
    let component: MadridZbeMapComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MadridZbeMapComponent],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          MadridZbeMapService,
          MetadataService,
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(MadridZbeMapComponent);
      component = fixture.componentInstance;
    });

    it('should create component on server platform without invoking WebGL or MapLibre', () => {
      expect(component).toBeTruthy();
    });

    it('should dismiss error notification when dismissError is called', () => {
      const service = TestBed.inject(MadridZbeMapService);
      service.setError('Network failure');
      expect(service.networkError()).toBe('Network failure');

      component.dismissError();
      expect(service.networkError()).toBeNull();
    });

    it('should toggle desktop simulator tab', () => {
      expect(component.desktopTab()).toBe('layers');
      component.toggleDesktopSimulator();
      expect(component.desktopTab()).toBe('checker');
      component.toggleDesktopSimulator();
      expect(component.desktopTab()).toBe('layers');
    });

    it('should toggle mobile drawer tabs', () => {
      const service = TestBed.inject(MadridZbeMapService);
      component.openMobileLayers();
      expect(service.mobileDrawerTab()).toBe('layers');

      component.openMobileZones();
      expect(service.mobileDrawerTab()).toBe('zones');

      component.openMobileChecker();
      expect(service.mobileDrawerTab()).toBe('checker');

      component.closeMobileDrawer();
      expect(service.mobileDrawerTab()).toBe('none');
    });
  });

  describe('Browser Platform Initialization', () => {
    let fixture: ComponentFixture<MadridZbeMapComponent>;
    let component: MadridZbeMapComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MadridZbeMapComponent],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          MadridZbeMapService,
          MetadataService,
          { provide: PLATFORM_ID, useValue: 'browser' }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(MadridZbeMapComponent);
      component = fixture.componentInstance;
    });

    it('should create component successfully on browser platform', () => {
      expect(component).toBeTruthy();
    });
  });
});
