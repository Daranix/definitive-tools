import {
  Component,
  ElementRef,
  HostListener,
  inject,
  viewChild,
  ChangeDetectionStrategy
} from '@angular/core';
import { MadridTransportMapService } from '../../madrid-transport-map.service';
import { SearchResultItem, NETWORK_METAS, TARIFF_ZONES } from '../../madrid-transport-map.models';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-map-search',
  standalone: true,
  imports: [LucideIconComponent],
  templateUrl: './map-search.component.html',
  styleUrl: './map-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapSearchComponent {
  readonly service = inject(MadridTransportMapService);
  private readonly elementRef = inject(ElementRef);
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly networkMetas = NETWORK_METAS;
  readonly tariffZones = TARIFF_ZONES;

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
