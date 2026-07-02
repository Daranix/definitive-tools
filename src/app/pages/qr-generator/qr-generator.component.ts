import { NgClass, UpperCasePipe } from '@angular/common';
import {
  Component,
  inject,
  model,
  signal,
  WritableSignal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import {
  QrContentType,
  QrFormData,
  QrFormModel,
  QrUnionSchema,
} from './qr-generator.schemas';
import { qrContentProcessors } from './qr-generator-content-processor';
import QRCodeStyling, {
  CornerSquareType,
  DotType,
  FileExtension,
} from 'qr-code-styling';
import { MetadataService } from '@app/services/metadata.service';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';
import {
  form,
  validateStandardSchema,
  FormField,
  FieldTree,
} from '@angular/forms/signals';
import { ToastService } from '@app/services/toast.service';

const EXTENSIONS = [
  'svg',
  'png',
  'jpeg',
  'webp',
] as const satisfies Array<FileExtension>;

const ERROR_CORRECTION_LEVELS = [
  { id: 'low', name: 'Low (L)' },
  { id: 'medium', name: 'Medium (M)' },
  { id: 'quartile', name: 'Quartile (Q)' },
  { id: 'high', name: 'High (H)' },
] as const;

const CONTENT_TYPES = [
  { id: 'url', name: 'URL', icon: 'link' },
  { id: 'text', name: 'Text', icon: 'case-upper' },
  { id: 'email', name: 'Email', icon: 'at-sign' },
  { id: 'phone', name: 'Phone', icon: 'phone' },
  { id: 'sms', name: 'SMS', icon: 'tablet-smartphone' },
  { id: 'vcard', name: 'vCard', icon: 'id-card' },
  { id: 'wifi', name: 'WiFi', icon: 'wifi' },
  { id: 'geo', name: 'Location', icon: 'map-pin' },
] as const;

export const ENCRYPTION_TYPES = [
  { id: 'wpa', name: 'WPA/WPA2' },
  { id: 'wep', name: 'WEP' },
  { id: 'none', name: 'None' },
];

export const DOT_TYPES: ReadonlyArray<{ id: DotType; name: string }> = [
  { id: 'dots', name: 'Dots' },
  { id: 'rounded', name: 'Rounded' },
  { id: 'classy', name: 'Classy' },
  { id: 'classy-rounded', name: 'Classy Rounded' },
  { id: 'square', name: 'Square' },
  { id: 'extra-rounded', name: 'Extra Rounded' },
];

export const CORNERS_SQUARE_STYLES: ReadonlyArray<{
  id: CornerSquareType;
  name: string;
}> = [...DOT_TYPES, { id: 'dot', name: 'Dot' }];

export const CORNERS_INNER_DOT_STYLES: ReadonlyArray<{
  id: CornerSquareType;
  name: string;
}> = [...DOT_TYPES, { id: 'dot', name: 'Dot' }];

@Component({
  selector: 'app-qr-generator',
  imports: [
    LucideAngularModule,
    NgClass,
    FormField,
    UpperCasePipe,
    TopNavbarComponent,
    FooterComponent,
  ],
  templateUrl: './qr-generator.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './qr-generator.component.scss',
})
export class QrGeneratorComponent {
  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);

  readonly contentTypes = CONTENT_TYPES;
  readonly errorCorrectionLevels = ERROR_CORRECTION_LEVELS;
  readonly encryptionTypes = ENCRYPTION_TYPES;
  readonly extensions = EXTENSIONS;
  readonly dotsTypes = DOT_TYPES;
  readonly cornersSquareStyles = CORNERS_SQUARE_STYLES;
  readonly cornersInnerDotStyles = CORNERS_INNER_DOT_STYLES;

  readonly qrFormModel = model<QrFormModel>({
    contentType: 'text',
    backgroundColor: '#FFFFFF',
    dotsType: 'square',
    foregroundColor: '#000000',
    size: 200,
    errorCorrectionLevel: 'quartile',
    cornersStyle: 'square',
    cornersInnerDotStyle: 'square',
    textInput: 'Hello World',
  });

  // Signal Form Setup
  readonly qrForm = form(this.qrFormModel, (schemaPath) => {
    validateStandardSchema(schemaPath, QrUnionSchema);
  });

  readonly lastQrGenerated = signal<
    { url: string; qr: QRCodeStyling; data: QrFormData } | undefined
  >(undefined);

  constructor() {
    this.metadataService.updateMetadata({
      title: 'QR Code Generator - Definitive Tools',
      description:
        'Generate customized QR codes for URLs, text, contact information, and more. high-quality QR codes that work anywhere.',
      keywords:
        'qr code generator, qr code, qr codes, qr, qrcode, qrcodes, free qr code generator, free qrcode generator, free qr code, free qrcodes, online qr code generator, online qrcode generator, online qr code, online qrcodes, qr code generator online, qr code online, qr codes online, qr online, qrcode online, qrcodes online, free qr code online, free qrcode online, free qr codes online, free qrcodes online',
    });
  }

  changeContentType(contentType: QrContentType) {
    const current = this.qrFormModel();
    const defaults: Record<QrContentType, Partial<QrFormModel>> = {
      url: { url: '' },
      text: { textInput: '' },
      email: { emailAddress: '', emailSubject: '', emailBody: '' },
      phone: { phoneNumber: '' },
      sms: { smsPhoneNumber: '', smsMessage: '' },
      vcard: {
        vcardFirstName: '',
        vcardLastName: '',
        vcardCompany: '',
        vcardPhoneNumber: '',
        vcardEmail: '',
        vcardWebsite: '',
        vcardAddress: '',
      },
      wifi: { wifiSsid: '', wifiPassword: '', wifiEncryption: 'none' },
      geo: { geoLatitude: '', geoLongitude: '' },
    };

    const nextModel = {
      contentType,
      size: current.size,
      errorCorrectionLevel: current.errorCorrectionLevel,
      foregroundColor: current.foregroundColor,
      backgroundColor: current.backgroundColor,
      dotsType: current.dotsType,
      cornersInnerDotStyle: current.cornersInnerDotStyle,
      cornersStyle: current.cornersStyle,
      ...defaults[contentType],
    } as QrFormModel;

    this.qrFormModel.set(nextModel);
  }

  async generateQrCode() {
    const rawData = this.qrForm().value() as any as QrFormModel;
    const result = QrUnionSchema.safeParse(rawData);

    if (!result.success) {
      // Mark the root and all active nested child controls as touched to trigger validation messages in template
      this.qrForm().markAsTouched();
      Object.keys(this.qrForm).forEach((key) => {
        const control = (this.qrForm as any)[key];
        if (control && typeof control === 'function' && typeof control().markAsTouched === 'function') {
          control().markAsTouched();
        }
      });
      this.toastService.warning({
        message: 'Please correct all validation errors first.',
      });
      return;
    }

    const data = result.data;
    const processor = qrContentProcessors[data.contentType];
    const content = (processor as any)(data);

    const qr = new QRCodeStyling({
      width: data.size,
      height: data.size,
      type: 'svg',
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
      },
      qrOptions: {
        mode: 'Byte',
        typeNumber: 0,
      },
    });

    const blob = await qr.getRawData('webp');
    const url = URL.createObjectURL(blob as Blob);

    // Revoke previous URL if any
    const prev = this.lastQrGenerated();
    if (prev) {
      URL.revokeObjectURL(prev.url);
    }

    this.lastQrGenerated.set({ url, qr, data });
  }

  async download(fileExtension: FileExtension) {
    const qr = this.lastQrGenerated()!.qr;
    await qr.download({ name: 'qr-code', extension: fileExtension });
  }

  // Type guards for discriminated union form elements
  isUrlForm(f: any): f is FieldTree<Extract<QrFormModel, { contentType: 'url' }>> {
    return f?.contentType()?.value() === 'url';
  }

  isTextForm(f: any): f is FieldTree<Extract<QrFormModel, { contentType: 'text' }>> {
    return f?.contentType()?.value() === 'text';
  }

  isEmailForm(f: any): f is FieldTree<Extract<QrFormModel, { contentType: 'email' }>> {
    return f?.contentType()?.value() === 'email';
  }

  isPhoneForm(f: any): f is FieldTree<Extract<QrFormModel, { contentType: 'phone' }>> {
    return f?.contentType()?.value() === 'phone';
  }

  isSmsForm(f: any): f is FieldTree<Extract<QrFormModel, { contentType: 'sms' }>> {
    return f?.contentType()?.value() === 'sms';
  }

  isVcardForm(f: any): f is FieldTree<Extract<QrFormModel, { contentType: 'vcard' }>> {
    return f?.contentType()?.value() === 'vcard';
  }

  isWifiForm(f: any): f is FieldTree<Extract<QrFormModel, { contentType: 'wifi' }>> {
    return f?.contentType()?.value() === 'wifi';
  }

  isGeoForm(f: any): f is FieldTree<Extract<QrFormModel, { contentType: 'geo' }>> {
    return f?.contentType()?.value() === 'geo';
  }

  async getCurrentLocation() {
    try {
      const position = await this.getCurrentLocationPromise();
      const formRef = this.qrForm;
      if (this.isGeoForm(formRef)) {
        formRef.geoLatitude().value.set(position.coords.latitude.toString());
        formRef.geoLongitude().value.set(position.coords.longitude.toString());
      }
    } catch (error) {
      console.error(error);
      this.toastService.error({ message: 'Failed to access geolocation.' });
    }
  }

  private async getCurrentLocationPromise() {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }
}
