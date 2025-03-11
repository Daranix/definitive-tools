import { Component, inject, model, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DragAndDropFileComponent } from "@/app/components/drag-and-drop-file/drag-and-drop-file.component";
import { FormsModule } from '@angular/forms';
import { MetadataService } from '@/app/services/metadata.service';
import { BlobPipe } from '@/app/pipes/blob.pipe';

@Component({
  selector: 'app-background-remover',
  imports: [RouterLink, LucideAngularModule, DragAndDropFileComponent, FormsModule, BlobPipe],
  templateUrl: './background-remover.component.html',
  styleUrl: './background-remover.component.scss'
})
export class BackgroundRemoverComponent {
  
  private readonly metadataService = inject(MetadataService);
  readonly file = signal<File | undefined>(undefined);

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Background Remover',
      description: 'Remove backgrounds from images instantly. Create professional-looking transparent images for your projects, products, and designs.',
      updateCanonical: true
    })
  }

  async removeBackground() {

  }

  cancel() {
    this.file.set(undefined);
  }

}
