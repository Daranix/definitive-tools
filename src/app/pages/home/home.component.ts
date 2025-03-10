import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, File } from 'lucide-angular';
import { TOOLS } from '../../utils/constants';
import { MetadataService } from '@app/services/metadata.service';

@Component({
  selector: 'app-home',
  imports: [LucideAngularModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  private readonly metadataService = inject(MetadataService);

  readonly tools = TOOLS;

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Definitive Tools - Free Digital Utilities',
      description: 'Access free, easy-to-use tools for all your digital needs without registration or downloads.',
      keywords: 'online tools, free tools, digital tools, web tools, QR generator, utility tools'
    });
  }

}
