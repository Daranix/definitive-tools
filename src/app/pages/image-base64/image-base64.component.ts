import {
  Component,
  computed,
  inject,
  model,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '@/app/components/footer/footer.component';
import { DragAndDropFileComponent } from '@/app/components/drag-and-drop-file/drag-and-drop-file.component';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { MetadataService } from '@/app/services/metadata.service';
import { ToastService } from '@/app/services/toast.service';
import { FileSizePipe } from '@/app/pipes/file-size.pipe';

export type OutputFormat = 'dataUri' | 'raw' | 'html' | 'css';

@Component({
  selector: 'app-image-base64',
  imports: [
    NgClass,
    FormsModule,
    TopNavbarComponent,
    FooterComponent,
    DragAndDropFileComponent,
    LucideIconComponent,
    FileSizePipe,
  ],
  templateUrl: './image-base64.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './image-base64.component.scss',
})
export class ImageBase64Component {
  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);

  readonly mode = signal<'encode' | 'decode'>('encode');

  // Encoder State
  readonly imageFile = signal<File | undefined>(undefined);
  readonly imageName = signal<string>('');
  readonly imageType = signal<string>('');
  readonly imageSize = signal<number>(0);
  readonly imageDimensions = signal<{ width: number; height: number } | undefined>(undefined);
  readonly encodedBase64 = signal<string>('');
  readonly outputFormat = signal<OutputFormat>('dataUri');

  // Decoder State
  readonly base64Input = model<string>('');
  readonly decodedImageSrc = signal<string | undefined>(undefined);
  readonly decodedMetadata = signal<
    | { size: number; mimeType: string; width: number; height: number }
    | undefined
  >(undefined);
  readonly decodeError = signal<string | undefined>(undefined);

  readonly allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp'];

  // Formatted output computed signal based on outputFormat
  readonly formattedOutput = computed(() => {
    const rawDataUri = this.encodedBase64();
    if (!rawDataUri) return '';

    switch (this.outputFormat()) {
      case 'raw':
        // Extract only the base64 payload part
        const parts = rawDataUri.split(';base64,');
        return parts.length > 1 ? parts[1] : rawDataUri;
      case 'html':
        return `<img src="${rawDataUri}" alt="${this.imageName() || 'Base64 Image'}" />`;
      case 'css':
        return `background-image: url("${rawDataUri}");`;
      case 'dataUri':
      default:
        return rawDataUri;
    }
  });

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Image to Base64 & Base64 to Image Converter',
      description:
        'Convert any image file to a Base64 encoded string or decode Base64 data back to images. Fast, secure, client-side conversion with live previews.',
      keywords: 'base64, image to base64, base64 to image, base64 decoder, base64 encoder, data uri, webp, png, jpeg',
    });
  }

  // Encoder: Handle file upload / drag-and-drop
  onFileChange(file?: File) {
    if (!file) {
      this.clearEncoder();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target?.result as string;
      this.encodedBase64.set(dataUri);

      // Load image to get its width and height
      const img = new Image();
      img.onload = () => {
        this.imageDimensions.set({ width: img.width, height: img.height });
      };
      img.src = dataUri;
    };
    reader.readAsDataURL(file);

    this.imageFile.set(file);
    this.imageName.set(file.name);
    this.imageType.set(file.type);
    this.imageSize.set(file.size);
  }

  clearEncoder() {
    this.imageFile.set(undefined);
    this.imageName.set('');
    this.imageType.set('');
    this.imageSize.set(0);
    this.imageDimensions.set(undefined);
    this.encodedBase64.set('');
  }

  // Decoder: Trigger decoding manually
  handleDecode() {
    const rawInput = this.base64Input().trim();
    if (!rawInput) {
      this.decodeError.set('Please enter a Base64 string to decode.');
      this.decodedImageSrc.set(undefined);
      this.decodedMetadata.set(undefined);
      return;
    }

    let dataUri = '';
    let mimeType = 'image/png'; // Default fallback
    let base64Payload = '';

    // Check if input is already a complete Data URI
    const dataUriMatch = rawInput.match(/^data:(image\/[a-zA-Z+-]+);base64,(.*)$/s);
    if (dataUriMatch) {
      mimeType = dataUriMatch[1];
      base64Payload = dataUriMatch[2].replace(/\s/g, ''); // strip any formatting whitespace
      dataUri = `data:${mimeType};base64,${base64Payload}`;
    } else {
      // Clean input from any possible whitespace
      base64Payload = rawInput.replace(/\s/g, '');

      // Check signature prefixes to infer MIME Type
      if (base64Payload.startsWith('iVBORw')) {
        mimeType = 'image/png';
      } else if (base64Payload.startsWith('/9j/')) {
        mimeType = 'image/jpeg';
      } else if (base64Payload.startsWith('R0lGOD')) {
        mimeType = 'image/gif';
      } else if (base64Payload.startsWith('UklGR')) {
        mimeType = 'image/webp';
      } else if (base64Payload.startsWith('PHN2Zy')) {
        mimeType = 'image/svg+xml';
      }

      dataUri = `data:${mimeType};base64,${base64Payload}`;
    }

    // Validate the parsed Data URI by loading it in a virtual Image object
    const img = new Image();
    img.onload = () => {
      this.decodedImageSrc.set(dataUri);
      this.decodeError.set(undefined);

      // Estimate binary size (Base64 is ~33% larger than binary data)
      const estimatedSize = Math.round(base64Payload.length * 0.75);

      this.decodedMetadata.set({
        mimeType,
        size: estimatedSize,
        width: img.width,
        height: img.height,
      });
    };
    img.onerror = () => {
      this.decodeError.set(
        'Could not decode image. Please ensure the pasted text is a valid Base64 encoded image string.'
      );
      this.decodedImageSrc.set(undefined);
      this.decodedMetadata.set(undefined);
    };
    img.src = dataUri;
  }

  clearDecoder() {
    this.base64Input.set('');
    this.decodedImageSrc.set(undefined);
    this.decodedMetadata.set(undefined);
    this.decodeError.set(undefined);
  }

  // Copy helpers
  async copyText(text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.toastService.success({ message: 'Copied to clipboard!' });
    } catch {
      this.toastService.error({ message: 'Failed to copy to clipboard.' });
    }
  }

  // Download Decoded Image File
  downloadDecodedImage() {
    const src = this.decodedImageSrc();
    const meta = this.decodedMetadata();
    if (!src || !meta) return;

    try {
      const parts = src.split(';base64,');
      const base64Data = parts[1];
      const contentType = meta.mimeType;

      const sliceSize = 512;
      const byteCharacters = atob(base64Data);
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }

      const blob = new Blob(byteArrays, { type: contentType });
      const blobUrl = URL.createObjectURL(blob);

      let ext = 'png';
      if (contentType.includes('jpeg')) ext = 'jpg';
      else if (contentType.includes('gif')) ext = 'gif';
      else if (contentType.includes('webp')) ext = 'webp';
      else if (contentType.includes('svg')) ext = 'svg';

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `decoded-image.${ext}`;
      link.click();

      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      this.toastService.success({ message: 'Image downloaded successfully!' });
    } catch (e) {
      this.toastService.error({ message: 'Failed to download the decoded image.' });
    }
  }
}
