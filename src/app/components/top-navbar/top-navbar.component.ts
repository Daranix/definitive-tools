import { TOOLS } from '@/app/utils/constants';
import {
  Component,
  computed,
  inject,
  input,
  model,
  signal,
  effect,
  ChangeDetectionStrategy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { LanguageSwitcherComponent } from '@/app/components/language-switcher/language-switcher.component';
import { LocalizeUrlPipe } from '@/app/pipes/localize-url.pipe';
import { I18nService } from '@/app/i18n/i18n.service';
import { ToastService } from '@app/services/toast.service';
import { GithubService } from '../../services/github.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-top-navbar',
  imports: [
    LucideIconComponent,
    RouterLink,
    LocalizeUrlPipe,
    TranslatePipe,
    LanguageSwitcherComponent,
  ],
  templateUrl: './top-navbar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './top-navbar.component.scss',
})
export class TopNavbarComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly i18n = inject(I18nService);
  readonly activatedRoute = inject(ActivatedRoute);
  readonly toastService = inject(ToastService);
  private readonly githubService = inject(GithubService);

  readonly compact = input<boolean>(false);
  readonly collapsible = input<boolean>(false);
  readonly hideHero = input<boolean>(false);
  readonly isCollapsed = model<boolean>(false);

  readonly stars = toSignal(this.githubService.getRepoStars(), {
    initialValue: 0,
  });
  readonly info = computed(() => this.getToolInfo());
  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly isFavorite = signal<boolean>(false);

  toggleCollapse() {
    this.isCollapsed.set(!this.isCollapsed());
  }

  constructor() {
    effect(() => {
      const toolInfo = this.info();
      if (toolInfo) {
        const favs = this.getFavorites();
        this.isFavorite.set(favs.includes(toolInfo.id));
      }
    });
  }

  /**
   * Tool metadata for the active route, with its name and description already
   * translated for the active language.
   */
  private getToolInfo() {
    // Re-resolve labels when the language changes.
    this.i18n.language();

    const id = this.activatedRoute.snapshot.data['id'] as string | undefined;
    const tool = TOOLS.find((candidate) => candidate.id === id);
    if (!tool) {
      return undefined;
    }

    return {
      ...tool,
      name: this.i18n.t(`tools.${tool.id}.name`),
      description: this.i18n.t(`tools.${tool.id}.description`),
    };
  }

  private getFavorites(): string[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }
    try {
      return JSON.parse(localStorage.getItem('favorite-tools') || '[]');
    } catch {
      return [];
    }
  }

  toggleFavorite() {
    const toolInfo = this.info();
    if (!toolInfo) return;

    let favs = this.getFavorites();
    if (favs.includes(toolInfo.id)) {
      favs = favs.filter((id) => id !== toolInfo.id);
      this.isFavorite.set(false);
      this.toastService.info({
        message: this.i18n.t('common.toolBar.removedFromFavorites', {
          name: toolInfo.name,
        }),
      });
    } else {
      favs.push(toolInfo.id);
      this.isFavorite.set(true);
      this.toastService.success({
        message: this.i18n.t('common.toolBar.addedToFavorites', {
          name: toolInfo.name,
        }),
      });
    }
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('favorite-tools', JSON.stringify(favs));
    }
  }

  shareTool() {
    const toolInfo = this.info();
    if (!toolInfo) return;

    const shareData = {
      title: this.i18n.t('common.toolBar.shareTitle', { name: toolInfo.name }),
      text: toolInfo.description,
      url: window.location.href,
    };

    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare(shareData)
    ) {
      navigator
        .share(shareData)
        .then(() =>
          this.toastService.success({
            message: this.i18n.t('common.toolBar.sharedSuccessfully'),
          }),
        )
        .catch((err) => {
          if (err.name !== 'AbortError') {
            this.fallbackShare();
          }
        });
    } else {
      this.fallbackShare();
    }
  }

  private fallbackShare() {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        this.toastService.success({
          message: this.i18n.t('common.toolBar.linkCopied'),
        });
      })
      .catch(() => {
        this.toastService.error({
          message: this.i18n.t('common.toolBar.linkCopyFailed'),
        });
      });
  }
}
