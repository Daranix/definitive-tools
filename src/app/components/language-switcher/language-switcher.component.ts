import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { I18nService } from '../../i18n/i18n.service';
import type { Language } from '../../i18n/languages';

export type LanguageSwitcherVariant = 'light' | 'dark';

/**
 * Dropdown that switches between the languages shipped with the application.
 * The choice is reflected in the URL (`/` ↔ `/es`) and remembered.
 */
@Component({
  selector: 'app-language-switcher',
  imports: [TranslatePipe, LucideIconComponent],
  templateUrl: './language-switcher.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class LanguageSwitcherComponent {
  private readonly i18n = inject(I18nService);

  readonly languages = this.i18n.languages;
  readonly i18nService = this.i18n;
  readonly open = signal(false);
  readonly variant = input<LanguageSwitcherVariant>('light');

  readonly buttonClass = computed(() =>
    this.variant() === 'dark'
      ? 'flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20'
      : 'flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-xs transition-colors hover:bg-slate-50 hover:text-indigo-600',
  );

  toggle(): void {
    this.open.update((open) => !open);
  }

  select(language: Language): void {
    this.open.set(false);
    if (language === this.i18n.language()) return;
    void this.i18n.setLanguage(language, { navigate: true });
  }
}
