import { isPlatformBrowser, KeyValuePipe, TitleCasePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  model,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { SelectButtonComponent } from '@/app/components/select-button/select-button.component';
import {
  ModelDownloadProgressComponent,
  ProgressInfo,
} from '@/app/components/model-download-progress/model-download-progress.component';
import { LoadingSpinnerSmallComponent } from '@/app/components/loading-spinner-small/loading-spinner-small.component';
import { DragAndDropFileComponent } from '@/app/components/drag-and-drop-file/drag-and-drop-file.component';
import { WHISPER_LANGUAGES } from '@/app/utils/constants';
import { MetadataService } from '@/app/services/metadata.service';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '@/app/components/footer/footer.component';

type WhisperStatus = 'loading' | 'ready' | 'processing';
export type RecognitionApi = 'browser' | 'whisper';
export type AudioInputMode = 'mic' | 'file';

type WhisperEvent =
  | WhisperLoadingEvent
  | WhisperProgressEvent
  | WhisperReadyEvent
  | WhisperCompleteEvent
  | WhisperStartEvent
  | WhisperDoneEvent
  | WhisperUpdateEvent
  | WhisperInitiateEvent;

type WhisperLoadingEvent = {
  status: 'loading';
  data: string;
};

type WhisperProgressEvent = {
  status: 'progress';
  data: ProgressInfo;
};

type WhisperReadyEvent = {
  status: 'ready';
};

type WhisperCompleteEvent = {
  status: 'complete';
  output: string;
  json?: any;
  detectedLanguage?: string;
};

type WhisperStartEvent = {
  status: 'start';
};

type WhisperUpdateEvent = {
  status: 'update';
  output?: string;
  tps?: number;
  numTokens?: number;
};

type WhisperInitiateEvent = {
  status: 'initiate';
};

type WhisperDoneEvent = {
  status: 'done';
};

@Component({
  selector: 'app-audio-speech-to-text',
  imports: [
    LucideIconComponent,
    FormsModule,
    SelectButtonComponent,
    LoadingSpinnerSmallComponent,
    ModelDownloadProgressComponent,
    DragAndDropFileComponent,
    KeyValuePipe,
    TitleCasePipe,
    DecimalPipe,
    TopNavbarComponent,
    FooterComponent,
  ],
  templateUrl: './audio-speech-to-text.component.html',
  styleUrl: './audio-speech-to-text.component.scss',
})
export class AudioSpeechToTextComponent implements OnInit, OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly platform = inject(PLATFORM_ID);
  private readonly metadataService = inject(MetadataService);

  private readonly WHISPER_SAMPLING_RATE = 16_000;
  private readonly MAX_AUDIO_LENGTH = 30; // seconds
  private readonly MAX_SAMPLES = this.WHISPER_SAMPLING_RATE * this.MAX_AUDIO_LENGTH;

  readonly VALID_EXTENSIONS = [
    '.mp3',
    '.wav',
    '.ogg',
    '.flac',
    '.aac',
    '.m4a',
    '.opus',
    '.mp4',
    '.webm',
    '.mov',
    '.mkv',
    '.avi',
    '.flv',
    '.wmv',
    '.m4v',
    '.3gp',
    '.ts',
  ];
  readonly WHISPER_LANGUAGES = WHISPER_LANGUAGES;

  // System & API detection
  readonly isWhisperAvailable = computed(
    () => !!('gpu' in navigator && (navigator as any).gpu) && isPlatformBrowser(this.platform),
  );
  readonly speechApiAvailable = computed(
    () =>
      (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window)) &&
      !('brave' in navigator) &&
      isPlatformBrowser(this.platform),
  );

  readonly recognitionApiList = signal<Array<{ label: string; value: string }>>([]);
  readonly recognitionApi = model<string>('whisper');
  readonly audioInputMode = signal<AudioInputMode>('mic');
  readonly language = model<string>('auto');
  readonly detectedLanguage = signal<string | undefined>(undefined);

  // Audio, Video & Transcription State
  readonly uploadedFile = model<File>();
  readonly isRecording = signal(false);
  readonly errorMessage = signal<string | undefined>(undefined);
  readonly transcript = model<string>();
  readonly captionsJson = signal<any | undefined>(undefined);
  readonly activeViewTab = signal<'text' | 'json'>('text');

  // Video Conversion with FFmpeg
  readonly isConvertingVideo = signal(false);
  readonly conversionProgress = signal(0);
  readonly conversionStatus = signal<string>('');
  private ffmpeg: any = null;
  private ffmpegLoaded = signal(false);
  private preparedAudioBlob?: Blob;

  // Copy & Action indicators
  readonly copiedText = signal(false);
  readonly copiedJson = signal(false);

  // Whisper engine status
  readonly downloadProgress = signal<ProgressInfo | undefined>(undefined);
  readonly isProcessing = signal(false);
  readonly whisperStatus = signal<WhisperStatus>('loading');
  readonly isloading = signal(false);
  readonly isloadingWhisper = signal(false);

  private worker: Worker | null = null;
  private recorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private speechRecognitionBrowserInstance?: SpeechRecognition;

  readonly formattedJson = computed(() => {
    const data = this.captionsJson();
    if (!data) return '';
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  });

  readonly hasCaptionsJson = computed(() => {
    return !!this.captionsJson();
  });

  readonly stats = computed(() => {
    const text = (this.transcript() || '').trim();
    if (!text) return { words: 0, characters: 0, chunks: 0 };
    const words = text.split(/\s+/).filter(Boolean).length;
    let chunks = 0;
    const json = this.captionsJson();
    if (json && Array.isArray(json.chunks)) {
      chunks = json.chunks.length;
    }
    return { words, characters: text.length, chunks };
  });

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Speech to Text & Audio/Video Transcriber',
      description:
        'Convert spoken words, audio, and video files (MP4, WebM, MOV) into accurate text and timestamped JSON captions locally in your browser using Whisper WebGPU AI or Browser Speech Recognition.',
      updateCanonical: true,
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platform)) {
      const list: Array<{ label: string; value: string }> = [];

      if (this.isWhisperAvailable()) {
        list.push({ label: 'Whisper AI', value: 'whisper' });
      }

      if (this.speechApiAvailable()) {
        list.push({ label: 'Browser API', value: 'browser' });
      }

      this.recognitionApiList.set(list);

      // Default to Whisper if available, otherwise Browser API
      if (this.isWhisperAvailable()) {
        this.recognitionApi.set('whisper');
      } else if (this.speechApiAvailable()) {
        this.recognitionApi.set('browser');
      }
    }
  }

  ngOnDestroy(): void {
    this.stopRecording();
  }

  isVideoFile(file: File | undefined): boolean {
    if (!file) return false;
    const videoExtensions = ['.mp4', '.webm', '.mov', '.mkv', '.avi', '.flv', '.wmv', '.m4v', '.3gp', '.ts'];
    const name = file.name.toLowerCase();
    return videoExtensions.some((ext) => name.endsWith(ext)) || file.type.startsWith('video/');
  }

  setAudioInputMode(mode: AudioInputMode) {
    if (this.isRecording()) {
      this.stopRecording();
    }
    this.audioInputMode.set(mode);
  }

  clearTranscript() {
    this.transcript.set('');
    this.captionsJson.set(undefined);
    this.detectedLanguage.set(undefined);
    this.errorMessage.set(undefined);
  }

  clearFileUpload() {
    this.uploadedFile.set(undefined);
    this.preparedAudioBlob = undefined;
    this.isConvertingVideo.set(false);
    this.conversionProgress.set(0);
    this.conversionStatus.set('');
    this.clearTranscript();
  }

  async copyToClipboard() {
    if (!this.transcript()) return;
    try {
      await navigator.clipboard.writeText(this.transcript()!);
      this.copiedText.set(true);
      setTimeout(() => this.copiedText.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }

  async copyJsonToClipboard() {
    const jsonStr = this.formattedJson();
    if (!jsonStr) return;
    try {
      await navigator.clipboard.writeText(jsonStr);
      this.copiedJson.set(true);
      setTimeout(() => this.copiedJson.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  }

  downloadTranscript(format: 'txt' | 'json') {
    if (format === 'txt') {
      const text = this.transcript();
      if (!text) return;
      this.triggerDownload(text, 'transcript.txt', 'text/plain');
    } else {
      const jsonStr = this.formattedJson();
      if (!jsonStr) return;
      this.triggerDownload(jsonStr, 'captions.json', 'application/json');
    }
  }

  private triggerDownload(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  stopRecording() {
    if (this.recognitionApi() === 'browser') {
      this.speechRecognitionBrowserInstance?.stop();
    } else {
      this.stopWhisperTranscription();
    }
    this.isRecording.set(false);
  }

  async startRecording() {
    this.errorMessage.set(undefined);
    this.isloading.set(true);
    try {
      if (this.recognitionApi() === 'browser') {
        await this.startTranscriptionWithBrowserApi();
      } else {
        await this.startTranscriptionWithWhisper();
      }
    } catch (ex: any) {
      console.error(ex);
      this.errorMessage.set(
        ex?.message || 'An error occurred while accessing the microphone or initializing speech recognition.',
      );
      this.isloading.set(false);
      this.isRecording.set(false);
    }
  }

  private async startTranscriptionWithBrowserApi() {
    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      throw new Error('Speech Recognition API is not supported on this browser.');
    }

    if (!this.speechRecognitionBrowserInstance) {
      this.speechRecognitionBrowserInstance = new SpeechRecognitionConstructor();
    }

    const recognition = this.speechRecognitionBrowserInstance;

    return new Promise<void>((resolve, reject) => {
      recognition.continuous = true;
      recognition.interimResults = true;
      if (this.language() === 'auto') {
        recognition.lang = navigator.language || 'en-US';
        this.detectedLanguage.set(navigator.language || 'en-US');
      } else {
        recognition.lang = this.language();
        this.detectedLanguage.set(this.language());
      }

      recognition.onstart = () => {
        this.isRecording.set(true);
        this.isloading.set(false);
      };

      let previousTranscript = this.transcript() || '';
      if (previousTranscript.length > 0) {
        previousTranscript += ' ';
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = previousTranscript;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const data = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += data;
            previousTranscript = finalTranscript;
          } else {
            interimTranscript += data;
          }
        }

        const combined = finalTranscript || interimTranscript;
        if (combined.length > 0) {
          this.transcript.set(combined);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.isRecording.set(false);
        this.isloading.set(false);
        reject(event);
      };

      recognition.onend = () => {
        this.isRecording.set(false);
        this.isloading.set(false);
        resolve();
      };

      recognition.start();
    });
  }

  // --- FFMPEG VIDEO TO AUDIO CONVERSION --- //

  private async initFFmpeg(): Promise<void> {
    if (!isPlatformBrowser(this.platform)) return;
    if (this.ffmpegLoaded()) return;

    this.conversionStatus.set('Loading FFmpeg WASM Core...');
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on('progress', ({ progress }: { progress: number }) => {
      this.conversionProgress.set(Math.min(100, Math.max(0, Math.round(progress * 100))));
    });

    const baseURL = `${window.location.origin}/assets/ffmpeg`;
    await this.ffmpeg.load({
      classWorkerURL: `${baseURL}/worker.js`,
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.ffmpegLoaded.set(true);
  }

  private async extractAudioFromVideo(file: File): Promise<Blob> {
    this.isConvertingVideo.set(true);
    this.conversionProgress.set(0);
    this.conversionStatus.set('Initializing video extraction engine...');

    try {
      await this.initFFmpeg();

      this.conversionStatus.set('Reading video file into memory...');
      const ext = file.name.substring(file.name.lastIndexOf('.'));
      const inputName = `input_${Date.now()}${ext || '.mp4'}`;
      const outputName = `output_${Date.now()}.wav`;

      const { fetchFile } = await import('@ffmpeg/util');
      await this.ffmpeg.writeFile(inputName, await fetchFile(file));

      this.conversionStatus.set('Extracting and converting audio track with FFmpeg...');
      // Extract audio without video, resample to 16kHz mono 16-bit WAV for optimal Whisper ingestion
      const args = ['-i', inputName, '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', outputName];
      await this.ffmpeg.exec(args);

      this.conversionStatus.set('Finalizing audio stream...');
      const data = await this.ffmpeg.readFile(outputName);
      const audioBlob = new Blob([data.buffer as ArrayBuffer], { type: 'audio/wav' });

      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      this.conversionStatus.set('Audio extracted successfully!');
      return audioBlob;
    } finally {
      this.isConvertingVideo.set(false);
    }
  }

  // --- WHISPER IMPLEMENTATION --- //

  async startWhisperTranscriptionFromFile() {
    const file = this.uploadedFile();
    if (!file) return;

    this.errorMessage.set(undefined);
    this.isloading.set(true);
    this.isloadingWhisper.set(true);

    try {
      let audioBlob: Blob = file;

      if (this.isVideoFile(file)) {
        audioBlob = await this.extractAudioFromVideo(file);
      }
      this.preparedAudioBlob = audioBlob;

      if (!this.worker) {
        this.initWhisperWorker('file');
        this.setupAudioContext();
        this.loadModel();
      } else {
        await this.processAudioFile(audioBlob);
      }
    } catch (err: any) {
      this.isloading.set(false);
      this.isloadingWhisper.set(false);
      this.isConvertingVideo.set(false);
      this.errorMessage.set(err?.message || 'Error processing media file with Whisper.');
    }
  }

  private async startTranscriptionWithWhisper() {
    this.ngZone.runOutsideAngular(() => {
      this.initWhisperWorker('realtime');
      this.loadModel();
      this.setupAudioContext();
      this.setupMediaRecorder();
    });
  }

  private async stopWhisperTranscription() {
    this.worker?.terminate();
    this.recorder?.stop();
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.recorder = null;
    this.worker = null;
    this.stream = null;
  }

  private initWhisperWorker(mode: 'realtime' | 'file'): void {
    if (!this.worker) {
      this.worker = new Worker(new URL('./audio-speech-to-text.worker', import.meta.url), {
        type: 'module',
      });
    }

    const handler =
      mode === 'realtime'
        ? this.handleWorkerMessageWhisperRealTime
        : this.handleWorkerMessageWhisperAudioFile;
    this.worker.addEventListener('message', handler);
  }

  private handleWorkerMessageWhisperRealTime = (e: MessageEvent<WhisperEvent>): void => {
    switch (e.data.status) {
      case 'loading':
        this.whisperStatus.set('loading');
        break;

      case 'initiate':
      case 'progress':
      case 'done':
        this.downloadProgress.set(e.data as any);
        break;

      case 'ready':
        this.whisperStatus.set('ready');
        this.recorder?.start();
        this.recorder?.requestData();
        break;

      case 'start':
        this.isProcessing.set(true);
        break;

      case 'update':
        if (e.data.output) {
          const clean = e.data.output.replace(/<\|\d+\.\d+\|>/g, ' ').replace(/\s+/g, ' ').trim();
          if (clean) {
            this.transcript.set(clean);
          }
        }
        break;

      case 'complete':
        this.isProcessing.set(false);
        const text = (e.data.output || '').replace(/<\|\d+\.\d+\|>/g, ' ').replace(/\s+/g, ' ').trim();
        this.transcript.set(text);
        if (e.data.json) {
          this.captionsJson.set(e.data.json);
        }
        if (e.data.detectedLanguage) {
          this.detectedLanguage.set(e.data.detectedLanguage);
        }
        this.recorder?.requestData();
        break;
    }
  };

  private handleWorkerMessageWhisperAudioFile = (e: MessageEvent<WhisperEvent>): void => {
    switch (e.data.status) {
      case 'loading':
        this.whisperStatus.set('loading');
        break;

      case 'initiate':
      case 'progress':
      case 'done':
        this.downloadProgress.set(e.data as any);
        break;

      case 'ready':
        this.whisperStatus.set('ready');
        this.isloadingWhisper.set(false);
        if (this.preparedAudioBlob || this.uploadedFile()) {
          this.processAudioFile(this.preparedAudioBlob || this.uploadedFile()!);
        }
        break;

      case 'start':
        this.isProcessing.set(true);
        break;

      case 'update':
        if (e.data.output) {
          const clean = e.data.output.replace(/<\|\d+\.\d+\|>/g, ' ').replace(/\s+/g, ' ').trim();
          if (clean) {
            this.transcript.set(clean);
          }
        }
        break;

      case 'complete':
        this.isProcessing.set(false);
        this.isloading.set(false);
        this.isloadingWhisper.set(false);
        const cleanFileText = (e.data.output || '').replace(/<\|\d+\.\d+\|>/g, ' ').replace(/\s+/g, ' ').trim();
        this.transcript.set(cleanFileText);
        if (e.data.json) {
          this.captionsJson.set(e.data.json);
        }
        if (e.data.detectedLanguage) {
          this.detectedLanguage.set(e.data.detectedLanguage);
        }
        break;
    }
  };

  private async setupMediaRecorder(): Promise<void> {
    if (this.recorder) return;

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        this.recorder = new MediaRecorder(this.stream);

        this.recorder.onstart = () => {
          this.isRecording.set(true);
          this.isloading.set(false);
          this.chunks = [];
        };

        this.recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            this.ngZone.runOutsideAngular(() => {
              this.chunks.push(e.data);
              this.processAudioChunks(this.chunks);
            });
          } else {
            setTimeout(() => {
              this.ngZone.runOutsideAngular(() => {
                this.recorder?.requestData();
              });
            }, 25);
          }
        };

        this.recorder.onstop = () => {
          this.isRecording.set(false);
        };
      } catch (err: any) {
        console.error('Microphone error:', err);
        this.errorMessage.set(
          'Could not access microphone. Please ensure microphone permissions are granted.',
        );
        this.isloading.set(false);
        this.isRecording.set(false);
      }
    } else {
      this.errorMessage.set('getUserMedia is not supported by your browser.');
      this.isloading.set(false);
      this.isRecording.set(false);
    }
  }

  private async processAudioChunks(chunks: Blob[]): Promise<void> {
    if (!this.recorder || !this.isRecording() || this.isProcessing() || this.whisperStatus() !== 'ready') {
      return;
    }

    if (chunks.length > 0) {
      const blob = new Blob(chunks, { type: this.recorder.mimeType });
      const arrayBuffer = await blob.arrayBuffer();
      const decoded = await this.audioContext!.decodeAudioData(arrayBuffer);
      let audio = decoded.getChannelData(0);

      if (audio.length > this.MAX_SAMPLES) {
        audio = audio.slice(-this.MAX_SAMPLES);
      }

      this.worker?.postMessage({
        type: 'generate',
        data: { audio, language: this.language() },
      });
    }
  }

  private loadModel(): void {
    this.worker?.postMessage({ type: 'load' });
    this.whisperStatus.set('loading');
  }

  private setupAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: this.WHISPER_SAMPLING_RATE });
    }
  }

  private async processAudioFile(blob: Blob) {
    const buffer = await blob.arrayBuffer();
    const audioBuffer = await this.audioContext!.decodeAudioData(buffer);
    let audio: Float32Array;

    if (audioBuffer.numberOfChannels === 2) {
      const SCALING_FACTOR = Math.sqrt(2);
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      audio = new Float32Array(left.length);
      for (let i = 0; i < audioBuffer.length; ++i) {
        audio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
      }
    } else {
      audio = audioBuffer.getChannelData(0);
    }

    this.worker?.postMessage({
      type: 'generate',
      data: { audio, language: this.language() },
    });
  }
}
