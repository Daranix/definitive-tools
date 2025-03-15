import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DragAndDropFileComponent } from "@/app/components/drag-and-drop-file/drag-and-drop-file.component";
import { FormsModule } from '@angular/forms';
import { MetadataService } from '@/app/services/metadata.service';
import { BlobPipe } from '@/app/pipes/blob.pipe';
import { ImageSegmentationPipelineOutput, env, AutoModel, PreTrainedModel, AutoProcessor, Processor, RawImage } from "@huggingface/transformers";
import { webgl_detect } from '@/app/utils/functions';
import { ImageComparisonComponent } from '@/app/components/image-comparison/image-comparison.component';
import { LoadingSpinnerSmallComponent } from '@/app/components/loading-spinner-small/loading-spinner-small.component';
import { ToastService } from '@/app/services/toast.service';
import { ProgressBarComponent } from '@/app/components/progress-bar/progress-bar.component';
import { DecimalPipe } from '@angular/common';

type ProgressBaseInfo = {
  status: 'initiate' | 'download' | 'progress' | 'done';
  name: string;
  file: string;
}

type InitialProgressInfo =  ProgressBaseInfo & {
  status: 'initiate';
}

type DownloadProgressInfo = ProgressBaseInfo & {
  status: 'download';
}

type DownloadingProgressInfo = ProgressBaseInfo & {
  status: 'progress';
  progress: number;
  loaded: number;
  total: number;
}

type CompletedProgressInfo = ProgressBaseInfo & {
  status: 'done';
}

export type ProgressInfo = InitialProgressInfo | DownloadingProgressInfo | DownloadProgressInfo | CompletedProgressInfo;


@Component({
  selector: 'app-background-remover',
  imports: [
    RouterLink,
    LucideAngularModule,
    DragAndDropFileComponent,
    FormsModule,
    BlobPipe,
    ImageComparisonComponent,
    LoadingSpinnerSmallComponent,
    ProgressBarComponent
  ],
  templateUrl: './background-remover.component.html',
  styleUrl: './background-remover.component.scss'
})
export class BackgroundRemoverComponent {

  private readonly toastService = inject(ToastService);
  private readonly metadataService = inject(MetadataService);

  readonly allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];

  readonly file = signal<File | undefined>(undefined);
  readonly imageOutput = signal<Blob | undefined>(undefined);
  readonly loading = signal(false);
  readonly downloadProgress = signal<ProgressInfo | undefined>(undefined);

  readonly fileUrl = computed(() => this.file() ? URL.createObjectURL(this.file()!) : undefined);
  readonly imageOutputUrl = computed(() => this.imageOutput() ? URL.createObjectURL(this.imageOutput()!) : undefined);

  private model?: PreTrainedModel;
  private processor?: Processor;


  constructor() {
    this.metadataService.updateMetadata({
      title: 'Background Remover',
      description: 'Remove backgrounds from images instantly. Create professional-looking transparent images for your projects, products, and designs.',
      updateCanonical: true
    });
  }


  async removeBackground() {

    this.loading.set(true);
    const isWebGlAvailable = webgl_detect();
    if(!this.model || !this.processor) {
      env.backends.onnx.wasm!.proxy = true;

      this.model = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
        device: isWebGlAvailable ? 'webgpu' : 'cpu',
        progress_callback: (progress) => {
          this.downloadProgress.set(progress as unknown as ProgressInfo);
        },
        dtype: 'q8'
      });

      this.downloadProgress.set(undefined);
      this.processor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {});
    }

    try {

      // Load image
      const img = await RawImage.fromBlob(this.file()!);

      // Pre-process image
      const { pixel_values } = await this.processor(img);

      // Predict alpha matte
      const { output } = await this.model({ input: pixel_values });

      const maskData = (
        await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
          img.width,
          img.height,
        )
      ).data;

      // Create new canvas
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      // Draw original image output to canvas
      ctx.drawImage(img.toCanvas(), 0, 0);
      // Update alpha channel
      const pixelData = ctx.getImageData(0, 0, img.width, img.height);
      for (let i = 0; i < maskData.length; ++i) {
        pixelData.data[4 * i + 3] = maskData[i];
      }
      ctx.putImageData(pixelData, 0, 0);
      const imageDataBlob = await this.canvasToBlob(canvas);
      this.imageOutput.set(imageDataBlob);

    } catch (error) {
      this.toastService.error('An error ocurred when trying to remove the background. Please try again.');
      console.error('Error removing background:', error);
    }

    this.loading.set(false);
  }

  private canvasToBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!));
    });
  }


  cancel() {
    this.file.set(undefined);
    this.imageOutput.set(undefined);
  }

  downloadImage() {
    const link = document.createElement('a');
    link.href = this.imageOutputUrl()!
    link.download = 'output.png';
    link.click();
  }



}
