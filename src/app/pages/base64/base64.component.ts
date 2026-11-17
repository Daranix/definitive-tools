import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { MetadataService } from '@/app/services/metadata.service';
import { ToastService } from '@/app/services/toast.service';
import { NgClass } from '@angular/common';
import {
  Component,
  effect,
  inject,
  model,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { I18nService } from '@/app/i18n/i18n.service';

export type Mode = 'encode' | 'decode';

import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-base64',
  imports: [
    LucideIconComponent,
    NgClass,
    FormsModule,
    TopNavbarComponent,
    FooterComponent,
    TranslatePipe,
  ],
  templateUrl: './base64.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './base64.component.scss',
})
export class Base64Component {
  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);
  private readonly i18n = inject(I18nService);

  readonly mode = signal<Mode>('encode');
  readonly inputText = model<string>('');
  readonly outputText = model<string>('');

  constructor() {
    this.updateMetadata();
    effect(() => {
      this.i18n.language();
      this.updateMetadata();
    });
  }

  handleProcess() {
    if (this.mode() === 'encode') {
      this.outputText.set(btoa(this.inputText()));
    } else {
      try {
        this.outputText.set(atob(this.inputText()));
      } catch (e) {
        this.outputText.set(this.i18n.t('base64.messages.invalidInput'));
      }
    }
  }

  handleSwap() {
    const temp = this.inputText();
    this.inputText.set(this.outputText());
    this.outputText.set(temp);
  }

  async handleCopy() {
    const text = this.outputText();
    if (!text) {
      this.toastService.warning({
        message: this.i18n.t('base64.messages.nothingToCopy'),
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.toastService.success({
        message: this.i18n.t('base64.messages.copied'),
      });
    } catch (error) {
      this.toastService.error({
        message: this.i18n.t('base64.messages.copyFailed'),
      });
    }
  }

  private updateMetadata(): void {
    this.metadataService.updateMetadata({
      title: this.i18n.t('base64.seo.title'),
      description: this.i18n.t('base64.seo.description'),
      keywords: this.i18n.t('base64.seo.keywords'),
    });
  }
}
