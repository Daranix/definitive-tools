import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { JwtDecoderComponent } from './components/jwt-decoder/jwt-decoder.component';

@Component({
  selector: 'app-jwt-decode-encode',
  imports: [LucideAngularModule, JwtDecoderComponent],
  templateUrl: './jwt-decode-encode.component.html',
  styleUrl: './jwt-decode-encode.component.scss'
})
export class JwtDecodeEncodeComponent {

}
