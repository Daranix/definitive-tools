import { DecimalPipe, NgClass, NgStyle } from '@angular/common';
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  imports: [NgStyle, NgClass, DecimalPipe],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss'
})
export class ProgressBarComponent {

  readonly progress = input.required<number>();
  readonly progressRounded = computed(() => Math.round(this.progress()));

}
