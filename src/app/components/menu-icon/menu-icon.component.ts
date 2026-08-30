import { Component, model, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';

@Component({
  selector: 'app-menu-icon',
  imports: [FormsModule, LucideIconComponent],
  templateUrl: './menu-icon.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './menu-icon.component.scss',
})
export class MenuIconComponent {
  readonly toggleMenu = model<boolean>(false);
}
