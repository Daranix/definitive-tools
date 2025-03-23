import { Component, inject, model } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { JwtDecoderComponent } from './components/jwt-decoder/jwt-decoder.component';
import { SelectButtonComponent } from '@/app/components/select-button/select-button.component';
import { FormsModule } from '@angular/forms';
import { JwtEncoderComponent } from './components/jwt-encoder/jwt-encoder.component';
import { MetadataService } from '@/app/services/metadata.service';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';


type Mode = 'decode' | 'encode';

@Component({
  selector: 'app-jwt-decode-encode',
  imports: [LucideAngularModule, JwtDecoderComponent, JwtEncoderComponent, SelectButtonComponent, FormsModule, TopNavbarComponent],
  templateUrl: './jwt-decode-encode.component.html',
  styleUrl: './jwt-decode-encode.component.scss'
})
export class JwtDecodeEncodeComponent {

  private readonly metadataService = inject(MetadataService);

  readonly modes: Array<{ label: string, value: Mode }> = [
    { label: 'JWT Decode', value: 'decode' },
    { label: 'JWT Encode', value: 'encode' }
  ];

  readonly selectedMode = model<Mode>('decode');

  constructor() {
    this.metadataService.updateMetadata({
      title: 'JWT Decode / Encode',
      description: 'Easily decode and encode JSON Web Tokens (JWT) for secure, verifiable authentication and authorization.',
      updateCanonical: true
    });
  }


}
