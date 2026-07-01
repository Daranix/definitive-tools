import {
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser, NgClass, DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '@/app/components/footer/footer.component';
import { DragAndDropFileComponent } from '@/app/components/drag-and-drop-file/drag-and-drop-file.component';
import { MetadataService } from '@/app/services/metadata.service';
import { ToastService } from '@/app/services/toast.service';
import {
  form,
  validateStandardSchema,
  FormField,
} from '@angular/forms/signals';
import { z } from 'zod';

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'bmp';

export interface ConversionOptions {
  targetFormat: ImageFormat;
  quality: number;
  resizeWidth: number | null;
  resizeHeight: number | null;
}

@Component({
  selector: 'app-image-converter',
  imports: [
    LucideAngularModule,
    NgClass,
    DecimalPipe,
    TopNavbarComponent,
    FooterComponent,
    DragAndDropFileComponent,
    FormField,
  ],
  templateUrl: './image-converter.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './image-converter.component.scss',
})
export class ImageConverterComponent {
  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly allowedExtensions = [
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.gif',
    '.bmp',
  ];
  readonly formats: ImageFormat[] = ['webp', 'png', 'jpeg', 'gif', 'bmp'];

  // State Signals
  readonly file = signal<File | undefined>(undefined);
  readonly fileUrl = signal<string | undefined>(undefined);

  readonly outputBlob = signal<Blob | undefined>(undefined);
  readonly outputUrl = signal<string | undefined>(undefined);
  readonly outputFileName = signal<string>('');

  // Form State Models
  readonly optionsModel = signal<ConversionOptions>({
    targetFormat: 'webp',
    quality: 85,
    resizeWidth: null,
    resizeHeight: null,
  });

  readonly optionsSchema = z.object({
    targetFormat: z.enum(['webp', 'png', 'jpeg', 'gif', 'bmp']),
    quality: z.number().min(1).max(100),
    resizeWidth: z
      .number()
      .nullable()
      .refine((val) => val === null || val > 0, {
        message: 'Width must be a positive number',
      }),
    resizeHeight: z
      .number()
      .nullable()
      .refine((val) => val === null || val > 0, {
        message: 'Height must be a positive number',
      }),
  });

  readonly optionsForm = form(this.optionsModel, (schemaPath) => {
    validateStandardSchema(schemaPath, this.optionsSchema);
  });

  readonly converting = signal<boolean>(false);
  readonly loaded = signal<boolean>(false);
  readonly progress = signal<number>(0);
  readonly logs = signal<string[]>([]);
  readonly showLogs = signal<boolean>(false);

  readonly viewMode = signal<'side-by-side' | 'slider'>('side-by-side');
  readonly sliderPercent = signal<number>(50);

  // Computed properties for file size calculations
  readonly originalSize = computed(() => this.file()?.size || 0);
  readonly convertedSize = computed(() => this.outputBlob()?.size || 0);
  readonly sizeChangePercent = computed(() => {
    const orig = this.originalSize();
    const conv = this.convertedSize();
    if (!orig || !conv) return 0;
    const diff = orig - conv;
    return Math.round((diff / orig) * 100);
  });

  private ffmpeg: any;
  private pendingConvert = false;

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Image Converter',
      description:
        'Convert images client-side between different formats like PNG, JPEG, WEBP, GIF, BMP, and TIFF using FFmpeg.wasm. Resize and compress with privacy.',
      updateCanonical: true,
    });

    // Cleanup input URL on destroy/change
    effect((onCleanup) => {
      const inputUrl = this.fileUrl();
      onCleanup(() => {
        if (inputUrl) URL.revokeObjectURL(inputUrl);
      });
    });

    // Cleanup output URL on destroy/change
    effect((onCleanup) => {
      const outUrl = this.outputUrl();
      onCleanup(() => {
        if (outUrl) URL.revokeObjectURL(outUrl);
      });
    });

    // Auto-convert on form or file change (debounced)
    effect((onCleanup) => {
      const currentFile = this.file();
      const model = this.optionsModel();
      const formInvalid = this.optionsForm().invalid();

      if (currentFile && !formInvalid) {
        const timer = setTimeout(() => {
          this.handleConvert(true);
        }, 300);

        onCleanup(() => {
          clearTimeout(timer);
        });
      }
    });
  }

  onFileSelected(selectedFile: File | undefined) {
    // Revoke previous URL
    const prevUrl = this.fileUrl();
    if (prevUrl) URL.revokeObjectURL(prevUrl);

    // Clear output state
    const prevOutUrl = this.outputUrl();
    if (prevOutUrl) URL.revokeObjectURL(prevOutUrl);
    this.outputBlob.set(undefined);
    this.outputUrl.set(undefined);
    this.outputFileName.set('');
    this.progress.set(0);
    this.logs.set([]);
    this.viewMode.set('side-by-side');
    this.sliderPercent.set(50);

    if (selectedFile) {
      this.file.set(selectedFile);
      this.fileUrl.set(URL.createObjectURL(selectedFile));
    } else {
      this.file.set(undefined);
      this.fileUrl.set(undefined);
    }
  }

  onSliderChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.sliderPercent.set(Number(target.value));
  }

  async initFFmpeg() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.loaded()) return;

    this.logs.set([...this.logs(), 'Loading FFmpeg Core locally...']);
    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');

      this.ffmpeg = new FFmpeg();

      // Listen to progress
      this.ffmpeg.on('progress', ({ progress }: { progress: number }) => {
        // progress goes from 0 to 1
        this.progress.set(Math.round(progress * 100));
      });

      // Listen to log output
      this.ffmpeg.on('log', ({ message }: { message: string }) => {
        this.logs.update((currentLogs) => [...currentLogs, message]);
      });

      const baseURL = `${window.location.origin}/assets/ffmpeg`;
      await this.ffmpeg.load({
        classWorkerURL: `${baseURL}/worker.js`,
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          'text/javascript',
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          'application/wasm',
        ),
      });

      this.loaded.set(true);
      this.logs.update((currentLogs) => [
        ...currentLogs,
        'FFmpeg core loaded successfully.',
      ]);
    } catch (error: any) {
      console.error(error);
      this.toastService.error({
        message: 'Failed to load FFmpeg core resources.',
      });
      this.logs.update((currentLogs) => [
        ...currentLogs,
        `Error: ${error?.message || error}`,
      ]);
    }
  }

  async handleConvert(isAuto = false) {
    if (this.converting()) {
      this.pendingConvert = true;
      return;
    }

    const currentFile = this.file();
    if (!currentFile) {
      if (!isAuto)
        this.toastService.warning({
          message: 'Please select an image file first.',
        });
      return;
    }

    if (this.optionsForm().invalid()) {
      if (!isAuto)
        this.toastService.warning({
          message: 'Please fix validation errors first.',
        });
      return;
    }

    this.converting.set(true);
    this.progress.set(0);
    this.logs.set([]);
    this.outputBlob.set(undefined);
    const prevOutUrl = this.outputUrl();
    if (prevOutUrl) URL.revokeObjectURL(prevOutUrl);
    this.outputUrl.set(undefined);

    try {
      // Lazy load/init FFmpeg
      await this.initFFmpeg();

      if (!this.loaded()) {
        throw new Error('FFmpeg failed to load properly.');
      }

      const fmt = this.optionsForm.targetFormat().value();
      const q = this.optionsForm.quality().value();
      const widthVal = this.optionsForm.resizeWidth().value();
      const heightVal = this.optionsForm.resizeHeight().value();

      const inputName = `input_${Date.now()}_${currentFile.name}`;
      const targetExt = `.${fmt}`;
      const outputName = `output_${Date.now()}${targetExt}`;

      this.logs.update((currentLogs) => [
        ...currentLogs,
        `Loading "${currentFile.name}" into virtual file system...`,
      ]);

      const { fetchFile } = await import('@ffmpeg/util');
      const fileData = await fetchFile(currentFile);
      await this.ffmpeg.writeFile(inputName, fileData);

      // Build FFmpeg CLI arguments
      const args: string[] = ['-i', inputName];

      // Add scale video filter if dimensions are specified
      if (widthVal || heightVal) {
        const wStr = widthVal ? widthVal.toString() : '-1';
        const hStr = heightVal ? heightVal.toString() : '-1';
        args.push('-vf', `scale=${wStr}:${hStr}`);
      }

      // Add format quality
      if (fmt === 'webp') {
        args.push('-q:v', q.toString());
      } else if (fmt === 'jpeg') {
        // Map quality (1-100) to qscale (1-31, where 1 is best)
        const qScale = Math.max(
          1,
          Math.min(31, Math.round(((100 - q) / 100) * 30 + 1)),
        );
        args.push('-q:v', qScale.toString());
      }

      args.push(outputName);

      this.logs.update((currentLogs) => [
        ...currentLogs,
        `Executing: ffmpeg ${args.join(' ')}`,
      ]);

      // Run FFmpeg
      await this.ffmpeg.exec(args);

      // Read output file
      const data = await this.ffmpeg.readFile(outputName);

      let mimeType = `image/${fmt}`;
      if (fmt === 'jpeg') mimeType = 'image/jpeg';
      else if (fmt === 'bmp') mimeType = 'image/bmp';

      const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeType });
      this.outputBlob.set(blob);
      this.outputUrl.set(URL.createObjectURL(blob));

      // Build download file name
      const baseName = currentFile.name.substring(
        0,
        currentFile.name.lastIndexOf('.'),
      );
      this.outputFileName.set(`${baseName}_converted${targetExt}`);

      // Cleanup virtual files to free memory
      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      this.toastService.success({ message: 'Image converted successfully!' });
    } catch (error: any) {
      console.error(error);
      this.toastService.error({
        message: `Conversion failed: ${error?.message || error}`,
      });
      this.logs.update((currentLogs) => [
        ...currentLogs,
        `Execution failed: ${error?.message || error}`,
      ]);
    } finally {
      this.converting.set(false);
      if (this.pendingConvert) {
        this.pendingConvert = false;
        setTimeout(() => this.handleConvert(true), 0);
      }
    }
  }

  handleDownload() {
    const url = this.outputUrl();
    const name = this.outputFileName();
    if (!url || !name) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  }

  clear() {
    this.onFileSelected(undefined);
  }
}
