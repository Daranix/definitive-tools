import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser, NgClass, DecimalPipe } from '@angular/common';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '@/app/components/footer/footer.component';
import { DragAndDropFileComponent } from '@/app/components/drag-and-drop-file/drag-and-drop-file.component';
import { MetadataService } from '@/app/services/metadata.service';
import { ToastService } from '@/app/services/toast.service';
import { form, validateStandardSchema, FormField } from '@angular/forms/signals';
import { z } from 'zod';
import { AUDIO_BITRATE_OPTIONS, AUDIO_FORMATS, AUDIO_SAMPLE_RATES, AudioFormat, AudioSchema, audioSchema } from './audio-editor.schema';
@Component({
  selector: 'app-audio-editor',
  imports: [
    LucideIconComponent,
    NgClass,
    DecimalPipe,
    TopNavbarComponent,
    FooterComponent,
    DragAndDropFileComponent,
    FormField,
  ],
  templateUrl: './audio-editor.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './audio-editor.component.scss',
})
export class AudioEditorComponent implements OnDestroy {
  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly waveformCanvas =
    viewChild<ElementRef<HTMLCanvasElement>>('waveformCanvas');
  readonly audioEl = viewChild<ElementRef<HTMLAudioElement>>('audioEl');

  // ─── Accepted formats ───────────────────────────────────────────────────
  readonly allowedExtensions = [
    '.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.wma', '.opus',
  ];

  readonly formats = AUDIO_FORMATS;
  readonly bitrateOptions = AUDIO_BITRATE_OPTIONS;
  readonly sampleRateOptions = AUDIO_SAMPLE_RATES;

  // ─── User-controlled form state ──────────────────────────────────────────
  readonly audioModel = model<AudioSchema>({
    file: null,
    targetFormat: 'mp3',
    bitrate: 192,
    sampleRate: 44100,
    trimStart: 0,
    trimEnd: 0,
  });

  readonly audioForm = form(this.audioModel, (schemaPath) => {
    validateStandardSchema(schemaPath, audioSchema);
  });

  // ─── Ephemeral / process state (not user-controlled) ────────────────────
  readonly fileUrl = signal<string | undefined>(undefined);
  readonly duration = signal<number>(0);
  readonly currentTime = signal<number>(0);
  readonly playing = signal<boolean>(false);
  readonly waveformReady = signal<boolean>(false);

  readonly exporting = signal<boolean>(false);
  readonly loaded = signal<boolean>(false);
  readonly progress = signal<number>(0);
  readonly logs = signal<string[]>([]);
  readonly showLogs = signal<boolean>(false);
  readonly outputBlob = signal<Blob | undefined>(undefined);
  readonly outputUrl = signal<string | undefined>(undefined);
  readonly outputFileName = signal<string>('');

  // ─── Computed ────────────────────────────────────────────────────────────
  readonly trimDuration = computed(() =>
    this.audioForm.trimEnd().value() - this.audioForm.trimStart().value(),
  );
  readonly originalSize = computed(() => this.audioForm.file().value()?.size || 0);
  readonly convertedSize = computed(() => this.outputBlob()?.size || 0);
  readonly sizeChangePercent = computed(() => {
    const orig = this.originalSize();
    const conv = this.convertedSize();
    if (!orig || !conv) return 0;
    return Math.round(((orig - conv) / orig) * 100);
  });
  readonly isLossyFormat = computed(() =>
    ['mp3', 'ogg', 'aac'].includes(this.audioForm.targetFormat().value()),
  );

  // ─── Internals ───────────────────────────────────────────────────────────
  private ffmpeg: any;
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private animationFrameId: number | null = null;

  // Waveform interaction
  private isDraggingStart = false;
  private isDraggingEnd = false;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private waveformPeaks: number[] = [];

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Audio Editor',
      description:
        'Trim, cut, and convert audio files directly in your browser. Export to MP3, WAV, OGG, AAC, and FLAC using FFmpeg.wasm for 100% private, local-only processing.',
      updateCanonical: true,
    });

    // Cleanup fileUrl on change
    effect((onCleanup) => {
      const url = this.fileUrl();
      onCleanup(() => {
        if (url) URL.revokeObjectURL(url);
      });
    });

    // Cleanup outputUrl on change
    effect((onCleanup) => {
      const url = this.outputUrl();
      onCleanup(() => {
        if (url) URL.revokeObjectURL(url);
      });
    });

    // Re-render waveform whenever trim, playhead, or readiness changes
    effect(() => {
      this.audioForm.trimStart().value();
      this.audioForm.trimEnd().value();
      this.currentTime();
      this.waveformReady();
      this.playing();

      if (this.waveformReady()) {
        this.drawWaveform();
      }
    });

    // Attach canvas event listeners reactively — fires whenever the canvas
    // enters or leaves the DOM (i.e. when waveformReady flips), so listeners
    // are always attached to the real element, not a phantom.
    effect((onCleanup) => {
      const canvas = this.waveformCanvas()?.nativeElement;
      if (!canvas || !isPlatformBrowser(this.platformId)) return;

      const onMouseDown = (e: MouseEvent) => this.onMouseDown(e);
      const onMouseMove = (e: MouseEvent) => this.onMouseMove(e);
      const onMouseUp = () => this.onMouseUp();
      const onTouchStart = (e: TouchEvent) => this.onTouchStart(e);
      const onTouchMove = (e: TouchEvent) => { e.preventDefault(); this.onTouchMove(e); };
      const onTouchEnd = () => this.onMouseUp();

      canvas.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      canvas.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);

      onCleanup(() => {
        canvas.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      });
    });
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.audioContext?.close();
  }

  // ─── File selection ──────────────────────────────────────────────────────

  onFileSelected(selectedFile: File | undefined): void {
    this.resetAudioState();

    if (!selectedFile) {
      this.audioForm.file().value.set(null);
      this.fileUrl.set(undefined);
      return;
    }

    this.audioForm.file().value.set(selectedFile);
    this.fileUrl.set(URL.createObjectURL(selectedFile));
    this.decodeAudio(selectedFile);
  }

  private resetAudioState(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const audio = this.audioEl()?.nativeElement;
    if (audio) {
      audio.pause();
      audio.src = '';
    }

    this.audioBuffer = null;
    this.waveformPeaks = [];
    this.duration.set(0);
    this.audioForm.trimStart().value.set(0);
    this.audioForm.trimEnd().value.set(0);
    this.currentTime.set(0);
    this.playing.set(false);
    this.waveformReady.set(false);
    this.outputBlob.set(undefined);
    this.outputUrl.set(undefined);
    this.outputFileName.set('');
    this.progress.set(0);
    this.logs.set([]);
  }

  // ─── Waveform decoding & drawing ─────────────────────────────────────────

  private async decodeAudio(file: File): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const arrayBuffer = await file.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      const dur = this.audioBuffer.duration;

      this.duration.set(dur);
      this.audioForm.trimStart().value.set(0);
      this.audioForm.trimEnd().value.set(dur);

      this.waveformPeaks = this.extractPeaks(this.audioBuffer, 800);
      this.waveformReady.set(true);
    } catch (err: any) {
      console.error(err);
      this.toastService.error({
        message: `Failed to decode audio: ${err?.message || err}`,
      });
    }
  }

  private extractPeaks(buffer: AudioBuffer, numBars: number): number[] {
    const channelData = buffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / numBars);
    const peaks: number[] = [];

    for (let i = 0; i < numBars; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const abs = Math.abs(channelData[start + j]);
        if (abs > max) max = abs;
      }
      peaks.push(max);
    }

    return peaks;
  }

  private drawWaveform(): void {
    const canvasEl = this.waveformCanvas()?.nativeElement;
    if (!canvasEl || this.waveformPeaks.length === 0) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvasEl.getBoundingClientRect();
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;

    canvasEl.width = rect.width * dpr;
    canvasEl.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = this.canvasWidth;
    const H = this.canvasHeight;
    const dur = this.duration();
    const start = this.audioForm.trimStart().value();
    const end = this.audioForm.trimEnd().value();
    const playhead = this.currentTime();
    const peaks = this.waveformPeaks;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    const barCount = peaks.length;
    const barWidth = W / barCount;
    const centerY = H / 2;
    const maxBarH = H * 0.42;

    // Waveform bars
    for (let i = 0; i < barCount; i++) {
      const x = i * barWidth;
      const barH = Math.max(2, peaks[i] * maxBarH);
      const posTime = (i / barCount) * dur;
      const inTrim = posTime >= start && posTime <= end;

      if (inTrim) {
        const grad = ctx.createLinearGradient(x, centerY - barH, x, centerY + barH);
        grad.addColorStop(0, '#818cf8');
        grad.addColorStop(0.5, '#6366f1');
        grad.addColorStop(1, '#818cf8');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#1e293b';
      }

      const radius = Math.min(barWidth * 0.35, 2.5);
      this.roundRect(ctx, x + 0.5, centerY - barH, barWidth - 1, barH * 2, radius);
    }

    // Dimmed overlay outside trim
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, (start / dur) * W, H);
    ctx.fillRect((end / dur) * W, 0, W - (end / dur) * W, H);

    // Handle lines
    const startX = (start / dur) * W;
    const endX = (end / dur) * W;

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, H);
    ctx.stroke();
    this.drawHandle(ctx, startX, H, '#22d3ee');

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, H);
    ctx.stroke();
    this.drawHandle(ctx, endX, H, '#f472b6');

    // Playhead
    if (playhead > 0) {
      const phX = (playhead / dur) * W;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(phX, 0);
      ctx.lineTo(phX, H);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Time labels
    ctx.fillStyle = 'rgba(148,163,184,0.8)';
    ctx.font = '10px monospace';
    ctx.fillText(this.formatTime(start), startX + 4, 12);
    ctx.fillText(this.formatTime(end), Math.max(endX - 55, 0), 12);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  private drawHandle(
    ctx: CanvasRenderingContext2D, x: number, H: number, color: string,
  ): void {
    const hw = 10;
    const hh = 20;
    const hy = H / 2 - hh / 2;
    const r = 3;
    const hx = x - hw / 2;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(hx + r, hy);
    ctx.lineTo(hx + hw - r, hy);
    ctx.quadraticCurveTo(hx + hw, hy, hx + hw, hy + r);
    ctx.lineTo(hx + hw, hy + hh - r);
    ctx.quadraticCurveTo(hx + hw, hy + hh, hx + hw - r, hy + hh);
    ctx.lineTo(hx + r, hy + hh);
    ctx.quadraticCurveTo(hx, hy + hh, hx, hy + hh - r);
    ctx.lineTo(hx, hy + r);
    ctx.quadraticCurveTo(hx, hy, hx + r, hy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 2.5, hy + 5);
      ctx.lineTo(x + i * 2.5, hy + hh - 5);
      ctx.stroke();
    }
  }

  // ─── Canvas interaction ──────────────────────────────────────────────────
  // Listeners are managed reactively in the constructor effect().

  private getHandleThreshold(): number {
    return Math.max(14, this.canvasWidth * 0.015);
  }

  private onMouseDown(e: MouseEvent): void {
    if (!this.waveformReady()) return;
    const canvas = this.waveformCanvas()?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const dur = this.duration();
    const startX = (this.audioForm.trimStart().value() / dur) * this.canvasWidth;
    const endX = (this.audioForm.trimEnd().value() / dur) * this.canvasWidth;
    const thresh = this.getHandleThreshold();

    if (Math.abs(x - startX) < thresh) {
      this.isDraggingStart = true;
    } else if (Math.abs(x - endX) < thresh) {
      this.isDraggingEnd = true;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDraggingStart && !this.isDraggingEnd) return;
    const canvas = this.waveformCanvas()?.nativeElement;
    if (!canvas) return;

    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    this.applyDrag(e.clientX - rect.left);
  }

  private onMouseUp(): void {
    this.isDraggingStart = false;
    this.isDraggingEnd = false;
  }

  private onTouchStart(e: TouchEvent): void {
    if (!this.waveformReady() || !e.touches[0]) return;
    const canvas = this.waveformCanvas()?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const dur = this.duration();
    const startX = (this.audioForm.trimStart().value() / dur) * this.canvasWidth;
    const endX = (this.audioForm.trimEnd().value() / dur) * this.canvasWidth;
    const thresh = this.getHandleThreshold();

    if (Math.abs(x - startX) < thresh) {
      this.isDraggingStart = true;
    } else if (Math.abs(x - endX) < thresh) {
      this.isDraggingEnd = true;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDraggingStart && !this.isDraggingEnd) return;
    const canvas = this.waveformCanvas()?.nativeElement;
    if (!canvas || !e.touches[0]) return;

    const rect = canvas.getBoundingClientRect();
    this.applyDrag(e.touches[0].clientX - rect.left);
  }

  private applyDrag(x: number): void {
    const dur = this.duration();
    const ratio = Math.max(0, Math.min(1, x / this.canvasWidth));
    const time = ratio * dur;
    const minGap = 0.1;

    if (this.isDraggingStart) {
      this.audioForm.trimStart().value.set(
        Math.min(time, this.audioForm.trimEnd().value() - minGap),
      );
    } else if (this.isDraggingEnd) {
      this.audioForm.trimEnd().value.set(
        Math.max(time, this.audioForm.trimStart().value() + minGap),
      );
    }

    if (this.outputBlob()) {
      this.outputBlob.set(undefined);
      this.outputUrl.set(undefined);
      this.outputFileName.set('');
    }
  }

  updateCursor(event: MouseEvent): void {
    if (!this.waveformReady()) return;
    const canvas = this.waveformCanvas()?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const dur = this.duration();
    const startX = (this.audioForm.trimStart().value() / dur) * this.canvasWidth;
    const endX = (this.audioForm.trimEnd().value() / dur) * this.canvasWidth;
    const thresh = this.getHandleThreshold();

    const nearHandle = Math.abs(x - startX) < thresh || Math.abs(x - endX) < thresh;
    canvas.style.cursor = this.isDraggingStart || this.isDraggingEnd
      ? 'grabbing'
      : nearHandle
        ? 'grab'
        : 'default';
  }

  // ─── Playback ────────────────────────────────────────────────────────────

  togglePlay(): void {
    const audio = this.audioEl()?.nativeElement;
    if (!audio || !this.fileUrl()) return;

    if (this.playing()) {
      audio.pause();
    } else {
      if (audio.src !== this.fileUrl()) {
        audio.src = this.fileUrl()!;
      }
      audio.currentTime = this.currentTime() || 0;
      audio.play();
      this.startPlayheadLoop();
    }
  }

  playTrimmed(): void {
    const audio = this.audioEl()?.nativeElement;
    if (!audio || !this.fileUrl()) return;

    if (audio.src !== this.fileUrl()) {
      audio.src = this.fileUrl()!;
    }
    audio.currentTime = this.audioForm.trimStart().value();
    audio.play();
    this.playing.set(true);
    this.startPlayheadLoop();
  }

  private startPlayheadLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    const audio = this.audioEl()?.nativeElement;
    if (!audio) return;

    const loop = () => {
      this.currentTime.set(audio.currentTime);

      if (audio.currentTime >= this.audioForm.trimEnd().value()) {
        audio.pause();
        this.playing.set(false);
        return;
      }

      if (!audio.paused) {
        this.animationFrameId = requestAnimationFrame(loop);
      } else {
        this.playing.set(false);
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  onAudioPlay(): void { this.playing.set(true); }
  onAudioPause(): void { this.playing.set(false); }
  onAudioEnded(): void {
    this.playing.set(false);
    this.currentTime.set(0);
  }

  resetTrim(): void {
    this.audioForm.trimStart().value.set(0);
    this.audioForm.trimEnd().value.set(this.duration());
    this.outputBlob.set(undefined);
    this.outputUrl.set(undefined);
    this.outputFileName.set('');
  }

  // ─── FFmpeg ──────────────────────────────────────────────────────────────

  async initFFmpeg(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.loaded()) return;

    this.logs.update((l) => [...l, 'Loading FFmpeg Core locally...']);
    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');

      this.ffmpeg = new FFmpeg();

      this.ffmpeg.on('progress', ({ progress }: { progress: number }) => {
        this.progress.set(Math.round(progress * 100));
      });

      this.ffmpeg.on('log', ({ message }: { message: string }) => {
        this.logs.update((l) => [...l, message]);
      });

      const baseURL = `${window.location.origin}/assets/ffmpeg`;
      await this.ffmpeg.load({
        classWorkerURL: `${baseURL}/worker.js`,
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.loaded.set(true);
      this.logs.update((l) => [...l, 'FFmpeg core loaded successfully.']);
    } catch (error: any) {
      console.error(error);
      this.toastService.error({ message: 'Failed to load FFmpeg core resources.' });
      this.logs.update((l) => [...l, `Error: ${error?.message || error}`]);
    }
  }

  async handleExport(): Promise<void> {
    const currentFile = this.audioForm.file().value();
    if (!currentFile) {
      this.toastService.warning({ message: 'Please select an audio file first.' });
      return;
    }

    if (this.exporting()) return;

    this.exporting.set(true);
    this.progress.set(0);
    this.logs.set([]);
    this.outputBlob.set(undefined);
    const prevOut = this.outputUrl();
    if (prevOut) URL.revokeObjectURL(prevOut);
    this.outputUrl.set(undefined);

    try {
      await this.initFFmpeg();
      if (!this.loaded()) throw new Error('FFmpeg failed to load.');

      const fmt = this.audioForm.targetFormat().value();
      const br = this.audioForm.bitrate().value();
      const sr = this.audioForm.sampleRate().value();
      const start = this.audioForm.trimStart().value();
      const end = this.audioForm.trimEnd().value();

      const ext = currentFile.name.substring(currentFile.name.lastIndexOf('.'));
      const inputName = `input_${Date.now()}${ext}`;
      const outputExt = fmt === 'aac' ? '.m4a' : `.${fmt}`;
      const outputName = `output_${Date.now()}${outputExt}`;

      this.logs.update((l) => [...l, `Loading "${currentFile.name}" into virtual FS...`]);
      const { fetchFile } = await import('@ffmpeg/util');
      await this.ffmpeg.writeFile(inputName, await fetchFile(currentFile));

      const args: string[] = [
        '-ss', start.toFixed(3),
        '-to', end.toFixed(3),
        '-i', inputName,
      ];

      switch (fmt) {
        case 'mp3': args.push('-c:a', 'libmp3lame', '-b:a', `${br}k`); break;
        case 'wav': args.push('-c:a', 'pcm_s16le'); break;
        case 'ogg': args.push('-c:a', 'libvorbis', '-b:a', `${br}k`); break;
        case 'aac': args.push('-c:a', 'aac', '-b:a', `${br}k`); break;
        case 'flac': args.push('-c:a', 'flac'); break;
      }

      if (sr) args.push('-ar', sr.toString());
      args.push(outputName);

      this.logs.update((l) => [...l, `Executing: ffmpeg ${args.join(' ')}`]);
      await this.ffmpeg.exec(args);

      const data = await this.ffmpeg.readFile(outputName);
      const mimeMap: Record<AudioFormat, string> = {
        mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
        aac: 'audio/aac', flac: 'audio/flac',
      };
      const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeMap[fmt] });
      this.outputBlob.set(blob);
      this.outputUrl.set(URL.createObjectURL(blob));

      const baseName = currentFile.name.substring(0, currentFile.name.lastIndexOf('.'));
      this.outputFileName.set(`${baseName}_trimmed${outputExt}`);

      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      this.toastService.success({ message: 'Audio exported successfully!' });
    } catch (error: any) {
      console.error(error);
      this.toastService.error({
        message: `Export failed: ${error?.message || error}`,
      });
      this.logs.update((l) => [...l, `Execution failed: ${error?.message || error}`]);
    } finally {
      this.exporting.set(false);
    }
  }

  handleDownload(): void {
    const url = this.outputUrl();
    const name = this.outputFileName();
    if (!url || !name) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  }

  clear(): void {
    this.onFileSelected(undefined);
  }

  // ─── Utility ─────────────────────────────────────────────────────────────

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
