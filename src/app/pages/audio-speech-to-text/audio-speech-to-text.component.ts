import { SelectButtonComponent } from '@/app/components/select-button/select-button.component';
import { isPlatformBrowser, KeyValuePipe, TitleCasePipe } from '@angular/common';
import { Component, computed, inject, model, NgZone, OnDestroy, OnInit, output, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ModelDownloadProgressComponent, ProgressInfo } from '@/app/components/model-download-progress/model-download-progress.component';
import { LoadingSpinnerSmallComponent } from '@/app/components/loading-spinner-small/loading-spinner-small.component';
import { DragAndDropFileComponent } from '@/app/components/drag-and-drop-file/drag-and-drop-file.component';
import { WHISPER_LANGUAGES, WhisperLanguage } from '@/app/utils/constants';


type WhisperStatus = 'loading' | 'ready' | 'processing';
type RecognitionApi = 'browser' | 'whisper';

type WhisperEvent = WhisperLoadingEvent | WhisperProgressEvent | WhisperReadyEvent | WhisperCompleteEvent | WhisperStartEvent | WhisperDoneEvent | WhisperUpdateEvent | WhisperInitiateEvent;

type WhisperLoadingEvent = {
  status: 'loading';
  data: string;
}

type WhisperProgressEvent = {
  status: 'progress';
  data: ProgressInfo;
}

type WhisperReadyEvent = {
  status: 'ready';
}

type WhisperCompleteEvent = {
  status: 'complete';
  output: string;
}

type WhisperStartEvent = {
  status: 'start';
}

type WhisperUpdateEvent = {
  status: 'update';
  tps: number;
}

type WhisperInitiateEvent = {
  status: 'initiate';
}

type WhisperDoneEvent = {
  status: 'done';
}
@Component({
  selector: 'app-audio-speech-to-text',
  imports: [
    LucideAngularModule,
    FormsModule,
    SelectButtonComponent,
    LoadingSpinnerSmallComponent,
    ModelDownloadProgressComponent,
    DragAndDropFileComponent,
    KeyValuePipe,
    TitleCasePipe
  ],
  templateUrl: './audio-speech-to-text.component.html',
  styleUrl: './audio-speech-to-text.component.scss'
})
export class AudioSpeechToTextComponent implements OnInit, OnDestroy {


  private isWhisperAvailable = computed(() => (!!('gpu' in navigator && navigator.gpu) && isPlatformBrowser(this.platform)));

  private worker: Worker | null = null;
  private recorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  // private tps: number;

  readonly recognitionApiList = signal<Array<{ label: string, value: RecognitionApi }>>([]);

  private readonly ngZone = inject(NgZone);
  private readonly platform = inject(PLATFORM_ID);
  private readonly WHISPER_SAMPLING_RATE = 16_000;
  private readonly MAX_AUDIO_LENGTH = 30; // seconds
  private readonly MAX_SAMPLES = this.WHISPER_SAMPLING_RATE * this.MAX_AUDIO_LENGTH;

  readonly VALID_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.opus'];
  readonly WHISPER_LANGUAGES = WHISPER_LANGUAGES;
  readonly uploadedFile = model<File>();

  readonly isRecording = signal(false);
  readonly errorMessage = signal<string | undefined>(undefined);
  readonly transcript = model<string>();
  readonly copied = signal(false);
  readonly speechApiAvailable = computed(() => (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window)) && !('brave' in navigator) && isPlatformBrowser(this.platform));
  readonly recognitionApi = model<RecognitionApi>('whisper');
  readonly downloadProgress = signal<ProgressInfo | undefined>(undefined);
  readonly isProcessing = signal(false);
  readonly whisperStatus = signal<WhisperStatus>('loading');
  readonly isloading = signal(false);
  readonly isloadingWhisper = signal(false);
  readonly language = model<WhisperLanguage>('en');

  private speechRecognitionBrowserInstance?: SpeechRecognition;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platform) && this.speechApiAvailable()) {
      if(this.speechApiAvailable()) {
        this.recognitionApiList.update((list) => [...list, { label: 'Browser API', value: 'browser' }]);
      }
      
      if(this.isWhisperAvailable()) {
        this.recognitionApiList.update((list) => [...list, { label: 'Whisper', value: 'whisper' }]);
      }
    }
  }

  ngOnDestroy(): void {
    this.stopRecording();

  }

  clearTranscript() {
    this.transcript.set('');
  }

  stopRecording() {

    if (this.recognitionApi() === 'browser') {
      this.speechRecognitionBrowserInstance!.stop();
    } else {
      this.stopWhisperTranscription();
    }
  }

  async startRecording() {
    this.isloading.set(true);
    try {
      if (this.recognitionApi() === 'browser') {
        await this.startTranscriptionWithBrowserApi();
      } else {
        this.startTranscriptionWithWhisper();
      }
    } catch (ex) {
      console.error(ex);
    }
    this.isRecording.set(false);
  }

  private async startTranscriptionWithBrowserApi() {
    // Initialize speech recognition

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    return new Promise<void>((resolve, reject) => {
      if (!this.speechRecognitionBrowserInstance) {
        this.speechRecognitionBrowserInstance = new SpeechRecognition();
      }

      this.speechRecognitionBrowserInstance.continuous = true;
      this.speechRecognitionBrowserInstance.interimResults = true;

      this.speechRecognitionBrowserInstance.onstart = () => {
        this.isRecording.set(true);
        this.isloading.set(false);
      };

      let previousTranscript = this.transcript() || '';
      if (previousTranscript.length > 0) {
        previousTranscript += ' ';
      }

      this.speechRecognitionBrowserInstance.onresult = (event) => {

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

        if (finalTranscript.length > 0 || interimTranscript.length > 0) {
          this.transcript.set(finalTranscript || interimTranscript);
        }
      };

      this.speechRecognitionBrowserInstance.onerror = (event) => {
        reject(event);
      };

      this.speechRecognitionBrowserInstance.onend = () => {
        resolve();
      };

      this.speechRecognitionBrowserInstance.start();
    });
  }

  // --- WHISPER PART ---- //

  async startWhisperTranscriptionFromFile() {
    const file = this.uploadedFile();
    if(!file) return;
    
    this.isloading.set(true);
    this.isloadingWhisper.set(true);

    if(!this.worker) {
      this.initWhisperWorker('file');
      this.setupAudioContext();
      this.loadModel();
    } else {
      await this.processAudioFile(this.uploadedFile()!);
    }

  }

  clearFileUpload() {
    this.uploadedFile.set(undefined);
    this.transcript.set(undefined);
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
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.recorder = null;
    this.worker = null;
  }

  private initWhisperWorker(mode: 'realtime' | 'file'): void {
    if (!this.worker) {
      this.worker = new Worker(new URL('./audio-speech-to-text.worker', import.meta.url), { type: 'module' });
    }
    
    const handler = mode === 'realtime' ? this.handleWorkerMessageWhisperRealTime : this.handleWorkerMessageWhisperAudioFile;
    this.worker.addEventListener('message', handler);
  }
  
  private handleWorkerMessageWhisperRealTime = (e: MessageEvent<WhisperEvent>): void => {
    switch (e.data.status) {
      case 'loading':
        this.whisperStatus.set('loading');
        break;
        
      case 'initiate':
        this.downloadProgress.set(e.data as any);
        break;
        
      case 'progress':
        this.downloadProgress.set(e.data as any);
        break;
        
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
        break;
        
      case 'complete':
        this.isProcessing.set(false);
        const text = e.data.output;
        this.transcript.set(text);
        this.recorder?.requestData();
        break;
    }
  }

  private handleWorkerMessageWhisperAudioFile = (e: MessageEvent<WhisperEvent>): void => {
    switch (e.data.status) {
      case 'loading':
        this.whisperStatus.set('loading');
        break;
        
      case 'initiate':
        this.downloadProgress.set(e.data as any);
        break;
        
      case 'progress':
        this.downloadProgress.set(e.data as any);
        break;
        
      case 'done':
        this.downloadProgress.set(e.data as any);
        break;
        
      case 'ready':
        this.whisperStatus.set('ready');
        this.isloadingWhisper.set(false);
        this.processAudioFile(this.uploadedFile()!);
        break;
        
      case 'start':
        this.isProcessing.set(true);
        break;
        
      case 'update':
        break;
        
      case 'complete':
        this.isProcessing.set(false);
        this.isloading.set(false);
        const text = e.data.output;
        this.transcript.set(text);
        break;
    }
  }

  private async setupMediaRecorder(): Promise<void> {
    if (this.recorder) return; // Already set
    
    if (navigator.mediaDevices.getUserMedia) {
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
        
        // Set up a periodic check for data
        /*
        setInterval(() => {
          this.ngZone.runOutsideAngular(() => {
            if (this.recorder && this.isRecording() && !this.isProcessing() && this.whisperStatus() === 'ready') {
              this.recorder.requestData();
            }
          });

        }, 500);*/
        
      } catch (err) {
        console.error("The following error occurred: ", err);
      }
    } else {
      console.error("getUserMedia not supported on your browser!");
    }
  }
  
  private async processAudioChunks(chunks: Blob[]): Promise<void> {
    if (!this.recorder) return;
    if (!this.isRecording()) return;
    if (this.isProcessing()) return;
    if (this.whisperStatus() !== 'ready') return;
    
    if (chunks.length > 0) {
      // Generate from data
      const blob = new Blob(chunks, { type: this.recorder.mimeType });
      const arrayBuffer = await blob.arrayBuffer();
      const decoded = await this.audioContext!.decodeAudioData(arrayBuffer);
      let audio = decoded.getChannelData(0);
      
      if (audio.length > this.MAX_SAMPLES) { // Get last MAX_SAMPLES
        audio = audio.slice(-this.MAX_SAMPLES);
      }
      
      this.worker?.postMessage({ type: 'generate', data: { audio, language: this.language() } });
    } else {
      // this.recorder?.requestData();
    }
  }
  
  private loadModel(): void {
    this.worker?.postMessage({ type: 'load' });
    this.whisperStatus.set('loading');
  }

  private setupAudioContext(): void {
    this.audioContext = new AudioContext({ sampleRate: this.WHISPER_SAMPLING_RATE });
  }

  private async processAudioFile(blob: Blob) {
    const buffer = await blob.arrayBuffer();
    const audioBuffer = await this.audioContext!.decodeAudioData(buffer);
    let audio;
    if (audioBuffer.numberOfChannels === 2) {
      // Merge channels
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

    this.worker?.postMessage({ type: 'generate', data: { audio, language: this.language() } });
  }

}
