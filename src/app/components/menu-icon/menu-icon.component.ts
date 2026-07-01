import { Component, model, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-menu-icon',
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './menu-icon.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './menu-icon.component.scss',
})
export class MenuIconComponent {
  readonly toggleMenu = model<boolean>(false);
}
