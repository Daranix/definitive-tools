import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '@/app/components/footer/footer.component';
import { DragAndDropFileComponent } from '@/app/components/drag-and-drop-file/drag-and-drop-file.component';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { FileSizePipe } from '@/app/pipes/file-size.pipe';
import { MetadataService } from '@/app/services/metadata.service';
import { ToastService } from '@/app/services/toast.service';
import { parseQrContent, ParsedQrResult } from './qr-reader.parser';
import jsQR from 'jsqr';
import QRCodeStyling from 'qr-code-styling';

interface QrLocation {
  topLeftCorner: { x: number; y: number };
  topRightCorner: { x: number; y: number };
  bottomRightCorner: { x: number; y: number };
  bottomLeftCorner: { x: number; y: number };
}

@Component({
  selector: 'app-qr-reader',
  standalone: true,
  imports: [
    FormsModule,
    TopNavbarComponent,
    FooterComponent,
    DragAndDropFileComponent,
    LucideIconComponent,
    FileSizePipe,
  ],
  templateUrl: './qr-reader.component.html',
  styleUrl: './qr-reader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrReaderComponent implements OnDestroy {
  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);

  readonly previewCanvas = viewChild<ElementRef<HTMLCanvasElement>>('previewCanvas');
  readonly videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');

  // Modes
  readonly scanMode = signal<'file' | 'camera'>('file');

  // Camera State
  readonly isCameraActive = signal<boolean>(false);
  readonly cameraError = signal<string | null>(null);
  readonly facingMode = signal<'environment' | 'user'>('environment');
  readonly hasTorch = signal<boolean>(false);
  readonly torchActive = signal<boolean>(false);

  private currentStream: MediaStream | null = null;
  private scanAnimFrameId: number | null = null;
  private lastScanTime = 0;
  private offscreenCanvas: HTMLCanvasElement | null = null;

  // File / Scan State
  readonly imageFile = signal<File | undefined>(undefined);
  readonly imageSrc = signal<string | undefined>(undefined);
  readonly imageName = signal<string>('');
  readonly imageSize = signal<number>(0);
  readonly imageDimensions = signal<{ width: number; height: number } | undefined>(undefined);

  readonly isScanning = signal<boolean>(false);
  readonly scanResult = signal<ParsedQrResult | undefined>(undefined);
  readonly noQrFound = signal<boolean>(false);
  readonly copied = signal<boolean>(false);

  readonly allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.bmp'];

  constructor() {
    this.metadataService.updateMetadata({
      title: 'QR Code Reader & Scanner - Scan from Camera or Image',
      description:
        'Upload, drag-and-drop, paste from clipboard, or use your camera in real time to scan, decode, and view QR codes on screen.',
      keywords:
        'qr reader, qr scanner, qr camera, camera qr scanner, scan qr code online, decode qr code, web qr reader',
    });
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  // Handle global paste (Ctrl+V) so users can paste screenshots directly
  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          this.stopCamera();
          this.scanMode.set('file');
          this.processImageFile(file, `Pasted-Image-${Date.now()}`);
          this.toastService.info({ message: 'Image loaded from clipboard' });
          break;
        }
      }
    }
  }

  setScanMode(mode: 'file' | 'camera'): void {
    if (this.scanMode() === mode) return;

    this.scanMode.set(mode);
    if (mode === 'camera') {
      this.startCamera();
    } else {
      this.stopCamera();
    }
  }

  // Camera Management
  async startCamera(): Promise<void> {
    this.stopCamera();
    this.cameraError.set(null);
    this.isCameraActive.set(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Camera access is not supported by your browser or environment.');
      this.isCameraActive.set(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: this.facingMode() },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities?.() as { torch?: boolean }) || {};
        this.hasTorch.set(Boolean(capabilities.torch));
      }

      const videoRef = this.videoElement();
      if (videoRef) {
        const video = videoRef.nativeElement;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play();
        this.startScanningLoop();
      }
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      this.isCameraActive.set(false);

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.cameraError.set('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        this.cameraError.set('No camera device was found on this system.');
      } else {
        this.cameraError.set(`Unable to access camera: ${error.message || 'Unknown error'}`);
      }
    }
  }

  stopCamera(): void {
    if (this.scanAnimFrameId !== null) {
      cancelAnimationFrame(this.scanAnimFrameId);
      this.scanAnimFrameId = null;
    }

    if (this.currentStream) {
      for (const track of this.currentStream.getTracks()) {
        track.stop();
      }
      this.currentStream = null;
    }

    const videoRef = this.videoElement();
    if (videoRef) {
      videoRef.nativeElement.srcObject = null;
    }

    this.isCameraActive.set(false);
    this.torchActive.set(false);
    this.hasTorch.set(false);
  }

  async flipCamera(): Promise<void> {
    this.facingMode.set(this.facingMode() === 'environment' ? 'user' : 'environment');
    await this.startCamera();
  }

  async toggleTorch(): Promise<void> {
    if (!this.currentStream) return;
    const track = this.currentStream.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !this.torchActive();
      await (track as MediaStreamTrack & {
        applyConstraints: (c: { advanced: { torch: boolean }[] }) => Promise<void>;
      }).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      this.torchActive.set(nextState);
    } catch (err) {
      console.warn('Torch not supported or failed to toggle', err);
    }
  }

  private startScanningLoop(): void {
    if (!this.isCameraActive()) return;

    const videoRef = this.videoElement();
    if (!videoRef) return;
    const video = videoRef.nativeElement;

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !video.paused && !video.ended) {
      const now = Date.now();
      // Scan every ~120ms to avoid unnecessary CPU load while maintaining instant detection
      if (now - this.lastScanTime >= 120) {
        this.lastScanTime = now;
        this.scanVideoFrame(video);
      }
    }

    if (this.isCameraActive()) {
      this.scanAnimFrameId = requestAnimationFrame(() => this.startScanningLoop());
    }
  }

  private async scanVideoFrame(video: HTMLVideoElement): Promise<void> {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    // 1. Try native BarcodeDetector directly on the video element
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const barcodeDetectorCtor = (
          window as unknown as {
            BarcodeDetector: new (opts?: { formats?: string[] }) => {
              detect: (source: HTMLVideoElement | HTMLCanvasElement) => Promise<
                {
                  rawValue: string;
                  cornerPoints?: { x: number; y: number }[];
                }[]
              >;
            };
          }
        ).BarcodeDetector;
        const detector = new barcodeDetectorCtor({ formats: ['qr_code'] });
        const barcodes = await detector.detect(video);

        if (barcodes && barcodes.length > 0) {
          const b = barcodes[0];
          let location: QrLocation | undefined;
          if (b.cornerPoints && b.cornerPoints.length >= 4) {
            location = {
              topLeftCorner: b.cornerPoints[0],
              topRightCorner: b.cornerPoints[1],
              bottomRightCorner: b.cornerPoints[2],
              bottomLeftCorner: b.cornerPoints[3],
            };
          }
          this.handleLiveCodeDetected(video, b.rawValue, location);
          return;
        }
      } catch {
        // Fall back to offscreen canvas + jsQR
      }
    }

    // 2. Offscreen Canvas + jsQR fallback
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
    }
    const offCanvas = this.offscreenCanvas;

    // Scale to max dimension 720px for high performance
    const maxDim = 720;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const sw = Math.round(width * scale);
    const sh = Math.round(height * scale);

    offCanvas.width = sw;
    offCanvas.height = sh;
    const ctx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, sw, sh);
    const imgData = ctx.getImageData(0, 0, sw, sh);
    const code = jsQR(imgData.data, sw, sh, { inversionAttempts: 'attemptBoth' });

    if (code && code.data) {
      const invScale = 1 / scale;
      const location: QrLocation = {
        topLeftCorner: {
          x: code.location.topLeftCorner.x * invScale,
          y: code.location.topLeftCorner.y * invScale,
        },
        topRightCorner: {
          x: code.location.topRightCorner.x * invScale,
          y: code.location.topRightCorner.y * invScale,
        },
        bottomRightCorner: {
          x: code.location.bottomRightCorner.x * invScale,
          y: code.location.bottomRightCorner.y * invScale,
        },
        bottomLeftCorner: {
          x: code.location.bottomLeftCorner.x * invScale,
          y: code.location.bottomLeftCorner.y * invScale,
        },
      };
      this.handleLiveCodeDetected(video, code.data, location);
    }
  }

  private handleLiveCodeDetected(
    video: HTMLVideoElement,
    rawValue: string,
    location?: QrLocation
  ): void {
    // 1. Capture snapshot of current video frame
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    const captureCtx = captureCanvas.getContext('2d');
    if (captureCtx) {
      captureCtx.drawImage(video, 0, 0);
    }
    const snapshotUrl = captureCanvas.toDataURL('image/png');

    // 2. Stop camera stream immediately
    this.stopCamera();

    // 3. Vibrate device if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(100);
      } catch {
        // Ignore vibration errors
      }
    }

    // 4. Update state to show the result
    const parsed = parseQrContent(rawValue);
    this.imageSrc.set(snapshotUrl);
    this.imageName.set(`Camera-Scan-${new Date().toLocaleTimeString()}`);
    this.imageSize.set(Math.round((snapshotUrl.length * 3) / 4));
    this.imageDimensions.set({ width: video.videoWidth, height: video.videoHeight });
    this.scanResult.set(parsed);
    this.noQrFound.set(false);

    this.toastService.success({ message: `QR Code scanned: ${parsed.badgeLabel}` });

    // 5. Render snapshot on preview canvas with bounding box overlay
    const img = new Image();
    img.onload = () => {
      this.renderCanvasWithOverlay(img, location);
    };
    img.src = snapshotUrl;
  }

  // File Upload Handlers
  onFileChange(file?: File): void {
    if (!file) {
      this.clear();
      return;
    }
    this.processImageFile(file, file.name);
  }

  private processImageFile(file: File, name: string): void {
    this.clearStateForNewScan();
    this.imageFile.set(file);
    this.imageName.set(name);
    this.imageSize.set(file.size);
    this.isScanning.set(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.imageSrc.set(dataUrl);

      const img = new Image();
      img.onload = async () => {
        this.imageDimensions.set({ width: img.naturalWidth, height: img.naturalHeight });
        await this.detectAndRender(img);
      };
      img.onerror = () => {
        this.isScanning.set(false);
        this.toastService.error({ message: 'Failed to load the image.' });
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      this.isScanning.set(false);
      this.toastService.error({ message: 'Error reading file.' });
    };
    reader.readAsDataURL(file);
  }

  private async detectAndRender(img: HTMLImageElement): Promise<void> {
    try {
      const detection = await this.detectQrCode(img);

      if (detection) {
        const parsed = parseQrContent(detection.data);
        this.scanResult.set(parsed);
        this.noQrFound.set(false);
        this.toastService.success({ message: `QR Code detected: ${parsed.badgeLabel}` });
        this.renderCanvasWithOverlay(img, detection.location);
      } else {
        this.scanResult.set(undefined);
        this.noQrFound.set(true);
        this.renderCanvasWithOverlay(img, undefined);
      }
    } catch (err) {
      console.error('Detection error:', err);
      this.noQrFound.set(true);
      this.renderCanvasWithOverlay(img, undefined);
    } finally {
      this.isScanning.set(false);
    }
  }

  private async detectQrCode(
    img: HTMLImageElement
  ): Promise<{ data: string; location?: QrLocation } | null> {
    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;

    // Check multi-resolution scans: original, downscaled if large, or upscaled if small
    const targetSizes: { width: number; height: number }[] = [];

    // 1. Primary scale
    if (originalWidth > 1600 || originalHeight > 1600) {
      const maxDim = 1200;
      const ratio = Math.min(maxDim / originalWidth, maxDim / originalHeight);
      targetSizes.push({
        width: Math.round(originalWidth * ratio),
        height: Math.round(originalHeight * ratio),
      });
      // Also fallback to original
      targetSizes.push({ width: originalWidth, height: originalHeight });
    } else {
      targetSizes.push({ width: originalWidth, height: originalHeight });
      // If small, also try 2x upscaled
      if (originalWidth < 400 && originalHeight < 400) {
        targetSizes.push({ width: originalWidth * 2, height: originalHeight * 2 });
      }
    }

    for (const size of targetSizes) {
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) continue;

      ctx.drawImage(img, 0, 0, size.width, size.height);

      // A. Try native BarcodeDetector if available
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const barcodeDetectorCtor = (
            window as unknown as {
              BarcodeDetector: new (opts?: { formats?: string[] }) => {
                detect: (canvas: HTMLCanvasElement) => Promise<
                  {
                    rawValue: string;
                    cornerPoints?: { x: number; y: number }[];
                  }[]
                >;
              };
            }
          ).BarcodeDetector;
          const barcodeDetector = new barcodeDetectorCtor({ formats: ['qr_code'] });
          const barcodes = await barcodeDetector.detect(canvas);

          if (barcodes && barcodes.length > 0) {
            const b = barcodes[0];
            let location: QrLocation | undefined;
            if (b.cornerPoints && b.cornerPoints.length >= 4) {
              const scaleX = originalWidth / size.width;
              const scaleY = originalHeight / size.height;
              location = {
                topLeftCorner: { x: b.cornerPoints[0].x * scaleX, y: b.cornerPoints[0].y * scaleY },
                topRightCorner: { x: b.cornerPoints[1].x * scaleX, y: b.cornerPoints[1].y * scaleY },
                bottomRightCorner: { x: b.cornerPoints[2].x * scaleX, y: b.cornerPoints[2].y * scaleY },
                bottomLeftCorner: { x: b.cornerPoints[3].x * scaleX, y: b.cornerPoints[3].y * scaleY },
              };
            }
            return { data: b.rawValue, location };
          }
        } catch {
          // Native detector error / unsupported format, fallback to jsQR
        }
      }

      // B. Try jsQR on canvas image data
      const imageData = ctx.getImageData(0, 0, size.width, size.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code && code.data) {
        const scaleX = originalWidth / size.width;
        const scaleY = originalHeight / size.height;
        const location: QrLocation = {
          topLeftCorner: {
            x: code.location.topLeftCorner.x * scaleX,
            y: code.location.topLeftCorner.y * scaleY,
          },
          topRightCorner: {
            x: code.location.topRightCorner.x * scaleX,
            y: code.location.topRightCorner.y * scaleY,
          },
          bottomRightCorner: {
            x: code.location.bottomRightCorner.x * scaleX,
            y: code.location.bottomRightCorner.y * scaleY,
          },
          bottomLeftCorner: {
            x: code.location.bottomLeftCorner.x * scaleX,
            y: code.location.bottomLeftCorner.y * scaleY,
          },
        };
        return { data: code.data, location };
      }
    }

    return null;
  }

  private renderCanvasWithOverlay(img: HTMLImageElement, location?: QrLocation): void {
    const canvasRef = this.previewCanvas();
    if (!canvasRef) return;
    const canvas = canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    if (location) {
      const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } = location;

      // 1. Highlight Polygon fill
      ctx.beginPath();
      ctx.moveTo(topLeftCorner.x, topLeftCorner.y);
      ctx.lineTo(topRightCorner.x, topRightCorner.y);
      ctx.lineTo(bottomRightCorner.x, bottomRightCorner.y);
      ctx.lineTo(bottomLeftCorner.x, bottomLeftCorner.y);
      ctx.closePath();

      ctx.fillStyle = 'rgba(79, 70, 229, 0.18)';
      ctx.fill();

      // 2. Stroke border
      const strokeW = Math.max(3, Math.round(canvas.width / 180));
      ctx.lineWidth = strokeW;
      ctx.strokeStyle = '#4f46e5';
      ctx.stroke();

      // 3. Corner target points
      const cornerRadius = Math.max(6, Math.round(strokeW * 1.5));
      const corners = [topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner];
      for (const corner of corners) {
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, cornerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = '#6366f1';
        ctx.fill();
        ctx.lineWidth = Math.max(2, Math.round(strokeW / 2));
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    }
  }

  copyContent(text: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(true);
      this.toastService.success({ message: 'Content copied to clipboard!' });
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  downloadVCard(): void {
    const vcard = this.scanResult()?.vcardData;
    const raw = this.scanResult()?.raw;
    if (!raw) return;

    let vcfContent = raw;
    if (!vcfContent.toUpperCase().startsWith('BEGIN:VCARD')) {
      vcfContent = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${vcard?.fullName || 'Contact'}`,
        vcard?.phone ? `TEL:${vcard.phone}` : '',
        vcard?.email ? `EMAIL:${vcard.email}` : '',
        vcard?.organization ? `ORG:${vcard.organization}` : '',
        vcard?.title ? `TITLE:${vcard.title}` : '',
        vcard?.url ? `URL:${vcard.url}` : '',
        vcard?.address ? `ADR:;;${vcard.address};;;;` : '',
        vcard?.note ? `NOTE:${vcard.note}` : '',
        'END:VCARD',
      ]
        .filter(Boolean)
        .join('\r\n');
    }

    const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(vcard?.fullName || 'contact').replace(/\s+/g, '_')}.vcf`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastService.success({ message: 'Contact .vcf downloaded' });
  }

  async loadSample(type: 'url' | 'wifi' | 'vcard' | 'text'): Promise<void> {
    this.isScanning.set(true);
    let sampleData: string;
    let sampleName: string;

    switch (type) {
      case 'url':
        sampleData = 'https://github.com/Daranix/definitive-tools';
        sampleName = 'sample-website-qr.png';
        break;
      case 'wifi':
        sampleData = 'WIFI:S:Office-Guest-5G;T:WPA;P:SuperSecretPass2026;H:false;;';
        sampleName = 'sample-wifi-qr.png';
        break;
      case 'vcard':
        sampleData =
          'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Alex Rivera\r\nORG:Tech Solutions Inc.\r\nTITLE:Senior Cloud Architect\r\nTEL:+1-555-839-2041\r\nEMAIL:alex.rivera@techsolutions.io\r\nURL:https://alexrivera.dev\r\nADR:;;123 Innovation Way;Silicon Valley;CA;94025;USA\r\nNOTE:Met at Global Tech Summit 2026\r\nEND:VCARD';
        sampleName = 'sample-vcard-qr.png';
        break;
      case 'text':
      default:
        sampleData = '{\n  "status": "success",\n  "scanner": "Definitive Tools QR Reader",\n  "version": "1.0",\n  "offline": true\n}';
        sampleName = 'sample-json-qr.png';
        break;
    }

    try {
      const qr = new QRCodeStyling({
        width: 450,
        height: 450,
        type: 'svg',
        data: sampleData,
        dotsOptions: {
          color: '#312e81',
          type: 'rounded',
        },
        cornersSquareOptions: {
          color: '#4338ca',
          type: 'extra-rounded',
        },
        cornersDotOptions: {
          color: '#4f46e5',
          type: 'dot',
        },
        backgroundOptions: {
          color: '#ffffff',
        },
      });

      const blob = await qr.getRawData('png');
      if (blob) {
        const file = new File([blob as Blob], sampleName, { type: 'image/png' });
        this.processImageFile(file, sampleName);
      }
    } catch (e) {
      console.error('Error generating sample:', e);
      this.toastService.error({ message: 'Could not load sample QR code.' });
      this.isScanning.set(false);
    }
  }

  private clearStateForNewScan(): void {
    this.scanResult.set(undefined);
    this.noQrFound.set(false);
    this.copied.set(false);
  }

  clear(): void {
    this.imageFile.set(undefined);
    this.imageSrc.set(undefined);
    this.imageName.set('');
    this.imageSize.set(0);
    this.imageDimensions.set(undefined);
    this.clearStateForNewScan();
    this.isScanning.set(false);

    const canvasRef = this.previewCanvas();
    if (canvasRef) {
      const canvas = canvasRef.nativeElement;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (this.scanMode() === 'camera') {
      this.startCamera();
    }
  }
}
