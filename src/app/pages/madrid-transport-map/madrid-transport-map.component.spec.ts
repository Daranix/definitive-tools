import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MadridTransportMapComponent } from './madrid-transport-map.component';
import { MadridTransportMapService } from './madrid-transport-map.service';
import { MetadataService } from '@/app/services/metadata.service';

describe('MadridTransportMapComponent', () => {
  describe('Server-Side Rendering (SSR) Isolation', () => {
    let fixture: ComponentFixture<MadridTransportMapComponent>;
    let component: MadridTransportMapComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MadridTransportMapComponent],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          MadridTransportMapService,
          MetadataService,
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(MadridTransportMapComponent);
      component = fixture.componentInstance;
    });

    it('should create component on server platform without invoking WebGL or MapLibre', () => {
      expect(component).toBeTruthy();
    });

    it('should dismiss error notification when dismissError is called', () => {
      const service = TestBed.inject(MadridTransportMapService);
      service.setError('Network failure');
      expect(service.networkError()).toBe('Network failure');

      component.dismissError();
      expect(service.networkError()).toBeNull();
    });
  });

  describe('Browser Platform Initialization', () => {
    let fixture: ComponentFixture<MadridTransportMapComponent>;
    let component: MadridTransportMapComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MadridTransportMapComponent],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          MadridTransportMapService,
          MetadataService,
          { provide: PLATFORM_ID, useValue: 'browser' }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(MadridTransportMapComponent);
      component = fixture.componentInstance;
    });

    it('should create component successfully on browser platform', () => {
      expect(component).toBeTruthy();
    });

    it('should clean up map on destroy', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
