import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { MetadataService } from '@/app/services/metadata.service';
import { NgClass } from '@angular/common';
import { Component, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export type Mode = 'encode' | 'decode';

@Component({
  selector: 'app-base64',
  imports: [LucideAngularModule, NgClass, FormsModule, TopNavbarComponent],
  templateUrl: './base64.component.html',
  styleUrl: './base64.component.scss'
})
export class Base64Component {

  private readonly metadataService = inject(MetadataService);

  readonly mode = signal<Mode>('encode');
  readonly inputText = model<string>('');
  readonly outputText = model<string>('');

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Base64 Converter',
      description: 'Easily encode text to Base64 or decode Base64 to text. Perfect for data transfer, embedding images, or working with APIs.',
      keywords: 'base64, encode, decode, converter, text, image, api, data transfer, embedding, images, api, data transfer, embedding, images'
    });
  }

  handleProcess() {
    if (this.mode() === 'encode') {
      this.outputText.set(btoa(this.inputText()));
    } else {
      try {
        this.outputText.set(atob(this.inputText()));
      } catch (e) {
        this.outputText.set('Invalid Base64 input');
      }
    }
  }

  handleSwap() {
    const temp = this.inputText();
    this.inputText.set(this.outputText());
    this.outputText.set(temp);
  }

  handleCopy() {
    navigator.clipboard.writeText(this.outputText());
  }

}
