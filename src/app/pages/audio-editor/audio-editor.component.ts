import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '@/app/components/footer/footer.component';
import { MetadataService } from '@/app/services/metadata.service';
import {
  AudioEditMode,
  AudioFormat,
  AudioSchema,
  AudioTrack,
  TimelineClip,
} from './audio-editor.schema';
import { SingleTrackEditorComponent } from './components/single-track/single-track-editor.component';
import { MultiTrackStudioComponent } from './components/multi-track/multi-track-studio.component';
import { AudioExportService } from './services/audio-export.service';

@Component({
  selector: 'app-audio-editor',
  imports: [
    LucideIconComponent,
    NgClass,
    FormsModule,
    TopNavbarComponent,
    FooterComponent,
    SingleTrackEditorComponent,
    MultiTrackStudioComponent,
  ],
  templateUrl: './audio-editor.component.html',
  styleUrl: './audio-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AudioEditorComponent {
  private readonly metadataService = inject(MetadataService);
  readonly audioExport = inject(AudioExportService);

  readonly singleTrackEditor =
    viewChild<SingleTrackEditorComponent>('singleEditor');
  readonly multiTrackStudio =
    viewChild<MultiTrackStudioComponent>('multiStudio');

  // ─── Mode & Shared State ─────────────────────────────────────────────────
  readonly editMode = signal<AudioEditMode>('trim');
  readonly targetFormat = signal<AudioFormat>('mp3');
  readonly bitrate = signal<number>(192);
  readonly sampleRate = signal<number>(44100);
  readonly trimStart = signal<number>(0);
  readonly trimEnd = signal<number>(0);
  readonly zoom = signal<number>(1);
  readonly showLogs = signal<boolean>(false);

  // Multi-Track Studio state
  readonly tracks = signal<AudioTrack[]>([
    { id: 'track-1', name: 'Track 1 (Voice)', volume: 1, muted: false, solo: false, color: '#6366f1' },
    { id: 'track-2', name: 'Track 2 (Music / FX)', volume: 0.75, muted: false, solo: false, color: '#10b981' },
  ]);
  readonly timelineClips = signal<TimelineClip[]>([]);
  readonly selectedClipId = signal<string | null>(null);
  readonly masterVolume = signal<number>(1);
  readonly activeTool = signal<'pointer' | 'razor'>('pointer');

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Multi-Track Audio Editor & Studio',
      description:
        'Trim, cut out parts, split into clips, layer multiple tracks, and connect clips with smooth crossfades — 100% private, processed in your browser with WebAssembly.',
      updateCanonical: true,
    });
  }

  setEditMode(mode: AudioEditMode): void {
    if (this.editMode() === 'multitrack') {
      this.multiTrackStudio()?.pause();
    } else {
      const single = this.singleTrackEditor();
      if (single?.playing()) single.togglePlay();
    }

    this.editMode.set(mode);
  }

  // ─── Global Keyboard Shortcuts (Space, S to Split, Delete/Supr to Remove) ──
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    const activeTag = (document.activeElement?.tagName || '').toLowerCase();
    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      if (this.editMode() === 'multitrack') {
        this.multiTrackStudio()?.togglePlay();
      } else {
        this.singleTrackEditor()?.togglePlay();
      }
    } else if (event.key === 's' || event.key === 'S') {
      if (this.editMode() === 'multitrack') {
        this.multiTrackStudio()?.splitSelectedClipAtPlayhead();
      } else if (this.editMode() === 'split') {
        this.singleTrackEditor()?.splitAtPlayhead();
      }
    } else if (event.key === 'Delete' || event.key === 'Backspace' || event.code === 'Delete') {
      if (this.editMode() === 'multitrack') {
        event.preventDefault();
        this.multiTrackStudio()?.onInspectorDelete();
      } else if (this.editMode() === 'remove') {
        const single = this.singleTrackEditor();
        const cutId = single?.activeCutId();
        if (cutId) {
          event.preventDefault();
          single?.removeCut(cutId);
        }
      }
    }
  }
}
