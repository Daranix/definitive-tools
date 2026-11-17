import {
  Component,
  computed,
  effect,
  inject,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { LanguageSwitcherComponent } from '@/app/components/language-switcher/language-switcher.component';
import { LocalizeUrlPipe } from '@/app/pipes/localize-url.pipe';
import { I18nService } from '@/app/i18n/i18n.service';
import {
  TOOLS,
  CATEGORIES,
  type ToolCategory,
} from '../../utils/constants';
import { MetadataService } from '@app/services/metadata.service';
import { FooterComponent } from '../../components/footer/footer.component';
import { GithubService } from '../../services/github.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-home',
  imports: [
    LucideIconComponent,
    RouterLink,
    FooterComponent,
    LanguageSwitcherComponent,
    LocalizeUrlPipe,
    TranslatePipe,
  ],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly metadataService = inject(MetadataService);
  private readonly githubService = inject(GithubService);
  private readonly i18n = inject(I18nService);

  readonly i18nService = this.i18n;
  readonly categories = CATEGORIES;
  readonly stars = toSignal(this.githubService.getRepoStars(), {
    initialValue: 0,
  });
  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<ToolCategory>('all');
  readonly isMobileMenuOpen = signal<boolean>(false);

  readonly filteredTools = computed(() => {
    // Re-evaluate the search index whenever the language changes.
    this.i18n.language();

    const query = this.searchQuery().toLowerCase().trim();
    const category = this.selectedCategory();

    let list = [...TOOLS];
    if (category === 'favorites') {
      let favs: string[] = [];
      if (isPlatformBrowser(this.platformId)) {
        try {
          favs = JSON.parse(localStorage.getItem('favorite-tools') || '[]');
        } catch {}
      }
      list = list.filter((tool) => favs.includes(tool.id));
    } else if (category !== 'all') {
      list = list.filter((tool) => tool.category === category);
    }

    if (!query) {
      return list;
    }

    return list.filter((tool) => {
      const name = this.i18n.t(`tools.${tool.id}.name`).toLowerCase();
      const description = this.i18n
        .t(`tools.${tool.id}.description`)
        .toLowerCase();
      const categoryLabel = this.categoryLabel(tool.category).toLowerCase();

      return (
        name.includes(query) ||
        description.includes(query) ||
        categoryLabel.includes(query)
      );
    });
  });

  constructor() {
    this.updateMetadata();
    effect(() => {
      this.i18n.language();
      this.updateMetadata();
    });
  }

  categoryLabel(category: ToolCategory): string {
    return this.i18n.t(`tools.categories.${category}`);
  }

  private updateMetadata(): void {
    this.metadataService.updateMetadata({
      title: this.i18n.t('home.seo.title'),
      description: this.i18n.t('home.seo.description'),
      keywords: this.i18n.t('home.seo.keywords'),
    });
  }
}
