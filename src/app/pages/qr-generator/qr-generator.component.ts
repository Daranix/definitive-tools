import { NgClass, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, model, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ZodFormComponent } from "@app/components/zod-form/zod-form.component";
import { QrContentType, QrFormData, QrSchemas, QrZodSchema } from './qr-generator.schemas';
import { RouterLink } from '@angular/router';
import { asZodFormControls, svgToDataURL } from '@app/utils/functions';
import { ZodFormControls } from '@app/utils/types';
import { InputErrorsComponent } from '@app/components/input-errors/input-errors.component';
import { qrContentProcessors } from './qr-generator-content-processor';
import QRCodeStyling, { CornerDotType, CornerSquareType, DotType, FileExtension } from 'qr-code-styling';
import { MetadataService } from '@app/services/metadata.service';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';


const EXTENSIONS = ["svg", "png", "jpeg", "webp"] as const satisfies Array<FileExtension>;

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

export const DOT_TYPES: ReadonlyArray<{  id: DotType, name: string }> = [
  { id: 'dots', name: 'Dots' },
  { id: 'rounded', name: 'Rounded' },
  { id: 'classy', name: 'Classy' },
  { id: 'classy-rounded', name: 'Classy Rounded' },
  { id: 'square', name: 'Square' },
  { id: 'extra-rounded', name: 'Extra Rounded' }
];

export const CORNERS_SQUARE_STYLES: ReadonlyArray<{  id: CornerSquareType, name: string }> = [
  ...DOT_TYPES,
  { id: 'dot', name: 'Dot' },
];

export const CORNERS_INNER_DOT_STYLES:  ReadonlyArray<{  id: CornerSquareType, name: string }> = [
  ...DOT_TYPES,
  { id: 'dot', name: 'Dot' },
];

@Component({
  selector: 'app-qr-generator',
  imports: [LucideAngularModule, NgClass, ReactiveFormsModule, ZodFormComponent, RouterLink, InputErrorsComponent, UpperCasePipe, TopNavbarComponent],
  templateUrl: './qr-generator.component.html',
  styleUrl: './qr-generator.component.scss'
})
export class QrGeneratorComponent {

  private readonly metadataService = inject(MetadataService);

  readonly contentTypes = CONTENT_TYPES;
  readonly errorCorrectionLevels = ERROR_CORRECTION_LEVELS;
  readonly encryptionTypes = ENCRYPTION_TYPES;
  readonly extensions = EXTENSIONS;
  readonly dotsTypes = DOT_TYPES;
  readonly cornersSquareStyles = CORNERS_SQUARE_STYLES;
  readonly cornersInnerDotStyles = CORNERS_INNER_DOT_STYLES;

  readonly selectedContentType = signal<QrContentType>('url');
  readonly formSchema = computed(() => QrSchemas[this.selectedContentType()]);
  readonly generatorForm = viewChild.required<ZodFormComponent<QrZodSchema>>('generatorForm');
  readonly formGroup = computed(() => this.generatorForm().formGroup());
  readonly lastQrGenerated = signal<{ url: string, qr: QRCodeStyling, data: QrFormData } | undefined>(undefined);

  constructor() {
    this.metadataService.updateMetadata({
      title: 'QR Code Generator - Definitive Tools',
      description: 'Generate customized QR codes for URLs, text, contact information, and more. high-quality QR codes that work anywhere.',
      keywords: 'qr code generator, qr code, qr codes, qr, qrcode, qrcodes, free qr code generator, free qrcode generator, free qr code, free qrcodes, online qr code generator, online qrcode generator, online qr code, online qrcodes, qr code generator online, qr code online, qr codes online, qr online, qrcode online, qrcodes online, free qr code online, free qrcode online, free qr codes online, free qrcodes online'
    });
  }

  changeContentType(contentType: QrContentType) {
    this.selectedContentType.set(contentType);
  }

  async generateQrCode<T extends QrContentType>(
    data: Extract<QrFormData, { contentType: T }>
  ) {
    const processor = qrContentProcessors[data.contentType];
    const content = processor(data);

    const qr = new QRCodeStyling({
      width: data.size,
      height: data.size,
      type: "svg",
      data: content,
      image: undefined,
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.4,
        margin: 0,
      },
      dotsOptions: {
        color: data.foregroundColor,
        type: data.dotsType,
      },
      cornersSquareOptions: {
        type: data.cornersStyle,
      },
      cornersDotOptions: {
        type: data.cornersInnerDotStyle,
      },
      backgroundOptions: {
        color: data.backgroundColor,
      }
    });

    const blob = await qr.getRawData("webp");
    const url = URL.createObjectURL(blob as Blob);
    this.lastQrGenerated.set({ url, qr, data });
  }

  async download(fileExtension: FileExtension) {
    const qr = this.lastQrGenerated()!.qr;
    await qr.download({ name: "qr-code", extension: fileExtension });
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
