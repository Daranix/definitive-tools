import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { AtSign, Bolt, Bookmark, CaseUpper, Download, IdCard, Link, LucideAngularModule, MapPin, Phone, QrCode, TabletSmartphone, Wifi } from 'lucide-angular';
import { CommonModule } from '@angular/common';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      LucideAngularModule.pick({ 
        Bolt,
        QrCode,
        Link,
        CaseUpper,
        AtSign,
        Phone,
        TabletSmartphone,
        IdCard,
        Wifi,
        MapPin,
        Bookmark,
        Download,
      }),
      CommonModule
    ),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
  ]
};
