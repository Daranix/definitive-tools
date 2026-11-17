import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  viewChild,
  ChangeDetectionStrategy
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MadridZbeMapService } from '../../madrid-zbe-map.service';
import { SearchResultItem, ZBE_ZONES_META, ZbeZoneId } from '../../madrid-zbe-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { I18nService } from '@/app/i18n/i18n.service';

interface SearchResultView {
  item: SearchResultItem;
  name: string;
  subtitle: string;
  badge: string;
}

@Component({
  selector: 'app-zbe-map-search',
  standalone: true,
  imports: [LucideIconComponent, TranslatePipe],
  templateUrl: './map-search.component.html',
  styleUrl: './map-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapSearchComponent {
  readonly service = inject(MadridZbeMapService);
  private readonly i18n = inject(I18nService);
  private readonly elementRef = inject(ElementRef);
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  /** Search matches with the copy and number formatting of the active language. */
  readonly results = computed<SearchResultView[]>(() =>
    this.service.searchResults().map((item) => ({
      item,
      name: this.displayName(item),
      subtitle: this.subtitle(item),
      badge: this.i18n.t(`madrid-zbe-map.search.badges.${item.type}`)
    }))
  );

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.service.setSearchQuery(input.value);
  }

  clearSearch(): void {
    this.service.clearSearch();
    const inputEl = this.searchInput()?.nativeElement;
    if (inputEl) {
      inputEl.value = '';
      inputEl.focus();
    }
  }

  selectResult(item: SearchResultItem): void {
    this.service.selectSearchResult(item);
    const inputEl = this.searchInput()?.nativeElement;
    if (inputEl) {
      inputEl.value = '';
    }
  }

  private displayName(item: SearchResultItem): string {
    if (item.type === 'zone') {
      return this.i18n.t(`madrid-zbe-map.zones.${item.id}.name`);
    }
    return item.name;
  }

  private subtitle(item: SearchResultItem): string {
    if (item.type === 'zone') {
      const zone = ZBE_ZONES_META[item.id as ZbeZoneId];
      return this.i18n.t('madrid-zbe-map.search.zoneSubtitle', {
        level: this.i18n.t(`madrid-zbe-map.zones.${item.id}.restrictionLevel`),
        area: this.i18n.formatNumber(zone?.areaKm2 ?? 0)
      });
    }

    if (item.type === 'parking') {
      return this.i18n.t('madrid-zbe-map.search.parkingSubtitle', {
        capacity: this.i18n.formatNumber(item.capacity ?? 0),
        transit: item.transitConnections ?? ''
      });
    }

    return this.i18n.t('madrid-zbe-map.search.cameraSubtitle', {
      location: item.location ?? '',
      zone: item.zoneName ?? ''
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      if (this.service.searchQuery()) {
        this.service.clearSearch();
      }
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.clearSearch();
  }
}
