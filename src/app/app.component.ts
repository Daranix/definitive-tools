import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { z } from 'zod';
import { customErrorMap } from './utils/custom-zod-error-mapper';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'definitive-tools';

  constructor() {
    // Set the custom error map as the default
    z.setErrorMap(customErrorMap);
  }

}
