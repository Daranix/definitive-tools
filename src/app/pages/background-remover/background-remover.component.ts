import { Component, inject, model, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DragAndDropFileComponent } from "@/app/components/drag-and-drop-file/drag-and-drop-file.component";
import { FormsModule } from '@angular/forms';
import { MetadataService } from '@/app/services/metadata.service';
import { BlobPipe } from '@/app/pipes/blob.pipe';
import { pipeline, ImagePipelineInputs, ImageSegmentationPipelineOutput, env, AutoModel, PreTrainedModel, AutoProcessor, Processor, RawImage } from "@huggingface/transformers";
import { webgl_detect } from '@/app/utils/functions';

@Component({
  selector: 'app-background-remover',
  imports: [RouterLink, LucideAngularModule, DragAndDropFileComponent, FormsModule, BlobPipe],
  templateUrl: './background-remover.component.html',
  styleUrl: './background-remover.component.scss'
})
export class BackgroundRemoverComponent {

  private readonly metadataService = inject(MetadataService);

  private model?: PreTrainedModel;
  private processor?: Processor;

  readonly file = signal<File | undefined>(undefined);
  readonly imageOutput = signal<Blob | undefined>(undefined);
  readonly loading = signal(false);


  constructor() {
    this.metadataService.updateMetadata({
      title: 'Background Remover',
      description: 'Remove backgrounds from images instantly. Create professional-looking transparent images for your projects, products, and designs.',
      updateCanonical: true
    })
  }

  async removeBackground() {

    this.loading.set(true);
    const isWebGlAvailable = webgl_detect();

    if(!this.model || !this.processor) {
      env.backends.onnx.wasm!.proxy = false;

      this.model = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
        device: isWebGlAvailable ? 'webgpu' : 'cpu'
      });

      this.processor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {});
    }

    try {


      const imageElement = URL.createObjectURL(this.file()!)

      const image = new Image();
      image.src = imageElement;

      /*
      // Get the segmentation pipeline
      const segmenter = await pipeline("background-removal", "briaai/RMBG-2.0", {
        device: isWebGlAvailable ? 'webgpu' : 'cpu'
      });



      // Process the image
      const mask = await segmenter(imageElement);

      // The result contains a segmentation mask
      // You can use this mask to remove the background
      const result = await this.applyMaskToImage(image, mask);*/

      // Load image
      const img = await RawImage.fromURL(imageElement);

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
      console.error('Error removing background:', error);
    }

    this.loading.set(false);
  }

  private canvasToBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!));
    });
  }

  async applyMaskToImage(originalImage: HTMLImageElement, segmentationResults: ImageSegmentationPipelineOutput[]) {
    // Create a canvas to work with
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Set canvas dimensions to match the image
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;

    // Draw the original image
    ctx.drawImage(originalImage, 0, 0);

    // Get image data from the original image
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // We assume the first result contains our foreground mask
    // (RMBG-1.4 typically returns just one mask for the foreground)
    const foregroundResult = segmentationResults[0];

    // Convert the RawImage mask to usable data
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d')!;
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;

    // Draw the mask onto the mask canvas
    maskCtx.drawImage(foregroundResult.mask.toCanvas(), 0, 0, canvas.width, canvas.height);

    // Get the mask data
    const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height).data;

    // Apply the mask to the original image
    for (let i = 0; i < data.length; i += 4) {
      // In most segmentation masks, the alpha or grayscale value 
      // represents the probability of being foreground
      const maskIndex = i;

      // Use the red channel of the mask as the alpha for the output image
      // (this may need to be adjusted based on how the mask is structured)
      data[i + 3] = maskData[maskIndex];
    }

    // Put the modified image data back on the canvas
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }


  cancel() {
    this.file.set(undefined);
  }

}
