import { CommonModule, KeyValuePipe, NgClass } from '@angular/common';
import { Component, computed, ElementRef, model, signal, viewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Key, LucideAngularModule } from 'lucide-angular';
import { ZodFormComponent } from "../../components/zod-form/zod-form.component";
import { z } from 'zod';
import QRCode from 'qrcode';
import { QrContentType, QrSchemas, QrZodSchema } from './qr-generator.schemas';
import { RouterLink } from '@angular/router';


const ERROR_CORRECTION_LEVELS = [
  { id: 'low', name: 'Low (L)' },
  { id: 'medium', name: 'Medium (M)' },
  { id: 'quartile', name: 'Quartile (Q)' },
  { id: 'high', name: 'High (H)' }
] as const;

const CONTENT_TYPES = [
  { id: 'url', name: 'URL', icon: 'link' },
  { id: 'text', name: 'Text', icon: 'case-upper' },
  { id: 'email', name: 'Email', icon: 'at-sign' },
  { id: 'phone', name: 'Phone', icon: 'phone' },
  { id: 'sms', name: 'SMS', icon: 'tablet-smartphone' },
  { id: 'vcard', name: 'vCard', icon: 'id-card' },
  { id: 'wifi', name: 'WiFi', icon: 'wifi' },
  { id: 'geo', name: 'Location', icon: 'map-pin' }
] as const;

export const ENCRYPTION_TYPES = [
  { id: 'wpa', name: 'WPA/WPA2' },
  { id: 'wep', name: 'WEP' },
  { id: 'none', name: 'None' }
]

@Component({
  selector: 'app-qr-generator',
  imports: [LucideAngularModule, NgClass, ReactiveFormsModule, ZodFormComponent, RouterLink, KeyValuePipe],
  templateUrl: './qr-generator.component.html',
  styleUrl: './qr-generator.component.scss'
})
export class QrGeneratorComponent {

  readonly contentTypes = CONTENT_TYPES;
  readonly errorCorrectionLevels = ERROR_CORRECTION_LEVELS;
  readonly encryptionTypes = ENCRYPTION_TYPES;

  readonly selectedContentType = model<QrContentType>('url');
  readonly lastQrGenerated = signal<string | undefined>(undefined);
  readonly lastQrCodeSvgElement = signal<SVGElement | undefined>(undefined);
  readonly lastQrObject = signal<QRCode.QRCode | undefined>(undefined);

  readonly formSchema = computed(() => QrSchemas[this.selectedContentType()]);
  readonly generatorForm = viewChild.required<ZodFormComponent<QrZodSchema>>('generatorForm');
  readonly formGroup = computed(() => this.generatorForm().formGroup());

  generateQrCode(data: unknown) {
    console.log(data);
    const qr = QRCode.create('prueba');
    const svg = this.generateSVG(qr);
    const url = this.svgToDataURL(svg);
    this.lastQrGenerated.set(url);
    this.lastQrCodeSvgElement.set(svg);
    this.lastQrObject.set(qr);
  }

  private svgToText(svg: SVGElement) {
    return svg.outerHTML;
  }

  private svgToDataURL(svg: SVGElement) {
    const svgCode = this.svgToText(svg);
    const blob = new Blob([svgCode], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    return url;
  }

  private generateSVG(qr: QRCode.QRCode) {

    const size = qr.modules.size;
    const data = qr.modules.data;

    const matrix: number[][] = [];
    for (let i = 0; i < data.length; i++) {
      const col = Math.floor(i % size);
      const row = Math.floor(i / size);

      if(!matrix[row]) {
        matrix[row] = [];
      }
      matrix[row][col] = data[i];
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", '100%');
    svg.setAttribute("height", '100%');
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

    // Background
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", "white");
    svg.appendChild(background);

    // Draw modules based on style
    matrix.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const moduleElement = this.createModule(x, y);
          if (moduleElement) {
            svg.appendChild(moduleElement);
          }
        }
      });
    });

    return svg;
  }

  private createModule(x: number, y: number) {
    const module = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    module.setAttribute("x", x.toString());
    module.setAttribute("y", y.toString());
    module.setAttribute("width", '1');
    module.setAttribute("height", '1');
    module.setAttribute("fill", "black");
    return module;
  }

  downloadAsPng() {

  }

  async getCurrentLocation() {
    try {
      const position = await this.getCurrentLocationPromise();
      console.log(position);
    } catch (error) {
      console.error(error);
    }
  }

  private async getCurrentLocationPromise() {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

}
