import {
  Component,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';
import { I18nService } from './i18n/i18n.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'definitive-tools';

  private readonly i18n = inject(I18nService);

  constructor() {
    // Lazily register the custom error map so Zod stays out of the initial bundle.
    // Messages resolve through the i18n service, so they follow the active language.
    void Promise.all([
      import('zod'),
      import('./utils/custom-zod-error-mapper'),
    ]).then(([{ config }, { createCustomErrorMap }]) => {
      config({
        customError: createCustomErrorMap((key, params) =>
          this.i18n.t(key, params),
        ),
      });
    });
  }
}
