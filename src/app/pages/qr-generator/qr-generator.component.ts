import { NgClass } from '@angular/common';
import { Component, computed, model, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ZodFormComponent } from "@app/components/zod-form/zod-form.component";
import QRCode from 'qrcode';
import { QrContentType, QrFormData, QrSchemas, QrZodSchema } from './qr-generator.schemas';
import { RouterLink } from '@angular/router';
import { asZodFormControls, svgToDataURL } from '@app/utils/functions';
import { ZodFormControls } from '@app/utils/types';
import { InputErrorsComponent } from '@app/components/input-errors/input-errors.component';
import { qrContentProcessors } from './qr-generator-content-processor';
import { generateSVG } from './qr-generator-custom-shape';


const ERROR_CORRECTION_LEVELS = [
  { id: 'low', name: 'Low (L)' },
  { id: 'medium', name: 'Medium (M)' },
  { id: 'quartile', name: 'Quartile (Q)' },
  { id: 'high', name: 'High (H)' }
] as const;

const CONTENT_TYPES = [
  { id: 'url', name: 'URL', icon: 'link' },
  { id: 'text', name: 'Text', icon: 'case-upper' },
  { id: 'email', name: 'Email', icon: 'at-sign' },
  { id: 'phone', name: 'Phone', icon: 'phone' },
  { id: 'sms', name: 'SMS', icon: 'tablet-smartphone' },
  { id: 'vcard', name: 'vCard', icon: 'id-card' },
  { id: 'wifi', name: 'WiFi', icon: 'wifi' },
  { id: 'geo', name: 'Location', icon: 'map-pin' }
] as const;

export const ENCRYPTION_TYPES = [
  { id: 'wpa', name: 'WPA/WPA2' },
  { id: 'wep', name: 'WEP' },
  { id: 'none', name: 'None' }
];

@Component({
  selector: 'app-qr-generator',
  imports: [LucideAngularModule, NgClass, ReactiveFormsModule, ZodFormComponent, RouterLink, InputErrorsComponent],
  templateUrl: './qr-generator.component.html',
  styleUrl: './qr-generator.component.scss'
})
export class QrGeneratorComponent {

  readonly contentTypes = CONTENT_TYPES;
  readonly errorCorrectionLevels = ERROR_CORRECTION_LEVELS;
  readonly encryptionTypes = ENCRYPTION_TYPES;

  readonly selectedContentType = signal<QrContentType>('url');
  readonly formSchema = computed(() => QrSchemas[this.selectedContentType()]);
  readonly generatorForm = viewChild.required<ZodFormComponent<QrZodSchema>>('generatorForm');
  readonly formGroup = computed(() => this.generatorForm().formGroup());
  readonly lastQrGenerated = signal<{ url: string, svg: SVGElement, qr: QRCode.QRCode, data: QrFormData } | undefined>(undefined);

  changeContentType(contentType: QrContentType) {
    this.selectedContentType.set(contentType);
  }

  generateQrCode<T extends QrContentType>(
    data: Extract<QrFormData, { contentType: T }>
  ) {
    const processor = qrContentProcessors[data.contentType];
    const content = processor(data);
    const qr = QRCode.create(content);
    const svg = generateSVG(qr, data.foregroundColor, data.backgroundColor);
    const url = svgToDataURL(svg);
    this.lastQrGenerated.set({ url, svg, qr, data });
  }



  downloadAsPng() {

  }

  async getCurrentLocation() {
    try {
      const position = await this.getCurrentLocationPromise();
      console.log(position);
    } catch (error) {
      console.error(error);
    }
  }

  private async getCurrentLocationPromise() {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

  asZodFormControls(formGroup: any): ZodFormControls<QrFormData> {
    return asZodFormControls(formGroup);
  }

}
