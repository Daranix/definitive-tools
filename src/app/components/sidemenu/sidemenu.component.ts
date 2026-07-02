import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TOOLS } from '../../utils/constants';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-sidemenu',
  imports: [RouterModule, LucideIconComponent],
  templateUrl: './sidemenu.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sidemenu.component.scss',
})
export class SidemenuComponent {
  readonly tools = TOOLS;

  readonly categorizedTools = computed(() => {
    const groups: Record<string, Array<(typeof TOOLS)[number]>> = {};
    for (const tool of TOOLS) {
      if (!groups[tool.category]) {
        groups[tool.category] = [];
      }
      groups[tool.category].push(tool);
    }
    return Object.entries(groups).map(([name, tools]) => ({
      name,
      tools,
    }));
  });
}
