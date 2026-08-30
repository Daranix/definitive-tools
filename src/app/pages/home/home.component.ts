import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { TOOLS } from '../../utils/constants';
import { MetadataService } from '@app/services/metadata.service';
import { FooterComponent } from '../../components/footer/footer.component';
import { GithubService } from '../../services/github.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-home',
  imports: [LucideIconComponent, RouterLink, FooterComponent],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly metadataService = inject(MetadataService);
  private readonly githubService = inject(GithubService);

  readonly stars = toSignal(this.githubService.getRepoStars(), { initialValue: 0 });
  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('All');
  readonly isMobileMenuOpen = signal<boolean>(false);

  readonly filteredTools = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const category = this.selectedCategory();

    let list = [...TOOLS];
    if (category === 'Favorites') {
      let favs: string[] = [];
      try {
        favs = JSON.parse(localStorage.getItem('favorite-tools') || '[]');
      } catch {}
      list = list.filter((t) => favs.includes(t.id));
    } else if (category !== 'All') {
      list = list.filter((t) => t.category === category);
    }

    if (!query) {
      return list;
    }

    return list.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query),
    );
  });

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Definitive Tools - Free Digital Utilities',
      description:
        'Access free, easy-to-use tools for all your digital needs without registration or downloads.',
      keywords:
        'online tools, free tools, digital tools, web tools, QR generator, utility tools',
    });
  }
}
