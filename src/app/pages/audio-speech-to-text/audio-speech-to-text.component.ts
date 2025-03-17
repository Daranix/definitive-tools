import { SelectButtonComponent } from '@/app/components/select-button/select-button.component';
import { isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, model, NgZone, OnDestroy, OnInit, output, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ProgressInfo } from '@/app/components/model-download-progress/model-download-progress.component';


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
  imports: [LucideAngularModule, FormsModule, SelectButtonComponent],
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

  private readonly zone = inject(NgZone);
  private readonly platform = inject(PLATFORM_ID);
  private readonly WHISPER_SAMPLING_RATE = 16_000;
  private readonly MAX_AUDIO_LENGTH = 30; // seconds
  private readonly MAX_SAMPLES = this.WHISPER_SAMPLING_RATE * this.MAX_AUDIO_LENGTH;

  readonly isRecording = signal(false);
  readonly errorMessage = signal<string | undefined>(undefined);
  readonly transcript = model<string>();
  readonly copied = signal(false);
  readonly speechApiAvailable = computed(() => (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window)) && !('brave' in navigator) && isPlatformBrowser(this.platform));
  readonly recognitionApi = model<RecognitionApi>('whisper');
  readonly downloadProgress = signal<ProgressInfo | WhisperEvent | undefined>(undefined);
  readonly isProcessing = signal(false);
  readonly whisperStatus = signal<WhisperStatus>('loading');

  private speechRecognitionBrowserInstance?: SpeechRecognition;
  // private transcriber?: AutomaticSpeechRecognitionPipeline;

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
      // TODO: Implement stopRecording for whisper
      this.stopWhisperTranscription();
    }
  }

  async startRecording() {
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

  private async startTranscriptionWithWhisper() {
    this.initWhisperWorker();
    this.loadModel();
    this.setupMediaRecorder();
  }

  private async stopWhisperTranscription() {
    this.worker?.terminate();
    this.recorder?.stop();
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  private initWhisperWorker(): void {
    if (!this.worker) {
      this.worker = new Worker(new URL('./audio-speech-to-text.worker', import.meta.url), { type: 'module' });
    }
    
    this.worker.addEventListener('message', this.handleWorkerMessage);
  }
  
  private handleWorkerMessage = (e: MessageEvent<WhisperEvent>): void => {
    switch (e.data.status) {
      case 'loading':
        this.whisperStatus.set('loading');
        // this.loadingMessage = e.data.data;
        break;
        
      case 'initiate':
        // this.progressItems = [...this.progressItems, e.data];
        this.downloadProgress.set(e.data as any);
        break;
        
      case 'progress':
        /*this.progressItems = this.progressItems.map(item => {
          if (item.file === e.data.file) {
            return { ...item, ...e.data };
          }
          return item;
        });*/
        this.downloadProgress.set(e.data as any);
        break;
        
      case 'done':
        // this.progressItems = this.progressItems.filter(item => item.file !== e.data.file);
        this.downloadProgress.set(e.data as any);
        break;
        
      case 'ready':
        this.whisperStatus.set('ready');
        this.recorder?.start();
        break;
        
      case 'start':
        this.isProcessing.set(true);
        this.recorder?.requestData();
        break;
        
      case 'update':
        // tps = tokens per second
        // const { tps } = e.data;
        // this.tps = tps;
        break;
        
      case 'complete':
        this.isProcessing.set(false);
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
        this.audioContext = new AudioContext({ sampleRate: this.WHISPER_SAMPLING_RATE });
        
        this.recorder.onstart = () => {
            this.isRecording.set(true);
            this.chunks = [];
        };
        
        this.recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              this.chunks = [...this.chunks, e.data];
              this.processAudioChunks()            
            } else {
              // Empty chunk received, so we request new data after a short timeout
              setTimeout(() => {
                this.recorder?.requestData();
              }, 25);
            }
        };
        
        this.recorder.onstop = () => {
          /*this.zone.run(() => {
            this.isRecording.set(false);
          });*/
          this.isRecording.set(false);
        };
        
        // Set up a periodic check for data
        setInterval(() => {
          if (this.recorder && this.isRecording() && !this.isProcessing() && this.whisperStatus() === 'ready') {
            this.recorder.requestData();
          }
        }, 100);
        
      } catch (err) {
        console.error("The following error occurred: ", err);
      }
    } else {
      console.error("getUserMedia not supported on your browser!");
    }
  }
  
  private async processAudioChunks(): Promise<void> {
    if (!this.recorder) return;
    if (!this.isRecording()) return;
    if (this.isProcessing()) return;
    if (this.whisperStatus() !== 'ready') return;
    
    if (this.chunks.length > 0) {
      // Generate from data
      const blob = new Blob(this.chunks, { type: this.recorder.mimeType });
      
      const arrayBuffer = await blob.arrayBuffer();
      const decoded = await this.audioContext!.decodeAudioData(arrayBuffer);
      let audio = decoded.getChannelData(0);
      
      if (audio.length > this.MAX_SAMPLES) { // Get last MAX_SAMPLES
        audio = audio.slice(-this.MAX_SAMPLES);
      }
      
      this.worker?.postMessage({ type: 'generate', data: { audio } });
    } else {
      this.recorder?.requestData();
    }
  }
  
  loadModel(): void {
    this.worker?.postMessage({ type: 'load' });
    this.whisperStatus.set('loading');
  }

}
