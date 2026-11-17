import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '@/app/components/footer/footer.component';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { MetadataService } from '@/app/services/metadata.service';
import { ToastService } from '@/app/services/toast.service';
import { FileSizePipe } from '@/app/pipes/file-size.pipe';
import { I18nService } from '@/app/i18n/i18n.service';

interface VoiceItem {
  id: string;
  name: string;
  language: string;
  region: string;
  quality: string;
}

interface DownloadProgress {
  percent: number;
  loaded: number;
  total: number;
  modelName: string;
}

interface HFVoice {
  key: string;
  name: string;
  language: {
    name_english: string;
    name?: string;
    code?: string;
    country_english: string;
    region?: string;
  };
  quality: string;
}

interface VoicesListMessage {
  type: 'voices_list';
  voices: HFVoice[];
}

interface ProgressMessage {
  type: 'progress';
  loaded: number;
  total: number;
  url?: string;
}

interface ResultMessage {
  type: 'result';
  audio: Blob;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

type WorkerMessage = VoicesListMessage | ProgressMessage | ResultMessage | ErrorMessage;

@Component({
  selector: 'app-text-to-speech',
  imports: [
    FormsModule,
    TopNavbarComponent,
    FooterComponent,
    LucideIconComponent,
    FileSizePipe,
    TranslatePipe,
  ],
  templateUrl: './text-to-speech.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './text-to-speech.component.scss',
})
export class TextToSpeechComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);
  private readonly i18n = inject(I18nService);

  private worker?: Worker;
  private audioBlob?: Blob;
// ... (lines omitted for brevity, but let's make sure target matches exactly)

  // Signal State
  readonly inputText = signal<string>('As the waves crashed against the shore, they carried tales of distant lands and adventures untold.');
  readonly voices = signal<VoiceItem[]>([]);
  readonly selectedVoiceId = signal<string>('');
  readonly loadingVoices = signal<boolean>(false);
  readonly generating = signal<boolean>(false);
  readonly audioUrl = signal<string | undefined>(undefined);

  readonly downloadProgress = signal<DownloadProgress | undefined>(undefined);

  // Character counter, formatted for the active language
  readonly characterCount = computed(() =>
    this.i18n.formatNumber(this.inputText().length),
  );

  // Download percentage label, formatted for the active language
  readonly downloadPercent = computed(() => {
    const progress = this.downloadProgress();
    return progress ? this.i18n.formatPercent(progress.percent / 100) : '';
  });

  // Grouped voices list computed for the select dropdown
  readonly groupedVoices = computed(() => {
    const groups: Record<string, VoiceItem[]> = {};
    for (const voice of this.voices()) {
      if (!groups[voice.language]) {
        groups[voice.language] = [];
      }
      groups[voice.language].push(voice);
    }
    return Object.entries(groups).map(([language, list]) => ({
      language,
      list,
    }));
  });

  // Selected voice metadata details
  readonly selectedVoiceDetails = computed(() => {
    const id = this.selectedVoiceId();
    return this.voices().find((v) => v.id === id);
  });

  constructor() {
    this.updateMetadata();
    effect(() => {
      this.i18n.language();
      this.updateMetadata();
    });
  }

  private updateMetadata(): void {
    this.metadataService.updateMetadata({
      title: this.i18n.t('text-to-speech.seo.title'),
      description: this.i18n.t('text-to-speech.seo.description'),
      keywords: this.i18n.t('text-to-speech.seo.keywords'),
    });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeWorker();
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      this.worker?.terminate();
      if (this.audioUrl()) {
        URL.revokeObjectURL(this.audioUrl()!);
      }
    }
  }

  private initializeWorker() {
    if (typeof Worker !== 'undefined') {
      this.loadingVoices.set(true);

      // Instantiates the worker referencing our local file
      this.worker = new Worker(new URL('./tts.worker', import.meta.url), {
        type: 'module',
      });

      this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));
      this.worker.addEventListener('error', (err) => {
        console.error('TTS Worker error:', err);
        this.generating.set(false);
        this.downloadProgress.set(undefined);
        
        const isChunkError = err.message && (
          err.message.includes('dynamically imported module') || 
          err.message.includes('Failed to fetch') ||
          err.message.includes('chunk-')
        );

        if (isChunkError) {
          this.toastService.error({
            message: this.i18n.t('text-to-speech.errors.appUpdated'),
          });
        } else {
          this.toastService.error({
            message: this.i18n.t('text-to-speech.errors.engine'),
          });
        }
      });

      this.worker.postMessage({ type: 'get_voices' });
    } else {
      this.toastService.error({
        message: this.i18n.t('text-to-speech.errors.workersUnsupported'),
      });
    }
  }

  private handleWorkerMessage(event: MessageEvent<WorkerMessage>) {
    const data = event.data;
    if (!data) return;

    switch (data.type) {
      case 'voices_list':
        this.loadingVoices.set(false);
        const parsed: VoiceItem[] = [];

        for (const val of data.voices) {
          const baseLang =
            val.language?.name_english ||
            val.language?.name ||
            this.i18n.t('text-to-speech.voice.unknownLanguage');
          const country = val.language?.country_english || val.language?.region || '';
          const langName = country ? `${baseLang} (${country})` : baseLang;

          parsed.push({
            id: val.key,
            name: val.name || val.key,
            language: langName,
            region: country,
            quality: val.quality || 'medium',
          });
        }

        // Sort alphabetically by language, then name
        parsed.sort((a, b) => {
          const langCompare = a.language.localeCompare(b.language);
          if (langCompare !== 0) return langCompare;
          return a.name.localeCompare(b.name);
        });

        this.voices.set(parsed);

        // Select a default voice: en_US female voice if available, or first item
        const defaultVoice =
          parsed.find((v) => v.id.includes('en_US-hfc_female')) ||
          parsed.find((v) => v.id.includes('en_US')) ||
          parsed[0];
        if (defaultVoice) {
          this.selectedVoiceId.set(defaultVoice.id);
        }
        break;

      case 'progress':
        const loaded = data.loaded || 0;
        const total = data.total || 0;
        const percent = total > 0 ? Math.round((loaded * 100) / total) : 0;

        let modelName = this.i18n.t('text-to-speech.progress.modelFile');
        if (data.url) {
          const parts = data.url.split('/');
          modelName = parts[parts.length - 1] || 'model';
        }

        this.downloadProgress.set({
          percent,
          loaded,
          total,
          modelName,
        });
        break;

      case 'result':
        this.generating.set(false);
        this.downloadProgress.set(undefined);

        if (this.audioUrl()) {
          URL.revokeObjectURL(this.audioUrl()!);
        }

        const blob = data.audio;
        this.audioBlob = blob;
        this.audioUrl.set(URL.createObjectURL(blob));
        this.toastService.success({
          message: this.i18n.t('text-to-speech.messages.generated'),
        });
        break;

      case 'error':
        this.generating.set(false);
        this.downloadProgress.set(undefined);
        this.toastService.error({
          message:
            data.message || this.i18n.t('text-to-speech.errors.synthesisFailed'),
        });
        console.error(data.message);
        break;
    }
  }

  generateSpeech() {
    const text = this.inputText().trim();
    const voiceId = this.selectedVoiceId();

    if (!text) {
      this.toastService.warning({
        message: this.i18n.t('text-to-speech.errors.enterText'),
      });
      return;
    }
    if (!voiceId) {
      this.toastService.warning({
        message: this.i18n.t('text-to-speech.errors.selectVoice'),
      });
      return;
    }

    if (this.worker) {
      this.generating.set(true);
      this.audioUrl.set(undefined);
      this.audioBlob = undefined;
      this.downloadProgress.set({
        percent: 0,
        loaded: 0,
        total: 0,
        modelName: this.i18n.t('text-to-speech.progress.connecting'),
      });

      this.worker.postMessage({
        type: 'predict',
        text,
        voiceId,
      });
    }
  }

  downloadAudio() {
    if (!this.audioBlob) return;

    const url = URL.createObjectURL(this.audioBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.i18n.t('text-to-speech.downloads.audioFileName', {
      voiceId: this.selectedVoiceId(),
    });
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}
