import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { AtSign, Bolt, Bookmark, CaseUpper, Download, House, IdCard, ImageOff, Link, LucideAngularModule, MapPin, Phone, QrCode, Scissors, TabletSmartphone, Wifi } from 'lucide-angular';
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
        Scissors,
        ImageOff,
        House
      }),
      CommonModule
    ),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
  ]
};
