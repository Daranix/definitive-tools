import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { I18nService } from '@/app/i18n/i18n.service';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { AudioTrack, TimelineClip } from '../../../audio-editor.schema';

@Component({
  selector: 'app-clip-inspector',
  imports: [LucideIconComponent, FormsModule, TranslatePipe],
  templateUrl: './clip-inspector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClipInspectorComponent {
  readonly i18n = inject(I18nService);

  readonly selectedClip = input<TimelineClip | null>(null);
  readonly tracks = input.required<AudioTrack[]>();

  readonly updateClipName = output<{ clipId: string; name: string }>();
  readonly updateClipTrack = output<{ clipId: string; trackId: string }>();
  readonly updateClipOffset = output<{ clipId: string; offset: number }>();
  readonly updateClipVolume = output<{ clipId: string; volume: number }>();
  readonly updateClipFades = output<{
    clipId: string;
    field: 'fadeIn' | 'fadeOut';
    val: number;
  }>();
  readonly onCrossfade = output<void>();
  readonly onDuplicate = output<void>();
  readonly onDelete = output<void>();

  onNameChange(name: string): void {
    const c = this.selectedClip();
    if (c) this.updateClipName.emit({ clipId: c.id, name });
  }

  onTrackChange(trackId: string): void {
    const c = this.selectedClip();
    if (c) this.updateClipTrack.emit({ clipId: c.id, trackId });
  }

  onOffsetChange(offset: number): void {
    const c = this.selectedClip();
    if (c) this.updateClipOffset.emit({ clipId: c.id, offset: Math.max(0, offset) });
  }

  onVolumeChange(volume: number): void {
    const c = this.selectedClip();
    if (c) this.updateClipVolume.emit({ clipId: c.id, volume: Math.max(0, Math.min(1.5, volume)) });
  }

  onFadeChange(field: 'fadeIn' | 'fadeOut', val: number): void {
    const c = this.selectedClip();
    if (c) this.updateClipFades.emit({ clipId: c.id, field, val });
  }
}
