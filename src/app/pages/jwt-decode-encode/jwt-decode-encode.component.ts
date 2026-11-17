import {
  Component,
  computed,
  effect,
  inject,
  model,
  ChangeDetectionStrategy,
} from '@angular/core';
import { JwtDecoderComponent } from './components/jwt-decoder/jwt-decoder.component';
import { SelectButtonComponent } from '@/app/components/select-button/select-button.component';
import { FormsModule } from '@angular/forms';
import { JwtEncoderComponent } from './components/jwt-encoder/jwt-encoder.component';
import { MetadataService } from '@/app/services/metadata.service';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { TranslatePipe } from '@ngx-translate/core';
import { I18nService } from '@/app/i18n/i18n.service';

type Mode = 'decode' | 'encode';

import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-jwt-decode-encode',
  imports: [
    JwtDecoderComponent,
    JwtEncoderComponent,
    SelectButtonComponent,
    FormsModule,
    TopNavbarComponent,
    FooterComponent,
    TranslatePipe,
  ],
  templateUrl: './jwt-decode-encode.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './jwt-decode-encode.component.scss',
})
export class JwtDecodeEncodeComponent {
  private readonly metadataService = inject(MetadataService);
  private readonly i18n = inject(I18nService);

  readonly modes = computed<Array<{ label: string; value: Mode }>>(() => [
    {
      label: this.i18n.t('jwt-decode-encode.page.modes.decode'),
      value: 'decode',
    },
    {
      label: this.i18n.t('jwt-decode-encode.page.modes.encode'),
      value: 'encode',
    },
  ]);

  readonly selectedMode = model<Mode>('decode');

  constructor() {
    this.updateMetadata();
    effect(() => {
      this.i18n.language();
      this.updateMetadata();
    });
  }

  private updateMetadata(): void {
    this.metadataService.updateMetadata({
      title: this.i18n.t('jwt-decode-encode.seo.title'),
      description: this.i18n.t('jwt-decode-encode.seo.description'),
      updateCanonical: true,
    });
  }
}
