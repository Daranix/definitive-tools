import { NgClass } from '@angular/common';
import { Component, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export type Mode = 'encode' | 'decode';

@Component({
  selector: 'app-base64',
  imports: [LucideAngularModule, NgClass, FormsModule],
  templateUrl: './base64.component.html',
  styleUrl: './base64.component.scss'
})
export class Base64Component {

  readonly mode = signal<Mode>('encode');
  readonly inputText = model<string>('');
  readonly outputText = model<string>('');

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
