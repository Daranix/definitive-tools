import { MetadataService } from '@/app/services/metadata.service';
import { ToastService } from '@/app/services/toast.service';
import { Component, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-random-password-generator',
  imports: [LucideAngularModule, FormsModule],
  templateUrl: './random-password-generator.component.html',
  styleUrl: './random-password-generator.component.scss'
})
export class RandomPasswordGeneratorComponent {

  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);

  readonly password = signal<string | undefined>(undefined);
  readonly copied = signal(false);
  readonly passwordLength = model(12);
  readonly includeUppercase = model(true);
  readonly includeLowercase = model(true);
  readonly includeNumbers = model(true);
  readonly includeSymbols = model(true);

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Random Password Generator',
      description: 'Generate secure, randomized passwords. Customize complexity to meet different security requirements.',
      keywords: 'password, random, generator, secure, complexity, security, requirements'
    });
  }

  generatePassword() {
    let charset = '';
    let newPassword = '';
    
    if (this.includeLowercase()) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (this.includeUppercase()) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (this.includeNumbers()) charset += '0123456789';
    if (this.includeSymbols()) charset += '!@#$%&';
    
    if (charset === '') {
      this.password.set('Please select at least one character type');
      return;
    }
    
    for (let i = 0; i < this.passwordLength(); i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      newPassword += charset[randomIndex];
    }
    
    this.password.set(newPassword);
    this.copied.set(false);
  }

  copyToClipboard() {

    const password = this.password();
    if (!password) {
      return;
    }

    navigator.clipboard.writeText(password);
    this.toastService.success({ message: 'Password copied to clipboard' });
  }

}
