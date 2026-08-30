import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { TimelineClip, AudioTrack } from '../../../audio-editor.schema';
import { AudioEngineService } from '../../../services/audio-engine.service';

@Component({
  selector: 'app-clip-block',
  imports: [NgClass],
  templateUrl: './clip-block.component.html',
  styleUrl: './clip-block.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClipBlockComponent {
  private readonly audioEngine = inject(AudioEngineService);

  readonly clip = input.required<TimelineClip>();
  readonly track = input.required<AudioTrack>();
  readonly totalTimelineDuration = input.required<number>();
  readonly isSelected = input<boolean>(false);
  readonly activeTool = input<'pointer' | 'razor'>('pointer');
  readonly isDragging = input<boolean>(false);
  readonly zoom = input<number>(1);

  readonly onClipClick = output<{ clip: TimelineClip; event: MouseEvent }>();
  readonly onClipMouseDown = output<{
    clipId: string;
    event: MouseEvent;
    type:
      | 'timeline-clip-move'
      | 'timeline-clip-left'
      | 'timeline-clip-right'
      | 'clip-fade-in'
      | 'clip-fade-out';
  }>();

  // Dynamic sample-accurate mirror bars SVG path
  readonly waveformSvgPath = computed(() => {
    const c = this.clip();
    if (!c.audioBuffer) return '';

    const dur = this.totalTimelineDuration();
    const clipDur = Math.max(0.01, c.trimEnd - c.trimStart);
    const clipRatio = clipDur / dur;
    const estimatedWidthPx = clipRatio * 1200 * this.zoom();
    const numBars = Math.max(50, Math.min(300, Math.round(estimatedWidthPx / 4)));

    const peaks = this.audioEngine.extractDynamicPeaks(
      c.audioBuffer,
      c.trimStart,
      c.trimEnd,
      numBars,
    );

    return this.audioEngine.generateMirrorBarsSvgPath(peaks, 100, 40);
  });

  readonly leftPercent = computed(() => {
    const dur = this.totalTimelineDuration();
    if (dur <= 0) return 0;
    return (this.clip().timelineOffset / dur) * 100;
  });

  readonly widthPercent = computed(() => {
    const dur = this.totalTimelineDuration();
    if (dur <= 0) return 0;
    const clipDur = Math.max(0, this.clip().trimEnd - this.clip().trimStart);
    return (clipDur / dur) * 100;
  });

  readonly fadeInWidthPercent = computed(() => {
    const c = this.clip();
    const clipDur = Math.max(0.01, c.trimEnd - c.trimStart);
    return Math.min(100, (c.fadeIn / clipDur) * 100);
  });

  readonly fadeOutWidthPercent = computed(() => {
    const c = this.clip();
    const clipDur = Math.max(0.01, c.trimEnd - c.trimStart);
    return Math.min(100, (c.fadeOut / clipDur) * 100);
  });

  formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '0:00.0';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
  }

  handleClick(event: MouseEvent): void {
    this.onClipClick.emit({ clip: this.clip(), event });
  }

  handleMouseDown(
    type:
      | 'timeline-clip-move'
      | 'timeline-clip-left'
      | 'timeline-clip-right'
      | 'clip-fade-in'
      | 'clip-fade-out',
    event: MouseEvent,
  ): void {
    this.onClipMouseDown.emit({ clipId: this.clip().id, event, type });
  }

  handleFadeMouseDown(
    type: 'clip-fade-in' | 'clip-fade-out',
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.onClipMouseDown.emit({ clipId: this.clip().id, event, type });
  }
}
