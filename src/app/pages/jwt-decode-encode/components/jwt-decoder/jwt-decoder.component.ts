import { JsonPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, model, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import * as jose from 'jose'
import { ToastService } from '@/app/services/toast.service';
import { JwtHighlightComponent } from '../jwt-highlight/jwt-highlight.component';


@Component({
  selector: 'app-jwt-decoder',
  imports: [LucideAngularModule, NgClass, FormsModule, JsonPipe, JwtHighlightComponent],
  templateUrl: './jwt-decoder.component.html',
  styleUrl: './jwt-decoder.component.scss'
})
export class JwtDecoderComponent {

  private readonly toastService = inject(ToastService);

  readonly secret = model<string>();
  readonly jwtEncoded = model<string>();
  readonly jwtDecoded = computed(() => this.decodeJwt());
  readonly isSecretValid = resource({
    loader: ({ request }) => this.validateToken(request),
    request: () => ({ token: this.jwtEncoded(), secret: this.secret() }),
  })

  async generateExample() {

    const examplePayload = {
      "name": "John Doe",
      "admin": true
    }

    this.secret.set('my-secret-key');

    const encoder = new TextEncoder();
    const data = encoder.encode(this.secret()!);

    const token = new jose.SignJWT(examplePayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(data);

    const result = await token;
    this.jwtEncoded.set(result);
  }

  private decodeJwt(): { header: Object, payload: Object, error?: boolean, errorMessage?: string }  {

    const jwt = this.jwtEncoded();
    if (!jwt) return { header: {}, payload: {} };

    const tokenSplit = jwt.split('.');

    try {
      const header = JSON.parse(atob(tokenSplit[0]));
      const payload = JSON.parse(atob(tokenSplit[1]));
  
      return { header, payload };
    } catch(ex: any) {
      return { header: {}, payload: {}, error: true, errorMessage: ex.message };
    }
  }

  private async validateToken({ token, secret }: { token?: string, secret?: string }): Promise<boolean> {

    if (!secret || !token) return false;

    const secretBuffer = new TextEncoder().encode(secret);

    try {
      await jose.jwtVerify(token, secretBuffer);
      return true;
    } catch(ex) {
      return false;
    }

  }

  async copyToClipboard(text?: string) {

    if(!text || text === '') return;

    await navigator.clipboard.writeText(text);
    this.toastService.info({ message: 'Copied to clipboard', position: 'bottom-center' });
  }

  toJson(obj: any) {
    return JSON.stringify(obj, null, 2);
  }

}
