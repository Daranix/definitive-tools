import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'definitive-tools';

  constructor() {
    // Lazily register the custom error map so Zod stays out of the initial bundle
    void Promise.all([
      import('zod'),
      import('./utils/custom-zod-error-mapper'),
    ]).then(([{ config }, { customErrorMap }]) => {
      config({ customError: customErrorMap });
    });
  }
}
