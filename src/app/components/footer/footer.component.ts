import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LocalizeUrlPipe } from '../../pipes/localize-url.pipe';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, TranslatePipe, LocalizeUrlPipe],
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './footer.component.scss',
})
export class FooterComponent {}
