import { Component, computed, inject, model, resource } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import * as jose from 'jose'
import { ToastService } from '@/app/services/toast.service';
import { JsonPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JwtHighlightComponent } from '../jwt-highlight/jwt-highlight.component';


@Component({
  selector: 'app-jwt-encoder',
  imports: [LucideAngularModule, FormsModule, JwtHighlightComponent],
  templateUrl: './jwt-encoder.component.html',
  styleUrl: './jwt-encoder.component.scss'
})
export class JwtEncoderComponent {
 private readonly toastService = inject(ToastService);

  readonly secret = model<string>();
  readonly header = model<string>();
  readonly payload = model<string>();

  readonly jwt = resource({
    loader: ({ request }) => this.encodeJwt(request),
    request: () => ({ secret: this.secret(), payload: this.payload(), header: this.header() }),
  })

  async generateExample() {

    this.payload.set(JSON.stringify({
      "name": "John Doe",
      "admin": true
    }, null, 2));

    this.header.set(JSON.stringify({
      "alg": "HS256"
    }, null, 2));

    this.secret.set('my-secret-key');
  }

  async copyToClipboard(text?: string) {

    if(!text || text === '') return;

    await navigator.clipboard.writeText(text);
    this.toastService.info({ message: 'Copied to clipboard', position: 'bottom-center' });
  }

  private async encodeJwt({ secret, header, payload }: { secret?: string, payload?: string, header?: string }): Promise<{ token?: string; error?: boolean, errorMessage?: string }> {

    if(!secret || !payload || !header) {
      return { error: true, errorMessage: 'Please provide all required fields' };
    }

    try {
      const headerParsed = JSON.parse(header);
      const payloadParsed = JSON.parse(payload);
  
      const signKey = new TextEncoder().encode(secret);
  
      const token = await new jose.SignJWT(payloadParsed)
        .setProtectedHeader(headerParsed)
        .sign(signKey);
        return { token };
    } catch(ex: any) {
      return { error: true, errorMessage: ex.message };
    }


  }



}
