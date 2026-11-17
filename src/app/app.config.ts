import {
  ApplicationConfig,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
  withNoIncrementalHydration,
} from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { USED_ICONS } from './utils/constants';
import { provideLucideIcons } from '@lucide/angular';
import { provideHttpClient } from '@angular/common/http';
import { provideI18n } from './i18n/i18n.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideLucideIcons(...Object.values(USED_ICONS)),
    importProvidersFrom(CommonModule),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
    provideHttpClient(),
    ...provideI18n(),
  ],
};
