import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-menu-icon',
  imports: [
    FormsModule,
    LucideAngularModule
  ],
  templateUrl: './menu-icon.component.html',
  styleUrl: './menu-icon.component.scss'
})
export class MenuIconComponent {
  readonly toggleMenu = model<boolean>(false);
}
