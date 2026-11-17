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
import { I18nService } from '@/app/i18n/i18n.service';
import { MadridTransportMapService } from '../../madrid-transport-map.service';
import {
  NetworkId,
  SearchResultItem,
  NETWORK_METAS,
  TARIFF_ZONES
} from '../../madrid-transport-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-map-search',
  standalone: true,
  imports: [LucideIconComponent, TranslatePipe],
  templateUrl: './map-search.component.html',
  styleUrl: './map-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapSearchComponent {
  readonly service = inject(MadridTransportMapService);
  private readonly i18n = inject(I18nService);
  private readonly elementRef = inject(ElementRef);
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly networkMetas = NETWORK_METAS;
  readonly tariffZones = TARIFF_ZONES;

  readonly networkShortNames = computed<Record<NetworkId, string>>(() => ({
    metro: this.i18n.t('madrid-transport-map.networks.metro.shortName'),
    cercanias: this.i18n.t('madrid-transport-map.networks.cercanias.shortName'),
    emt: this.i18n.t('madrid-transport-map.networks.emt.shortName'),
    interurban: this.i18n.t('madrid-transport-map.networks.interurban.shortName')
  }));

  formatCount(count: number): string {
    return this.i18n.formatNumber(count);
  }

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
