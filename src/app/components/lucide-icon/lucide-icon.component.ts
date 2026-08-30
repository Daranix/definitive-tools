import { Component, Input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'lucide-icon, lucide-angular',
  standalone: true,
  imports: [LucideDynamicIcon],
  template: `<svg [lucideIcon]="name" [class]="class" [size]="size" [color]="color" [strokeWidth]="strokeWidth"></svg>`
})
export class LucideIconComponent {
  @Input() name!: string;
  @Input() class: string = '';
  @Input() size?: string | number;
  @Input() color?: string;
  @Input() strokeWidth?: string | number;
}
