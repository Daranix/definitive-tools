import { NgClass } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  model,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { I18nService } from '@/app/i18n/i18n.service';
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

type QrForm = FieldTree<QrFormModel>;
type QrField<T extends QrContentType> = FieldTree<
  Extract<QrFormModel, { contentType: T }>
>;

type QrErrorCorrectionLevel = 'low' | 'medium' | 'quartile' | 'high';
type QrWifiEncryption = 'wpa' | 'wep' | 'none';

const EXTENSIONS = [
  'svg',
  'png',
  'jpeg',
  'webp',
] as const satisfies Array<FileExtension>;

const DOT_STYLE_KEYS = [
  { id: 'dots', key: 'dots' },
  { id: 'rounded', key: 'rounded' },
  { id: 'classy', key: 'classy' },
  { id: 'classy-rounded', key: 'classyRounded' },
  { id: 'square', key: 'square' },
  { id: 'extra-rounded', key: 'extraRounded' },
] as const satisfies ReadonlyArray<{ id: DotType; key: string }>;

@Component({
  selector: 'app-qr-generator',
  imports: [
    LucideIconComponent,
    NgClass,
    FormField,
    TopNavbarComponent,
    FooterComponent,
    TranslatePipe,
  ],
  templateUrl: './qr-generator.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './qr-generator.component.scss',
})
export class QrGeneratorComponent {
  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);
  private readonly i18n = inject(I18nService);

  readonly i18nService = this.i18n;

  readonly contentTypes = computed<
    ReadonlyArray<{ id: QrContentType; name: string; icon: string }>
  >(() => [
    { id: 'url', name: this.i18n.t('qr-generator.contentType.url'), icon: 'link' },
    { id: 'text', name: this.i18n.t('qr-generator.contentType.text'), icon: 'case-upper' },
    { id: 'email', name: this.i18n.t('qr-generator.contentType.email'), icon: 'at-sign' },
    { id: 'phone', name: this.i18n.t('qr-generator.contentType.phone'), icon: 'phone' },
    { id: 'sms', name: this.i18n.t('qr-generator.contentType.sms'), icon: 'tablet-smartphone' },
    { id: 'vcard', name: this.i18n.t('qr-generator.contentType.vcard'), icon: 'id-card' },
    { id: 'wifi', name: this.i18n.t('qr-generator.contentType.wifi'), icon: 'wifi' },
    { id: 'geo', name: this.i18n.t('qr-generator.contentType.geo'), icon: 'map-pin' },
  ]);

  readonly errorCorrectionLevels = computed<
    ReadonlyArray<{ id: QrErrorCorrectionLevel; name: string }>
  >(() => [
    {
      id: 'low',
      name: this.i18n.t('qr-generator.customization.errorCorrectionLevels.low'),
    },
    {
      id: 'medium',
      name: this.i18n.t('qr-generator.customization.errorCorrectionLevels.medium'),
    },
    {
      id: 'quartile',
      name: this.i18n.t('qr-generator.customization.errorCorrectionLevels.quartile'),
    },
    {
      id: 'high',
      name: this.i18n.t('qr-generator.customization.errorCorrectionLevels.high'),
    },
  ]);

  readonly encryptionTypes = computed<
    ReadonlyArray<{ id: QrWifiEncryption; name: string }>
  >(() => [
    {
      id: 'wpa',
      name: this.i18n.t('qr-generator.wifi.encryptionTypes.wpa'),
    },
    {
      id: 'wep',
      name: this.i18n.t('qr-generator.wifi.encryptionTypes.wep'),
    },
    {
      id: 'none',
      name: this.i18n.t('qr-generator.wifi.encryptionTypes.none'),
    },
  ]);

  readonly dotsTypes = computed<ReadonlyArray<{ id: DotType; name: string }>>(
    () =>
      DOT_STYLE_KEYS.map(({ id, key }) => ({
        id,
        name: this.i18n.t(`qr-generator.customization.dotStyles.${key}`),
      })),
  );

  readonly cornersSquareStyles = computed<
    ReadonlyArray<{ id: CornerSquareType; name: string }>
  >(() => [
    ...this.dotsTypes(),
    { id: 'dot', name: this.i18n.t('qr-generator.customization.dotStyles.dot') },
  ]);

  readonly cornersInnerDotStyles = computed<
    ReadonlyArray<{ id: CornerSquareType; name: string }>
  >(() => [
    ...this.dotsTypes(),
    { id: 'dot', name: this.i18n.t('qr-generator.customization.dotStyles.dot') },
  ]);

  readonly downloadFormats = computed<
    ReadonlyArray<{ extension: FileExtension; label: string }>
  >(() =>
    EXTENSIONS.map((extension) => ({
      extension,
      label: extension.toUpperCase(),
    })),
  );

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
    this.updateMetadata();
    effect(() => {
      this.i18n.language();
      this.updateMetadata();
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
        message: this.i18n.t('qr-generator.validation.fixErrors'),
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
    await qr.download({
      name: this.i18n.t('qr-generator.download.fileName'),
      extension: fileExtension,
    });
  }

  // Type guard for discriminated union form elements
  isFormType<T extends QrContentType>(f: QrForm, type: T): f is QrForm & QrField<T> {
    return f.contentType().value() === type;
  }

  async getCurrentLocation() {
    try {
      const position = await this.getCurrentLocationPromise();
      const formRef = this.qrForm;
      if (this.isFormType(formRef, 'geo')) {
        formRef.geoLatitude().value.set(position.coords.latitude.toString());
        formRef.geoLongitude().value.set(position.coords.longitude.toString());
      }
    } catch (error) {
      console.error(error);
      this.toastService.error({
        message: this.i18n.t('qr-generator.messages.geolocationFailed'),
      });
    }
  }

  private async getCurrentLocationPromise() {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

  private updateMetadata(): void {
    this.metadataService.updateMetadata({
      title: this.i18n.t('qr-generator.seo.title'),
      description: this.i18n.t('qr-generator.seo.description'),
      keywords: this.i18n.t('qr-generator.seo.keywords'),
    });
  }
}
