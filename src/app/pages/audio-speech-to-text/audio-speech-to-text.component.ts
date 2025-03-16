import { SelectButtonComponent } from '@/app/components/select-button/select-button.component';
import { isPlatformBrowser, NgClass } from '@angular/common';
import { Component, computed, inject, model, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';


type RecognitionApi = 'browser' | 'whisper';

@Component({
  selector: 'app-audio-speech-to-text',
  imports: [LucideAngularModule, FormsModule, SelectButtonComponent],
  templateUrl: './audio-speech-to-text.component.html',
  styleUrl: './audio-speech-to-text.component.scss'
})
export class AudioSpeechToTextComponent implements OnInit {


  readonly recognitionApiList = signal<Array<{ label: string, value: RecognitionApi }>>([
    { label: 'Whisper', value: 'whisper' }
  ]);

  private readonly platform = inject(PLATFORM_ID);
  readonly isRecording = signal(false);
  readonly errorMessage = signal<string | undefined>(undefined);
  readonly transcript = model<string>();
  readonly copied = signal(false);
  readonly speechApiAvailable = computed(() => (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window)) && !('brave' in navigator) && isPlatformBrowser(this.platform));
  readonly recognitionApi = model<RecognitionApi>('whisper');

  private speechRecognitionBrowserInstance?: SpeechRecognition;

  ngOnInit(): void {
    if(isPlatformBrowser(this.platform) && this.speechApiAvailable()) {
      this.recognitionApiList.update((list) => [...list, { label: 'Browser', value: 'browser' }]);
    }
  }

  clearTranscript() {
    this.transcript.set('');
  }

  stopRecording() {

    if(this.recognitionApi() === 'browser') {
      this.speechRecognitionBrowserInstance!.stop();
    } else {
      // TODO: Implement stopRecording for whisper
    }

  }

  async startRecording() {
    try {
      if(this.recognitionApi() === 'browser') {
        await this.startTranscriptionWithBrowserApi();
      } else {
        // TODO: Implement startRecording for whisper
      }
    } catch(ex) {
      console.error(ex);
    }
    this.isRecording.set(false);
  }


  private async startTranscriptionWithBrowserApi() {
     // Initialize speech recognition

     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

     return new Promise<void>((resolve, reject) => {
      if(!this.speechRecognitionBrowserInstance) {
        this.speechRecognitionBrowserInstance = new SpeechRecognition();
      }
      
      this.speechRecognitionBrowserInstance.continuous = true;
      this.speechRecognitionBrowserInstance.interimResults = true;
      
      this.speechRecognitionBrowserInstance.onstart = () => {
        this.isRecording.set(true);
      };
      
      let previousTranscript = this.transcript() || '';
      if(previousTranscript.length > 0) {
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
        
        if(finalTranscript.length > 0 || interimTranscript.length > 0) {
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

}
