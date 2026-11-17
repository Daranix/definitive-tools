import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TOOLS, type Tool, type ToolCategoryId } from '../../utils/constants';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { LanguageSwitcherComponent } from '@/app/components/language-switcher/language-switcher.component';
import { LocalizeUrlPipe } from '@/app/pipes/localize-url.pipe';
import { I18nService } from '@/app/i18n/i18n.service';

@Component({
  selector: 'app-sidemenu',
  imports: [
    RouterModule,
    LucideIconComponent,
    LanguageSwitcherComponent,
    LocalizeUrlPipe,
    TranslatePipe,
  ],
  templateUrl: './sidemenu.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sidemenu.component.scss',
})
export class SidemenuComponent {
  private readonly i18n = inject(I18nService);

  readonly tools = TOOLS;
  readonly i18nService = this.i18n;

  readonly categorizedTools = computed(() => {
    // Rebuild the category labels whenever the language changes.
    this.i18n.language();

    const groups = new Map<ToolCategoryId, Tool[]>();
    for (const tool of TOOLS) {
      const bucket = groups.get(tool.category);
      if (bucket) {
        bucket.push(tool);
      } else {
        groups.set(tool.category, [tool]);
      }
    }

    return [...groups.entries()].map(([category, tools]) => ({
      category,
      label: this.i18n.t(`tools.categories.${category}`),
      tools,
    }));
  });
}
