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
  output,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser, NgClass, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { DragAndDropFileComponent } from '@/app/components/drag-and-drop-file/drag-and-drop-file.component';
import {
  AUDIO_BITRATE_OPTIONS,
  AUDIO_FORMATS,
  AUDIO_SAMPLE_RATES,
  AudioClip,
  AudioCut,
  AudioEditMode,
  AudioFormat,
  ExportedClip,
} from '../../audio-editor.schema';
import { AudioEngineService } from '../../services/audio-engine.service';
import { AudioExportService } from '../../services/audio-export.service';
import { ToastService } from '@/app/services/toast.service';

interface HoverInfo {
  time: number;
  x: number;
}

interface DragState {
  type: 'trim-start' | 'trim-end' | 'cut-start' | 'cut-end' | 'clip-boundary';
  cutId?: string;
  clipIndex?: number;
}

@Component({
  selector: 'app-single-track-editor',
  imports: [
    LucideIconComponent,
    NgClass,
    DecimalPipe,
    FormsModule,
    DragAndDropFileComponent,
  ],
  templateUrl: './single-track-editor.component.html',
  styleUrl: './single-track-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SingleTrackEditorComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly audioEngine = inject(AudioEngineService);
  private readonly audioExport = inject(AudioExportService);
  private readonly toastService = inject(ToastService);

  readonly waveformCanvas =
    viewChild<ElementRef<HTMLCanvasElement>>('waveformCanvas');
  readonly waveformContainer =
    viewChild<ElementRef<HTMLDivElement>>('waveformContainer');
  readonly audioEl = viewChild<ElementRef<HTMLAudioElement>>('audioEl');

  // Inputs / Models
  readonly editMode = model.required<AudioEditMode>();
  readonly targetFormat = model<AudioFormat>('mp3');
  readonly bitrate = model<number>(192);
  readonly sampleRate = model<number>(44100);
  readonly trimStart = model<number>(0);
  readonly trimEnd = model<number>(0);
  readonly zoom = model<number>(1);

  readonly onFileChange = output<File | null>();

  // Constants
  readonly allowedExtensions = [
    '.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.wma', '.opus',
  ];
  readonly formats = AUDIO_FORMATS;
  readonly bitrateOptions = AUDIO_BITRATE_OPTIONS;
  readonly sampleRateOptions = AUDIO_SAMPLE_RATES;

  // File & Audio state
  readonly file = signal<File | null>(null);
  readonly fileUrl = signal<string | undefined>(undefined);
  readonly audioBuffer = signal<AudioBuffer | null>(null);
  readonly duration = signal<number>(0);
  readonly currentTime = signal<number>(0);
  readonly playing = signal<boolean>(false);
  readonly waveformReady = signal<boolean>(false);
  readonly hoverInfo = signal<HoverInfo | null>(null);

  // Cuts & Clips
  readonly cuts = signal<AudioCut[]>([]);
  readonly clips = signal<AudioClip[]>([]);
  readonly activeClipId = signal<string | null>(null);
  readonly activeCutId = signal<string | null>(null);

  // Export Results
  readonly exporting = signal<boolean>(false);
  readonly progress = signal<number>(0);
  readonly currentExportStep = signal<string>('');
  readonly outputBlob = signal<Blob | undefined>(undefined);
  readonly outputUrl = signal<string | undefined>(undefined);
  readonly outputFileName = signal<string>('');
  readonly exportedClips = signal<ExportedClip[]>([]);
  readonly zipBlob = signal<Blob | undefined>(undefined);
  readonly zipUrl = signal<string | undefined>(undefined);
  readonly zipFileName = signal<string>('');

  private animationFrameId: number | null = null;
  private dragState: DragState | null = null;
  private canvasWidth = 0;
  private canvasHeight = 0;

  // ─── Computed Properties ─────────────────────────────────────────────────

  readonly trimDuration = computed(() => {
    return Math.max(0, this.trimEnd() - this.trimStart());
  });

  readonly keptIntervals = computed(() => {
    const dur = this.duration();
    if (dur <= 0) return [];
    const sortedCuts = [...this.cuts()].sort((a, b) => a.start - b.start);
    if (sortedCuts.length === 0) {
      return [{ start: 0, end: dur }];
    }

    const intervals: { start: number; end: number }[] = [];
    let currentPos = 0;

    for (const cut of sortedCuts) {
      const cutStart = Math.max(0, Math.min(dur, cut.start));
      const cutEnd = Math.max(cutStart, Math.min(dur, cut.end));

      if (cutStart > currentPos + 0.02) {
        intervals.push({ start: currentPos, end: cutStart });
      }
      currentPos = Math.max(currentPos, cutEnd);
    }

    if (currentPos + 0.02 < dur) {
      intervals.push({ start: currentPos, end: dur });
    }

    return intervals;
  });

  readonly removeKeptDuration = computed(() => {
    return this.keptIntervals().reduce(
      (sum, item) => sum + (item.end - item.start),
      0,
    );
  });

  readonly totalCutDuration = computed(() => {
    return Math.max(0, this.duration() - this.removeKeptDuration());
  });

  readonly isLossyFormat = computed(() =>
    ['mp3', 'ogg', 'aac'].includes(this.targetFormat()),
  );

  constructor() {
    // Re-draw canvas on reactive dependencies change
    effect(() => {
      this.trimStart();
      this.trimEnd();
      this.currentTime();
      this.waveformReady();
      this.playing();
      this.editMode();
      this.cuts();
      this.clips();
      this.activeCutId();
      this.activeClipId();
      this.hoverInfo();
      this.zoom();

      if (this.waveformReady()) {
        this.drawWaveform();
      }
    });

    // Cleanup URLs
    effect((onCleanup) => {
      const url = this.fileUrl();
      onCleanup(() => { if (url) URL.revokeObjectURL(url); });
    });
    effect((onCleanup) => {
      const url = this.outputUrl();
      onCleanup(() => { if (url) URL.revokeObjectURL(url); });
    });
    effect((onCleanup) => {
      const url = this.zipUrl();
      onCleanup(() => { if (url) URL.revokeObjectURL(url); });
    });
    effect((onCleanup) => {
      const list = this.exportedClips();
      onCleanup(() => { list.forEach((c) => URL.revokeObjectURL(c.url)); });
    });

    // Canvas Mouse / Touch Listeners
    effect((onCleanup) => {
      const canvas = this.waveformCanvas()?.nativeElement;
      if (!canvas || !isPlatformBrowser(this.platformId)) return;

      const onMouseDown = (e: MouseEvent) => this.onMouseDown(e);
      const onMouseMove = (e: MouseEvent) => this.onMouseMove(e);
      const onMouseUp = () => this.onMouseUp();
      const onMouseLeave = () => this.hoverInfo.set(null);
      const onTouchStart = (e: TouchEvent) => this.onTouchStart(e);
      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        this.onTouchMove(e);
      };
      const onTouchEnd = () => this.onMouseUp();

      canvas.addEventListener('mousedown', onMouseDown);
      canvas.addEventListener('mouseleave', onMouseLeave);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      canvas.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);

      onCleanup(() => {
        canvas.removeEventListener('mousedown', onMouseDown);
        canvas.removeEventListener('mouseleave', onMouseLeave);
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
  }

  // ─── File Handling ───────────────────────────────────────────────────────

  async onFileSelected(selectedFile: File | undefined): Promise<void> {
    this.resetState();

    if (!selectedFile) {
      this.file.set(null);
      this.fileUrl.set(undefined);
      this.onFileChange.emit(null);
      return;
    }

    this.file.set(selectedFile);
    this.fileUrl.set(URL.createObjectURL(selectedFile));
    this.onFileChange.emit(selectedFile);

    try {
      const buffer = await this.audioEngine.decodeAudio(selectedFile);
      this.audioBuffer.set(buffer);
      const dur = buffer.duration;
      this.duration.set(dur);
      this.trimStart.set(0);
      this.trimEnd.set(dur);

      const mid = Math.round((dur / 2) * 10) / 10;
      if (dur > 6) {
        this.clips.set([
          { id: 'clip-1', name: 'Part 1', start: 0, end: mid },
          { id: 'clip-2', name: 'Part 2', start: mid, end: dur },
        ]);
      } else {
        this.clips.set([{ id: 'clip-1', name: 'Clip 1', start: 0, end: dur }]);
      }

      this.waveformReady.set(true);
    } catch (err: any) {
      console.error(err);
      this.toastService.error({ message: `Failed to decode audio: ${err?.message || err}` });
    }
  }

  clear(): void {
    this.onFileSelected(undefined);
  }

  private resetState(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    const audio = this.audioEl()?.nativeElement;
    if (audio) {
      audio.pause();
      audio.src = '';
    }

    this.audioBuffer.set(null);
    this.duration.set(0);
    this.trimStart.set(0);
    this.trimEnd.set(0);
    this.currentTime.set(0);
    this.playing.set(false);
    this.waveformReady.set(false);
    this.zoom.set(1);
    this.cuts.set([]);
    this.clips.set([]);
    this.activeClipId.set(null);
    this.activeCutId.set(null);
    this.clearExportResults();
  }

  private clearExportResults(): void {
    const prevOut = this.outputUrl();
    if (prevOut) URL.revokeObjectURL(prevOut);
    this.outputBlob.set(undefined);
    this.outputUrl.set(undefined);
    this.outputFileName.set('');

    const prevZip = this.zipUrl();
    if (prevZip) URL.revokeObjectURL(prevZip);
    this.zipBlob.set(undefined);
    this.zipUrl.set(undefined);
    this.zipFileName.set('');
    this.exportedClips.set([]);
  }

  // ─── High-Resolution Dynamic Waveform Canvas Rendering ───────────────────

  private drawWaveform(): void {
    const canvasEl = this.waveformCanvas()?.nativeElement;
    const buffer = this.audioBuffer();
    if (!canvasEl || !buffer) return;

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
    const playhead = this.currentTime();
    const mode = this.editMode();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Dynamic High-Res Peak Extraction based on physical canvas width & zoom
    const barWidthTarget = 3.2; // px per bar
    const barCount = Math.max(100, Math.floor(W / barWidthTarget));
    const peaks = this.audioEngine.extractDynamicPeaks(buffer, 0, dur, barCount);

    const barWidth = W / barCount;
    const centerY = (H - 18) / 2 + 6;
    const maxBarH = (H - 24) * 0.4;

    const clipPalette = [
      { start: '#818cf8', end: '#6366f1', fill: 'rgba(99, 102, 241, 0.15)' },
      { start: '#34d399', end: '#059669', fill: 'rgba(16, 185, 129, 0.15)' },
      { start: '#fbbf24', end: '#d97706', fill: 'rgba(245, 158, 11, 0.15)' },
      { start: '#38bdf8', end: '#0284c7', fill: 'rgba(14, 165, 233, 0.15)' },
      { start: '#c084fc', end: '#9333ea', fill: 'rgba(168, 85, 247, 0.15)' },
      { start: '#f472b6', end: '#db2777', fill: 'rgba(236, 72, 153, 0.15)' },
    ];

    for (let i = 0; i < barCount; i++) {
      const x = i * barWidth;
      const barH = Math.max(2, peaks[i] * maxBarH);
      const posTime = (i / barCount) * dur;

      if (mode === 'trim') {
        const start = this.trimStart();
        const end = this.trimEnd();
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
      } else if (mode === 'remove') {
        const inCut = this.cuts().some((c) => posTime >= c.start && posTime <= c.end);
        if (inCut) {
          ctx.fillStyle = '#ef4444';
        } else {
          const grad = ctx.createLinearGradient(x, centerY - barH, x, centerY + barH);
          grad.addColorStop(0, '#38bdf8');
          grad.addColorStop(0.5, '#6366f1');
          grad.addColorStop(1, '#38bdf8');
          ctx.fillStyle = grad;
        }
      } else if (mode === 'split') {
        const clipIdx = this.clips().findIndex((c) => posTime >= c.start && posTime <= c.end);
        const palette = clipPalette[(clipIdx >= 0 ? clipIdx : 0) % clipPalette.length];
        const grad = ctx.createLinearGradient(x, centerY - barH, x, centerY + barH);
        grad.addColorStop(0, palette.start);
        grad.addColorStop(0.5, palette.end);
        grad.addColorStop(1, palette.start);
        ctx.fillStyle = grad;
      }

      const radius = Math.min(barWidth * 0.35, 2.5);
      this.roundRect(ctx, x + 0.5, centerY - barH, Math.max(1, barWidth - 0.5), barH * 2, radius);
    }

    // Overlay handles & boundaries
    if (mode === 'trim') {
      const start = this.trimStart();
      const end = this.trimEnd();
      const startX = (start / dur) * W;
      const endX = (end / dur) * W;

      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, startX, H - 18);
      ctx.fillRect(endX, 0, W - endX, H - 18);

      this.drawVerticalMarker(ctx, startX, H - 18, '#22d3ee', 'Start: ' + this.formatTime(start));
      this.drawHandle(ctx, startX, H - 18, '#22d3ee');

      this.drawVerticalMarker(ctx, endX, H - 18, '#f472b6', 'End: ' + this.formatTime(end), true);
      this.drawHandle(ctx, endX, H - 18, '#f472b6');
    } else if (mode === 'remove') {
      for (const cut of this.cuts()) {
        const cStartX = (cut.start / dur) * W;
        const cEndX = (cut.end / dur) * W;
        const cWidth = Math.max(1, cEndX - cStartX);
        const isSelected = this.activeCutId() === cut.id;

        ctx.fillStyle = isSelected ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.22)';
        ctx.fillRect(cStartX, 0, cWidth, H - 18);

        ctx.strokeStyle = isSelected ? '#f87171' : 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(cStartX, 1, cWidth, H - 20);
        ctx.setLineDash([]);

        this.drawVerticalMarker(ctx, cStartX, H - 18, '#ef4444', this.formatTime(cut.start));
        this.drawHandle(ctx, cStartX, H - 18, '#ef4444');

        this.drawVerticalMarker(ctx, cEndX, H - 18, '#f87171', this.formatTime(cut.end), true);
        this.drawHandle(ctx, cEndX, H - 18, '#f87171');
      }
    } else if (mode === 'split') {
      const allClips = this.clips();
      for (let i = 0; i < allClips.length; i++) {
        const clip = allClips[i];
        const cStartX = (clip.start / dur) * W;
        const cEndX = (clip.end / dur) * W;
        const cWidth = Math.max(1, cEndX - cStartX);
        const palette = clipPalette[i % clipPalette.length];
        const isSelected = this.activeClipId() === clip.id;

        ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.08)' : palette.fill;
        ctx.fillRect(cStartX, 0, cWidth, H - 18);

        if (i > 0) {
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cStartX, 0);
          ctx.lineTo(cStartX, H - 18);
          ctx.stroke();

          this.drawSplitHandle(ctx, cStartX, H - 18);
        }
      }
    }

    this.drawTimeRuler(ctx, W, H, dur);

    // Hover line
    const hover = this.hoverInfo();
    if (hover && !this.dragState) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hover.x, 0);
      ctx.lineTo(hover.x, H - 18);
      ctx.stroke();
    }

    // Playhead
    if (playhead >= 0) {
      const phX = (playhead / dur) * W;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(phX, 0);
      ctx.lineTo(phX, H);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(phX - 5, 0);
      ctx.lineTo(phX + 5, 0);
      ctx.lineTo(phX, 8);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawTimeRuler(ctx: CanvasRenderingContext2D, W: number, H: number, dur: number): void {
    const rulerY = H - 18;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, rulerY, W, 18);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerY);
    ctx.lineTo(W, rulerY);
    ctx.stroke();

    const pixelsPerSecond = W / dur;
    let step = 1;
    if (pixelsPerSecond < 10) step = 30;
    else if (pixelsPerSecond < 25) step = 10;
    else if (pixelsPerSecond < 60) step = 5;
    else if (pixelsPerSecond < 120) step = 2;
    else if (pixelsPerSecond < 300) step = 1;
    else step = 0.5;

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';

    for (let t = 0; t <= dur; t += step) {
      const x = (t / dur) * W;
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(x, rulerY);
      ctx.lineTo(x, rulerY + 4);
      ctx.stroke();

      if (x > 15 && x < W - 15) {
        ctx.fillText(this.formatTimeShort(t), x, rulerY + 13);
      }
    }
    ctx.textAlign = 'left';
  }

  private drawVerticalMarker(
    ctx: CanvasRenderingContext2D,
    x: number,
    H: number,
    color: string,
    label: string,
    alignRight: boolean = false,
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = '10px monospace';
    const textWidth = ctx.measureText(label).width;
    const textX = alignRight ? Math.max(0, x - textWidth - 4) : x + 4;
    ctx.fillText(label, textX, 12);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
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

  private drawHandle(ctx: CanvasRenderingContext2D, x: number, H: number, color: string): void {
    const hw = 12;
    const hh = 22;
    const hy = H / 2 - hh / 2;
    const r = 4;
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
  }

  private drawSplitHandle(ctx: CanvasRenderingContext2D, x: number, H: number): void {
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, H / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // ─── Canvas User Interaction ─────────────────────────────────────────────

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
    const thresh = this.getHandleThreshold();
    const mode = this.editMode();

    if (mode === 'trim') {
      const startX = (this.trimStart() / dur) * this.canvasWidth;
      const endX = (this.trimEnd() / dur) * this.canvasWidth;

      if (Math.abs(x - startX) < thresh) {
        this.dragState = { type: 'trim-start' };
        return;
      }
      if (Math.abs(x - endX) < thresh) {
        this.dragState = { type: 'trim-end' };
        return;
      }
    } else if (mode === 'remove') {
      for (const cut of this.cuts()) {
        const cStartX = (cut.start / dur) * this.canvasWidth;
        const cEndX = (cut.end / dur) * this.canvasWidth;

        if (Math.abs(x - cStartX) < thresh) {
          this.dragState = { type: 'cut-start', cutId: cut.id };
          this.activeCutId.set(cut.id);
          return;
        }
        if (Math.abs(x - cEndX) < thresh) {
          this.dragState = { type: 'cut-end', cutId: cut.id };
          this.activeCutId.set(cut.id);
          return;
        }
      }
    } else if (mode === 'split') {
      const allClips = this.clips();
      for (let i = 1; i < allClips.length; i++) {
        const splitX = (allClips[i].start / dur) * this.canvasWidth;
        if (Math.abs(x - splitX) < thresh) {
          this.dragState = { type: 'clip-boundary', clipIndex: i };
          return;
        }
      }
    }

    const clickRatio = Math.max(0, Math.min(1, x / this.canvasWidth));
    this.seekTo(clickRatio * dur);
  }

  private onMouseMove(e: MouseEvent): void {
    const canvas = this.waveformCanvas()?.nativeElement;
    if (!canvas || !this.waveformReady()) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(this.canvasWidth, e.clientX - rect.left));
    const dur = this.duration();
    const hoverTime = (x / this.canvasWidth) * dur;
    this.hoverInfo.set({ time: hoverTime, x });

    if (this.dragState) {
      e.preventDefault();
      this.applyDrag(x);
    }
  }

  private onMouseUp(): void {
    this.dragState = null;
  }

  private onTouchStart(e: TouchEvent): void {
    if (!this.waveformReady() || !e.touches[0]) return;
    const canvas = this.waveformCanvas()?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const dur = this.duration();
    const thresh = this.getHandleThreshold();
    const mode = this.editMode();

    if (mode === 'trim') {
      const startX = (this.trimStart() / dur) * this.canvasWidth;
      const endX = (this.trimEnd() / dur) * this.canvasWidth;

      if (Math.abs(x - startX) < thresh) {
        this.dragState = { type: 'trim-start' };
        return;
      }
      if (Math.abs(x - endX) < thresh) {
        this.dragState = { type: 'trim-end' };
        return;
      }
    }

    const clickRatio = Math.max(0, Math.min(1, x / this.canvasWidth));
    this.seekTo(clickRatio * dur);
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.dragState) return;
    const canvas = this.waveformCanvas()?.nativeElement;
    if (!canvas || !e.touches[0]) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(this.canvasWidth, e.touches[0].clientX - rect.left));
    this.applyDrag(x);
  }

  private applyDrag(x: number): void {
    const dur = this.duration();
    const ratio = Math.max(0, Math.min(1, x / this.canvasWidth));
    const time = ratio * dur;
    const minGap = 0.1;

    if (!this.dragState) return;

    if (this.dragState.type === 'trim-start') {
      this.trimStart.set(Math.min(time, this.trimEnd() - minGap));
    } else if (this.dragState.type === 'trim-end') {
      this.trimEnd.set(Math.max(time, this.trimStart() + minGap));
    } else if (this.dragState.type === 'cut-start' && this.dragState.cutId) {
      const cutId = this.dragState.cutId;
      this.cuts.update((list) =>
        list.map((c) =>
          c.id === cutId ? { ...c, start: Math.max(0, Math.min(time, c.end - minGap)) } : c,
        ),
      );
    } else if (this.dragState.type === 'cut-end' && this.dragState.cutId) {
      const cutId = this.dragState.cutId;
      this.cuts.update((list) =>
        list.map((c) =>
          c.id === cutId ? { ...c, end: Math.min(dur, Math.max(time, c.start + minGap)) } : c,
        ),
      );
    } else if (
      this.dragState.type === 'clip-boundary' &&
      this.dragState.clipIndex !== undefined
    ) {
      const idx = this.dragState.clipIndex;
      const allClips = [...this.clips()];
      if (idx > 0 && idx < allClips.length) {
        const prevClip = allClips[idx - 1];
        const nextClip = allClips[idx];
        const clampedTime = Math.max(
          prevClip.start + minGap,
          Math.min(nextClip.end - minGap, time),
        );
        prevClip.end = clampedTime;
        nextClip.start = clampedTime;
        this.clips.set(allClips);
      }
    }

    this.clearExportResults();
  }

  updateCursor(event: MouseEvent): void {
    if (!this.waveformReady()) return;
    const canvas = this.waveformCanvas()?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const dur = this.duration();
    const thresh = this.getHandleThreshold();
    const mode = this.editMode();

    let nearHandle = false;
    if (mode === 'trim') {
      const startX = (this.trimStart() / dur) * this.canvasWidth;
      const endX = (this.trimEnd() / dur) * this.canvasWidth;
      nearHandle = Math.abs(x - startX) < thresh || Math.abs(x - endX) < thresh;
    }

    canvas.style.cursor = this.dragState ? 'grabbing' : nearHandle ? 'col-resize' : 'pointer';
  }

  // ─── Playback Controls ───────────────────────────────────────────────────

  seekTo(seconds: number): void {
    const audio = this.audioEl()?.nativeElement;
    const clamped = Math.max(0, Math.min(this.duration(), seconds));
    this.currentTime.set(clamped);
    if (audio) {
      audio.currentTime = clamped;
    }
  }

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
    audio.currentTime = this.trimStart();
    audio.play();
    this.playing.set(true);
    this.startPlayheadLoop();
  }

  playClip(clip: AudioClip): void {
    const audio = this.audioEl()?.nativeElement;
    if (!audio || !this.fileUrl()) return;

    this.activeClipId.set(clip.id);
    if (audio.src !== this.fileUrl()) {
      audio.src = this.fileUrl()!;
    }
    audio.currentTime = clip.start;
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
      const pos = audio.currentTime;
      this.currentTime.set(pos);

      const container = this.waveformContainer()?.nativeElement;
      const dur = this.duration();
      if (container && this.canvasWidth > 0 && dur > 0 && this.zoom() > 1) {
        const phX = (pos / dur) * this.canvasWidth;
        const scrollLeft = container.scrollLeft;
        const clientWidth = container.clientWidth;
        if (phX > scrollLeft + clientWidth - 40 || phX < scrollLeft) {
          container.scrollLeft = Math.max(0, phX - clientWidth / 3);
        }
      }

      const mode = this.editMode();
      if (mode === 'trim') {
        if (pos >= this.trimEnd()) {
          audio.pause();
          this.playing.set(false);
          return;
        }
      } else if (mode === 'remove') {
        for (const cut of this.cuts()) {
          if (pos >= cut.start && pos < cut.end) {
            audio.currentTime = cut.end;
            this.currentTime.set(cut.end);
            break;
          }
        }
        if (pos >= this.duration()) {
          audio.pause();
          this.playing.set(false);
          return;
        }
      } else if (mode === 'split') {
        const activeId = this.activeClipId();
        if (activeId) {
          const clip = this.clips().find((c) => c.id === activeId);
          if (clip && pos >= clip.end) {
            audio.pause();
            this.playing.set(false);
            return;
          }
        }
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

  // ─── Cut / Clip Actions ──────────────────────────────────────────────────

  addCutAtPlayhead(): void {
    const dur = this.duration();
    if (dur <= 0) return;

    const playhead = this.currentTime();
    const cutStart = Math.max(0, Math.min(dur - 0.2, playhead));
    const cutEnd = Math.min(dur, cutStart + Math.min(3, dur - cutStart));

    if (cutEnd > cutStart) {
      const newCut: AudioCut = {
        id: 'cut-' + Date.now(),
        start: Math.round(cutStart * 100) / 100,
        end: Math.round(cutEnd * 100) / 100,
      };
      this.cuts.update((list) => [...list, newCut]);
      this.activeCutId.set(newCut.id);
      this.clearExportResults();
      this.toastService.info({ message: 'Added cut region at playhead.' });
    }
  }

  removeCut(id: string): void {
    this.cuts.update((list) => list.filter((c) => c.id !== id));
    if (this.activeCutId() === id) {
      this.activeCutId.set(null);
    }
    this.clearExportResults();
  }

  updateCutValue(id: string, field: 'start' | 'end', val: number): void {
    const dur = this.duration();
    const clamped = Math.max(0, Math.min(dur, val));

    this.cuts.update((list) =>
      list.map((c) => {
        if (c.id !== id) return c;
        if (field === 'start') {
          return { ...c, start: Math.min(clamped, c.end - 0.05) };
        } else {
          return { ...c, end: Math.max(clamped, c.start + 0.05) };
        }
      }),
    );
    this.clearExportResults();
  }

  splitAtPlayhead(): void {
    const dur = this.duration();
    const playhead = this.currentTime();
    if (dur <= 0 || playhead <= 0.1 || playhead >= dur - 0.1) return;

    const allClips = [...this.clips()];
    const targetIdx = allClips.findIndex(
      (c) => playhead > c.start + 0.1 && playhead < c.end - 0.1,
    );

    if (targetIdx >= 0) {
      const targetClip = allClips[targetIdx];
      const splitTime = Math.round(playhead * 100) / 100;

      const firstPart: AudioClip = {
        id: targetClip.id,
        name: targetClip.name || `Clip ${targetIdx + 1}`,
        start: targetClip.start,
        end: splitTime,
      };

      const secondPart: AudioClip = {
        id: 'clip-' + Date.now(),
        name: `Clip ${targetIdx + 2}`,
        start: splitTime,
        end: targetClip.end,
      };

      allClips.splice(targetIdx, 1, firstPart, secondPart);
      this.clips.set(allClips);
      this.activeClipId.set(secondPart.id);
      this.clearExportResults();
      this.toastService.success({ message: `Split audio into ${allClips.length} clips.` });
    }
  }

  removeClip(id: string): void {
    const allClips = [...this.clips()];
    if (allClips.length <= 1) return;

    const idx = allClips.findIndex((c) => c.id === id);
    if (idx >= 0) {
      if (idx === 0) {
        allClips[1].start = 0;
      } else {
        allClips[idx - 1].end = allClips[idx].end;
      }
      allClips.splice(idx, 1);
      this.clips.set(allClips);
      this.clearExportResults();
    }
  }

  updateClipName(id: string, name: string): void {
    this.clips.update((list) =>
      list.map((c) => (c.id === id ? { ...c, name } : c)),
    );
  }

  resetClips(): void {
    const dur = this.duration();
    this.clips.set([{ id: 'clip-1', name: 'Clip 1', start: 0, end: dur }]);
    this.clearExportResults();
  }

  resetTrim(): void {
    this.trimStart.set(0);
    this.trimEnd.set(this.duration());
    this.clearExportResults();
  }

  // ─── Zoom Controls (1x to 32x) ───────────────────────────────────────────

  zoomIn(): void {
    const current = this.zoom();
    const delta = current >= 16 ? 4 : current >= 8 ? 2 : current >= 4 ? 1 : 0.5;
    this.zoom.set(Math.min(32, Math.round((current + delta) * 10) / 10));
  }

  zoomOut(): void {
    const current = this.zoom();
    const delta = current > 16 ? 4 : current > 8 ? 2 : current > 4 ? 1 : 0.5;
    this.zoom.set(Math.max(1, Math.round((current - delta) * 10) / 10));
  }

  setZoom(level: number): void {
    this.zoom.set(Math.max(1, Math.min(32, level)));
  }

  resetZoom(): void {
    this.zoom.set(1);
    const container = this.waveformContainer()?.nativeElement;
    if (container) container.scrollLeft = 0;
  }

  onTimelineWheel(event: WheelEvent): void {
    event.preventDefault();
    const current = this.zoom();
    const isZoomIn = event.deltaY < 0;
    const delta = isZoomIn
      ? (current >= 16 ? 2 : current >= 6 ? 1 : 0.5)
      : (current > 16 ? -2 : current > 6 ? -1 : -0.5);

    this.zoom.set(Math.max(1, Math.min(32, Math.round((current + delta) * 10) / 10)));
  }

  // ─── Drag & Drop to replace current audio ────────────────────────────────

  onSingleTrackDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onSingleTrackDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac|m4a|wma|opus)$/i.test(file.name)) {
        this.onFileSelected(file);
      } else {
        this.toastService.warning({ message: `File "${file.name}" is not a supported audio format.` });
      }
    }
  }

  // ─── Export Operations ───────────────────────────────────────────────────

  async handleExport(): Promise<void> {
    const f = this.file();
    if (!f) return;

    this.exporting.set(true);
    this.progress.set(0);
    this.clearExportResults();

    try {
      const mode = this.editMode();
      if (mode === 'trim') {
        const res = await this.audioExport.exportTrim(
          f,
          this.trimStart(),
          this.trimEnd(),
          this.targetFormat(),
          this.bitrate(),
          this.sampleRate(),
          (step) => this.currentExportStep.set(step),
        );
        this.outputBlob.set(res.blob);
        this.outputUrl.set(URL.createObjectURL(res.blob));
        this.outputFileName.set(res.fileName);
        this.toastService.success({ message: 'Trimmed audio exported successfully!' });
      } else if (mode === 'remove') {
        const res = await this.audioExport.exportRemove(
          f,
          this.keptIntervals(),
          this.targetFormat(),
          this.bitrate(),
          this.sampleRate(),
          (step) => this.currentExportStep.set(step),
        );
        this.outputBlob.set(res.blob);
        this.outputUrl.set(URL.createObjectURL(res.blob));
        this.outputFileName.set(res.fileName);
        this.toastService.success({ message: 'Spliced audio exported successfully!' });
      } else if (mode === 'split') {
        const res = await this.audioExport.exportSplit(
          f,
          this.clips(),
          this.targetFormat(),
          this.bitrate(),
          this.sampleRate(),
          (step) => this.currentExportStep.set(step),
        );
        this.exportedClips.set(res.exportedClips);
        if (res.zipBlob) {
          this.zipBlob.set(res.zipBlob);
          this.zipUrl.set(URL.createObjectURL(res.zipBlob));
          this.zipFileName.set(res.zipFileName || 'clips.zip');
        }
        this.toastService.success({ message: `Exported ${res.exportedClips.length} clips!` });
      }
    } catch (err: any) {
      console.error(err);
      this.toastService.error({ message: `Export failed: ${err?.message || err}` });
    } finally {
      this.exporting.set(false);
      this.currentExportStep.set('');
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

  handleDownloadClip(clip: ExportedClip): void {
    const a = document.createElement('a');
    a.href = clip.url;
    a.download = clip.name;
    a.click();
  }

  handleDownloadZip(): void {
    const url = this.zipUrl();
    const name = this.zipFileName();
    if (!url || !name) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '0:00.0';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
  }

  formatTimeShort(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 0) {
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return `${s}s`;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
