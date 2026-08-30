import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser, NgClass, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import {
  AUDIO_FORMATS,
  AudioFormat,
  AudioTrack,
  TimelineClip,
} from '../../audio-editor.schema';
import { AudioEngineService } from '../../services/audio-engine.service';
import { AudioExportService } from '../../services/audio-export.service';
import { ToastService } from '@/app/services/toast.service';
import { ClipBlockComponent } from './clip-block/clip-block.component';
import { ClipInspectorComponent } from './clip-inspector/clip-inspector.component';

interface DragState {
  type:
    | 'timeline-clip-move'
    | 'timeline-clip-left'
    | 'timeline-clip-right'
    | 'clip-fade-in'
    | 'clip-fade-out';
  clipId: string;
  startX: number;
  initialOffset: number;
  initialTrimStart: number;
  initialTrimEnd: number;
  initialFadeIn?: number;
  initialFadeOut?: number;
}

@Component({
  selector: 'app-multi-track-studio',
  imports: [
    LucideIconComponent,
    NgClass,
    FormsModule,
    ClipBlockComponent,
    ClipInspectorComponent,
  ],
  templateUrl: './multi-track-studio.component.html',
  styleUrl: './multi-track-studio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiTrackStudioComponent implements OnDestroy {
  protected readonly Math = Math;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly audioEngine = inject(AudioEngineService);
  private readonly audioExport = inject(AudioExportService);
  private readonly toastService = inject(ToastService);

  readonly timelineContainer =
    viewChild<ElementRef<HTMLDivElement>>('timelineContainer');

  // Inputs / Models
  readonly tracks = model.required<AudioTrack[]>();
  readonly timelineClips = model.required<TimelineClip[]>();
  readonly selectedClipId = model<string | null>(null);
  readonly masterVolume = model<number>(1);
  readonly zoom = model<number>(1);
  readonly activeTool = model<'pointer' | 'razor'>('pointer');
  readonly targetFormat = model<AudioFormat>('mp3');
  readonly bitrate = model<number>(192);
  readonly sampleRate = model<number>(44100);

  // Outputs
  readonly exportStarted = output<void>();
  readonly exportFinished = output<{ blob: Blob; fileName: string }>();

  // State
  readonly formats = AUDIO_FORMATS;
  readonly timelineCurrentTime = signal<number>(0);
  readonly timelinePlaying = signal<boolean>(false);
  readonly isDraggingClip = signal<boolean>(false);
  readonly draggingOverTrackId = signal<string | null>(null);
  readonly exporting = signal<boolean>(false);
  readonly progress = signal<number>(0);
  readonly currentExportStep = signal<string>('');
  readonly outputBlob = signal<Blob | undefined>(undefined);
  readonly outputUrl = signal<string | undefined>(undefined);
  readonly outputFileName = signal<string>('');

  private animationFrameId: number | null = null;
  private dragState: DragState | null = null;

  readonly timelineTotalDuration = computed(() => {
    const allClips = this.timelineClips();
    if (allClips.length === 0) return 30;
    const maxEnd = allClips.reduce((max, c) => {
      const clipEffectiveDur = Math.max(0, c.trimEnd - c.trimStart);
      return Math.max(max, c.timelineOffset + clipEffectiveDur);
    }, 0);
    return Math.max(30, Math.ceil(maxEnd + 5));
  });

  readonly selectedClip = computed(() => {
    const id = this.selectedClipId();
    if (!id) return null;
    return this.timelineClips().find((c) => c.id === id) || null;
  });

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.audioEngine.stopMultiTrackPlayback();
    const url = this.outputUrl();
    if (url) URL.revokeObjectURL(url);
  }

  // ─── Playback Controls ───────────────────────────────────────────────────

  togglePlay(): void {
    if (this.timelinePlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  async play(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.audioEngine.startMultiTrackPlayback(
      this.timelineClips(),
      this.tracks(),
      this.timelineCurrentTime(),
      this.masterVolume(),
    );
    this.timelinePlaying.set(true);
    this.startPlayheadLoop();
  }

  pause(): void {
    this.timelinePlaying.set(false);
    this.audioEngine.stopMultiTrackPlayback();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  stop(): void {
    this.pause();
    this.timelineCurrentTime.set(0);
  }

  seek(seconds: number): void {
    const clamped = Math.max(0, Math.min(this.timelineTotalDuration(), seconds));
    this.timelineCurrentTime.set(clamped);
    if (this.timelinePlaying()) {
      this.play();
    }
  }

  private startPlayheadLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const loop = () => {
      if (!this.timelinePlaying()) return;
      const currentPos = this.audioEngine.getCurrentMultiTrackTime();
      this.timelineCurrentTime.set(currentPos);

      const container = this.timelineContainer()?.nativeElement;
      const dur = this.timelineTotalDuration();
      if (container && dur > 0 && this.zoom() > 1) {
        const totalW = container.scrollWidth;
        const phX = (currentPos / dur) * totalW;
        const scrollLeft = container.scrollLeft;
        const clientWidth = container.clientWidth;
        if (phX > scrollLeft + clientWidth - 60 || phX < scrollLeft) {
          container.scrollLeft = Math.max(0, phX - clientWidth / 3);
        }
      }

      if (currentPos >= this.timelineTotalDuration()) {
        this.pause();
        this.timelineCurrentTime.set(0);
        return;
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
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
    const tlContainer = this.timelineContainer()?.nativeElement;
    if (tlContainer) tlContainer.scrollLeft = 0;
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

  // ─── Track Management ────────────────────────────────────────────────────

  addTrack(name?: string): void {
    const num = this.tracks().length + 1;
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6'];
    const color = colors[(num - 1) % colors.length];
    const newTrack: AudioTrack = {
      id: 'track-' + Date.now(),
      name: name || `Track ${num}`,
      volume: 1,
      muted: false,
      solo: false,
      color,
    };
    this.tracks.update((t) => [...t, newTrack]);
  }

  removeTrack(trackId: string): void {
    if (this.tracks().length <= 1) {
      this.toastService.warning({ message: 'Must have at least one track.' });
      return;
    }
    this.tracks.update((t) => t.filter((item) => item.id !== trackId));
    this.timelineClips.update((c) => c.filter((item) => item.trackId !== trackId));
    if (this.selectedClip()?.trackId === trackId) {
      this.selectedClipId.set(null);
    }
    this.clearExportResult();
  }

  toggleTrackMute(trackId: string): void {
    this.tracks.update((t) =>
      t.map((item) => (item.id === trackId ? { ...item, muted: !item.muted } : item)),
    );
  }

  toggleTrackSolo(trackId: string): void {
    this.tracks.update((t) =>
      t.map((item) => (item.id === trackId ? { ...item, solo: !item.solo } : item)),
    );
  }

  setTrackVolume(trackId: string, volume: number): void {
    this.tracks.update((t) =>
      t.map((item) => (item.id === trackId ? { ...item, volume: Math.max(0, Math.min(1.5, volume)) } : item)),
    );
  }

  setTrackName(trackId: string, name: string): void {
    this.tracks.update((t) =>
      t.map((item) => (item.id === trackId ? { ...item, name } : item)),
    );
  }

  async onAddClipFileSelected(trackId: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    await this.addClipToTrack(trackId, file);
    input.value = '';
  }

  async addClipToTrack(trackId: string, file: File, atOffset?: number): Promise<void> {
    try {
      const buffer = await this.audioEngine.decodeAudio(file);
      const peaks = this.audioEngine.extractDynamicPeaks(buffer, 0, buffer.duration, 400);
      const clipOffset = atOffset !== undefined ? atOffset : this.findNextAvailableOffset(trackId);

      const newClip: TimelineClip = {
        id: 'tclip-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        trackId,
        name: file.name.replace(/\.[^/.]+$/, ''),
        file,
        fileUrl: URL.createObjectURL(file),
        audioBuffer: buffer,
        duration: buffer.duration,
        timelineOffset: Math.max(0, Math.round(clipOffset * 10) / 10),
        trimStart: 0,
        trimEnd: buffer.duration,
        volume: 1,
        fadeIn: 0,
        fadeOut: 0,
        waveformPeaks: peaks,
      };

      this.timelineClips.update((c) => [...c, newClip]);
      this.selectedClipId.set(newClip.id);
      this.clearExportResult();
      this.toastService.success({ message: `Added "${file.name}" to track.` });
    } catch (err: any) {
      console.error(err);
      this.toastService.error({ message: `Failed to load audio: ${err?.message || err}` });
    }
  }

  private findNextAvailableOffset(trackId: string): number {
    const trackClips = this.timelineClips().filter((c) => c.trackId === trackId);
    if (trackClips.length === 0) return 0;
    const maxEnd = trackClips.reduce(
      (max, c) => Math.max(max, c.timelineOffset + (c.trimEnd - c.trimStart)),
      0,
    );
    return Math.round((maxEnd + 0.5) * 10) / 10;
  }

  // ─── File Drag & Drop onto Track Lanes ───────────────────────────────────

  onTrackDragOver(trackId: string, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.draggingOverTrackId.set(trackId);
  }

  onTrackDragLeave(trackId: string, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.draggingOverTrackId() === trackId) {
      this.draggingOverTrackId.set(null);
    }
  }

  async onTrackDrop(trackId: string, event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.draggingOverTrackId.set(null);

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const laneEl = event.currentTarget as HTMLElement;
    const rect = laneEl.getBoundingClientRect();
    const scrollLeft = laneEl.scrollLeft || 0;
    const totalW = laneEl.scrollWidth || laneEl.clientWidth || 1;
    const dropX = Math.max(0, event.clientX - rect.left + scrollLeft);
    const dropTime = (dropX / totalW) * this.timelineTotalDuration();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac|m4a|wma|opus)$/i.test(file.name)) {
        await this.addClipToTrack(trackId, file, dropTime + i * 2);
      } else {
        this.toastService.warning({
          message: `File "${file.name}" is not a supported audio format.`,
        });
      }
    }
  }

  // ─── Clip Drag, Movement & Razor Tool ────────────────────────────────────

  onClipClick(clip: TimelineClip, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeTool() === 'razor') {
      const container = this.timelineContainer()?.nativeElement;
      if (!container) return;
      const totalW = container.scrollWidth || container.clientWidth;
      const dur = this.timelineTotalDuration();
      const rect = container.getBoundingClientRect();
      const clickX = event.clientX - rect.left + container.scrollLeft;
      const clickTime = (clickX / totalW) * dur;
      this.splitClipAtTimestamp(clip.id, clickTime);
    } else {
      this.selectedClipId.set(clip.id);
    }
  }

  splitClipAtTimestamp(clipId: string, splitTime: number): void {
    const clip = this.timelineClips().find((c) => c.id === clipId);
    if (!clip) return;

    const offsetIntoClip = splitTime - clip.timelineOffset;
    const effectiveDur = clip.trimEnd - clip.trimStart;

    if (offsetIntoClip <= 0.1 || offsetIntoClip >= effectiveDur - 0.1) {
      this.toastService.warning({ message: 'Click further inside the clip to split.' });
      return;
    }

    const splitPointInSource = clip.trimStart + offsetIntoClip;

    const firstPart: TimelineClip = {
      ...clip,
      id: clip.id,
      name: clip.name,
      trimEnd: splitPointInSource,
      fadeOut: 0,
    };

    const secondPart: TimelineClip = {
      ...clip,
      id: 'tclip-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: `${clip.name} (Part 2)`,
      timelineOffset: splitTime,
      trimStart: splitPointInSource,
      fadeIn: 0,
    };

    this.timelineClips.update((list) =>
      list.map((c) => (c.id === clip.id ? firstPart : c)).concat([secondPart]),
    );
    this.selectedClipId.set(secondPart.id);
    this.clearExportResult();
    this.toastService.success({
      message: `Cut "${clip.name}" at ${this.formatTime(splitTime)}.`,
    });
  }

  splitSelectedClipAtPlayhead(): void {
    const clip = this.selectedClip();
    const playhead = this.timelineCurrentTime();
    if (!clip) {
      this.toastService.warning({ message: 'Select a clip to split first.' });
      return;
    }

    const clipStart = clip.timelineOffset;
    const clipEnd = clipStart + (clip.trimEnd - clip.trimStart);

    if (playhead <= clipStart + 0.1 || playhead >= clipEnd - 0.1) {
      this.toastService.warning({
        message: 'Move playhead inside the selected clip to split.',
      });
      return;
    }

    this.splitClipAtTimestamp(clip.id, playhead);
  }

  onTimelineClipMouseDown(
    clipId: string,
    event: MouseEvent,
    type:
      | 'timeline-clip-move'
      | 'timeline-clip-left'
      | 'timeline-clip-right'
      | 'clip-fade-in'
      | 'clip-fade-out',
  ): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.activeTool() === 'razor') return;

    this.selectedClipId.set(clipId);
    const clip = this.timelineClips().find((c) => c.id === clipId);
    if (!clip) return;

    this.dragState = {
      type,
      clipId,
      startX: event.clientX,
      initialOffset: clip.timelineOffset,
      initialTrimStart: clip.trimStart,
      initialTrimEnd: clip.trimEnd,
      initialFadeIn: clip.fadeIn,
      initialFadeOut: clip.fadeOut,
    };
    this.isDraggingClip.set(true);

    const onMouseMove = (e: MouseEvent) => this.onTimelineMouseMove(e);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      this.dragState = null;
      this.isDraggingClip.set(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  private onTimelineMouseMove(e: MouseEvent): void {
    if (!this.dragState || !this.dragState.clipId) return;
    e.preventDefault();

    const container = this.timelineContainer()?.nativeElement;
    if (!container) return;

    const totalW = container.scrollWidth || container.clientWidth;
    const dur = this.timelineTotalDuration();
    const pxPerSec = totalW / dur;

    const deltaX = e.clientX - (this.dragState.startX || 0);
    const deltaSec = deltaX / pxPerSec;
    const clipId = this.dragState.clipId;

    if (this.dragState.type === 'timeline-clip-move') {
      const newOffset = Math.max(0, (this.dragState.initialOffset || 0) + deltaSec);
      
      const elUnderCursor = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-track-id]');
      const targetTrackId = elUnderCursor?.getAttribute('data-track-id');

      this.timelineClips.update((list) =>
        list.map((c) => {
          if (c.id !== clipId) return c;
          const updatedTrackId = targetTrackId && targetTrackId !== c.trackId ? targetTrackId : c.trackId;
          return {
            ...c,
            trackId: updatedTrackId,
            timelineOffset: Math.round(newOffset * 10) / 10,
          };
        }),
      );
    } else if (this.dragState.type === 'timeline-clip-left') {
      const initTrimStart = this.dragState.initialTrimStart || 0;
      const initOffset = this.dragState.initialOffset || 0;
      const clip = this.timelineClips().find((c) => c.id === clipId);
      if (!clip) return;

      const newTrimStart = Math.max(0, Math.min(clip.trimEnd - 0.2, initTrimStart + deltaSec));
      const deltaTrim = newTrimStart - initTrimStart;
      const newOffset = Math.max(0, initOffset + deltaTrim);

      this.timelineClips.update((list) =>
        list.map((c) => (c.id === clipId ? { ...c, trimStart: newTrimStart, timelineOffset: newOffset } : c)),
      );
    } else if (this.dragState.type === 'timeline-clip-right') {
      const initTrimEnd = this.dragState.initialTrimEnd || 0;
      const clip = this.timelineClips().find((c) => c.id === clipId);
      if (!clip) return;

      const newTrimEnd = Math.min(clip.duration, Math.max(clip.trimStart + 0.2, initTrimEnd + deltaSec));
      this.timelineClips.update((list) =>
        list.map((c) => (c.id === clipId ? { ...c, trimEnd: newTrimEnd } : c)),
      );
    } else if (this.dragState.type === 'clip-fade-in') {
      const clip = this.timelineClips().find((c) => c.id === clipId);
      if (!clip) return;
      const maxFade = (clip.trimEnd - clip.trimStart) / 2;
      const newFadeIn = Math.max(0, Math.min(maxFade, (this.dragState.initialFadeIn || 0) + deltaSec));

      this.timelineClips.update((list) =>
        list.map((c) => (c.id === clipId ? { ...c, fadeIn: Math.round(newFadeIn * 100) / 100 } : c)),
      );
    } else if (this.dragState.type === 'clip-fade-out') {
      const clip = this.timelineClips().find((c) => c.id === clipId);
      if (!clip) return;
      const maxFade = (clip.trimEnd - clip.trimStart) / 2;
      const newFadeOut = Math.max(0, Math.min(maxFade, (this.dragState.initialFadeOut || 0) - deltaSec));

      this.timelineClips.update((list) =>
        list.map((c) => (c.id === clipId ? { ...c, fadeOut: Math.round(newFadeOut * 100) / 100 } : c)),
      );
    }

    this.clearExportResult();
  }

  // ─── Selected Clip Inspector Actions ─────────────────────────────────────

  onInspectorNameChange(clipId: string, name: string): void {
    this.timelineClips.update((list) =>
      list.map((c) => (c.id === clipId ? { ...c, name } : c)),
    );
  }

  onInspectorTrackChange(clipId: string, trackId: string): void {
    this.timelineClips.update((list) =>
      list.map((c) => (c.id === clipId ? { ...c, trackId } : c)),
    );
    this.clearExportResult();
  }

  onInspectorOffsetChange(clipId: string, offset: number): void {
    this.timelineClips.update((list) =>
      list.map((c) => (c.id === clipId ? { ...c, timelineOffset: offset } : c)),
    );
    this.clearExportResult();
  }

  onInspectorVolumeChange(clipId: string, volume: number): void {
    this.timelineClips.update((list) =>
      list.map((c) => (c.id === clipId ? { ...c, volume } : c)),
    );
    this.clearExportResult();
  }

  onInspectorFadeChange(clipId: string, field: 'fadeIn' | 'fadeOut', val: number): void {
    this.timelineClips.update((list) =>
      list.map((c) => {
        if (c.id !== clipId) return c;
        const maxFade = (c.trimEnd - c.trimStart) / 2;
        const clamped = Math.max(0, Math.min(maxFade, val));
        return { ...c, [field]: clamped };
      }),
    );
    this.clearExportResult();
  }

  onInspectorDuplicate(): void {
    const clip = this.selectedClip();
    if (!clip) return;
    const dur = clip.trimEnd - clip.trimStart;
    const duplicated: TimelineClip = {
      ...clip,
      id: 'tclip-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: `${clip.name} (Copy)`,
      timelineOffset: Math.round((clip.timelineOffset + dur + 0.5) * 10) / 10,
    };
    this.timelineClips.update((list) => [...list, duplicated]);
    this.selectedClipId.set(duplicated.id);
    this.clearExportResult();
    this.toastService.success({ message: 'Clip duplicated.' });
  }

  onInspectorDelete(): void {
    const clip = this.selectedClip();
    if (!clip) return;
    this.timelineClips.update((list) => list.filter((c) => c.id !== clip.id));
    this.selectedClipId.set(null);
    this.clearExportResult();
    this.toastService.info({ message: `Deleted clip "${clip.name}".` });
  }

  applyCrossfadeWithPrevious(): void {
    const clip = this.selectedClip();
    if (!clip) return;

    const sameTrackClips = this.timelineClips()
      .filter((c) => c.trackId === clip.trackId && c.id !== clip.id)
      .sort((a, b) => a.timelineOffset - b.timelineOffset);

    const prevClip = sameTrackClips
      .filter((c) => c.timelineOffset < clip.timelineOffset)
      .pop();

    if (!prevClip) {
      this.toastService.warning({
        message: 'No previous clip found on this track to crossfade with.',
      });
      return;
    }

    const prevEnd = prevClip.timelineOffset + (prevClip.trimEnd - prevClip.trimStart);
    const fadeDuration = 2.0;

    const newOffset = Math.max(0, prevEnd - fadeDuration);
    this.timelineClips.update((list) =>
      list.map((c) => {
        if (c.id === prevClip.id) {
          return { ...c, fadeOut: fadeDuration };
        }
        if (c.id === clip.id) {
          return { ...c, timelineOffset: newOffset, fadeIn: fadeDuration };
        }
        return c;
      }),
    );

    this.clearExportResult();
    this.toastService.success({
      message: `Applied ${fadeDuration}s crossfade between "${prevClip.name}" and "${clip.name}".`,
    });
  }

  // ─── Export Master Mix ───────────────────────────────────────────────────

  async handleExportMaster(): Promise<void> {
    if (this.timelineClips().length === 0) {
      this.toastService.warning({ message: 'Add at least one audio clip to the timeline.' });
      return;
    }

    this.exporting.set(true);
    this.progress.set(0);
    this.clearExportResult();
    this.exportStarted.emit();

    try {
      const result = await this.audioExport.exportMultiTrackMaster(
        this.timelineClips(),
        this.tracks(),
        this.masterVolume(),
        this.targetFormat(),
        this.bitrate(),
        this.sampleRate(),
        (step) => this.currentExportStep.set(step),
      );

      this.outputBlob.set(result.blob);
      this.outputUrl.set(URL.createObjectURL(result.blob));
      this.outputFileName.set(result.fileName);
      this.exportFinished.emit(result);
      this.toastService.success({ message: 'Master Mixdown exported successfully!' });
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

  private clearExportResult(): void {
    const url = this.outputUrl();
    if (url) URL.revokeObjectURL(url);
    this.outputBlob.set(undefined);
    this.outputUrl.set(undefined);
    this.outputFileName.set('');
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
