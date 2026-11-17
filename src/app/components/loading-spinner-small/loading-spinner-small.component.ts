import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-loading-spinner-small',
  imports: [TranslatePipe],
  templateUrl: './loading-spinner-small.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './loading-spinner-small.component.scss',
})
export class LoadingSpinnerSmallComponent {}
