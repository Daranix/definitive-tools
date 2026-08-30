import {
  Component,
  ElementRef,
  ViewChild,
  signal,
  computed,
  effect,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { MetadataService } from '@app/services/metadata.service';
import { ToastService } from '@app/services/toast.service';

export interface MemeTemplate {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  box_count: number;
}

export interface TextBox {
  id: string;
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage (0-100)
  height: number; // percentage (0-100)
  fontSize: number; // px (relative to preview size or absolute, we can store px relative to standard preview height e.g. 500px, then scale)
  color: string;
  outlineColor: string;
  outlineWidth: number;
  uppercase: boolean;
  alignment: 'left' | 'center' | 'right';
  fontFamily: string;
}

const PRESET_TEMPLATES: MemeTemplate[] = [
  {
    id: '181913649',
    name: 'Drake Hotline Bling',
    url: 'https://api.imgflip.com/s/meme/Drake-Hotline-Bling.jpg',
    width: 1200,
    height: 1200,
    box_count: 2,
  },
  {
    id: '112126428',
    name: 'Distracted Boyfriend',
    url: 'https://api.imgflip.com/s/meme/Distracted-Boyfriend.jpg',
    width: 1200,
    height: 800,
    box_count: 3,
  },
  {
    id: '87743020',
    name: 'Two Buttons',
    url: 'https://api.imgflip.com/s/meme/Two-Buttons.jpg',
    width: 600,
    height: 908,
    box_count: 3,
  },
  {
    id: '124822590',
    name: 'Left Exit 12 Off Ramp',
    url: 'https://api.imgflip.com/s/meme/Left-Exit-12-Off-Ramp.jpg',
    width: 800,
    height: 685,
    box_count: 3,
  },
  {
    id: '129242436',
    name: 'Change My Mind',
    url: 'https://api.imgflip.com/s/meme/Change-My-Mind.jpg',
    width: 482,
    height: 361,
    box_count: 2,
  },
  {
    id: '438347',
    name: 'Batman Slapping Robin',
    url: 'https://api.imgflip.com/s/meme/Batman-Slapping-Robin.jpg',
    width: 400,
    height: 387,
    box_count: 2,
  },
  {
    id: '97984',
    name: 'Disaster Girl',
    url: 'https://api.imgflip.com/s/meme/Disaster-Girl.jpg',
    width: 500,
    height: 375,
    box_count: 2,
  },
  {
    id: '61579',
    name: 'One Does Not Simply',
    url: 'https://api.imgflip.com/s/meme/One-Does-Not-Simply.jpg',
    width: 568,
    height: 335,
    box_count: 2,
  },
];

const FONTS = ['Impact', 'Arial', 'Montserrat', 'Comic Sans MS', 'Courier New', 'Georgia'];

@Component({
  selector: 'app-meme-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideIconComponent, TopNavbarComponent, FooterComponent],
  templateUrl: './meme-generator.component.html',
  styleUrl: './meme-generator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemeGeneratorComponent implements OnInit {
  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);
  private readonly ngZone = inject(NgZone);

  @ViewChild('previewImage') previewImageEl!: ElementRef<HTMLImageElement>;
  @ViewChild('previewContainer') previewContainerEl!: ElementRef<HTMLDivElement>;

  readonly templates = signal<MemeTemplate[]>(PRESET_TEMPLATES);
  readonly searchQuery = signal<string>('');
  readonly selectedTemplate = signal<MemeTemplate>(PRESET_TEMPLATES[0]);
  readonly customImage = signal<string | null>(null);
  readonly textBoxes = signal<TextBox[]>([]);
  readonly activeBoxId = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly fontFamilies = signal<string[]>(FONTS);

  // Drag state
  private dragBoxId: string | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartBoxX = 0;
  private dragStartBoxY = 0;
  private draggedElement: HTMLElement | null = null;
  private draggedBox: TextBox | null = null;
  private draggedIndex = -1;

  private readonly onDragMoveBound = (e: MouseEvent | TouchEvent) => this.dragMove(e);
  private readonly onDragEndBound = () => this.dragEnd();

  readonly filteredTemplates = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.templates();
    return this.templates().filter((t) => t.name.toLowerCase().includes(q));
  });

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Meme Generator - Definitive Tools',
      description: 'Create funny memes with custom text overlays, drag-and-drop captions, font styling, and popular templates.',
      keywords: 'meme generator, meme maker, create meme, drag text meme, custom meme generator, free meme creator',
    });

    // Automatically set default boxes when a template is selected
    effect(() => {
      const template = this.selectedTemplate();
      // Skip custom image reset
      if (this.customImage()) return;
      this.resetTextBoxesForTemplate(template);
    });
  }

  ngOnInit() {
    this.fetchImgflipTemplates();
  }

  async fetchImgflipTemplates() {
    this.isLoading.set(true);
    try {
      const res = await fetch('https://api.imgflip.com/get_memes');
      const data = await res.json();
      if (data.success && data.data?.memes?.length) {
        // Merge preset with API memes, avoiding duplicates
        const apiMemes: MemeTemplate[] = data.data.memes;
        const merged = [...PRESET_TEMPLATES];
        for (const m of apiMemes) {
          if (!merged.some((p) => p.id === m.id)) {
            merged.push(m);
          }
        }
        this.templates.set(merged);
      }
    } catch (e) {
      console.warn('Could not fetch memes from Imgflip API, using local presets.', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  resetTextBoxesForTemplate(template: MemeTemplate) {
    const count = template.box_count || 2;
    const boxes: TextBox[] = [];
    for (let i = 0; i < count; i++) {
      // Default: top text and bottom text
      const isTop = i === 0;
      const isBottom = i === count - 1 && count > 1;
      let y = 45;
      if (isTop) y = 5;
      if (isBottom) y = 80;

      boxes.push({
        id: `box-${Date.now()}-${i}`,
        text: i === 0 ? 'TOP TEXT' : i === 1 ? 'BOTTOM TEXT' : `TEXT BOX ${i + 1}`,
        x: 10,
        y: y,
        width: 80,
        height: 15,
        fontSize: 32,
        color: '#FFFFFF',
        outlineColor: '#000000',
        outlineWidth: 4,
        uppercase: true,
        alignment: 'center',
        fontFamily: 'Impact',
      });
    }
    this.textBoxes.set(boxes);
    if (boxes.length > 0) {
      this.activeBoxId.set(boxes[0].id);
    } else {
      this.activeBoxId.set(null);
    }
  }

  selectTemplate(template: MemeTemplate) {
    this.customImage.set(null);
    this.selectedTemplate.set(template);
  }

  addTextBox() {
    const newBox: TextBox = {
      id: `box-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: 'NEW TEXT',
      x: 20,
      y: 40,
      width: 60,
      height: 15,
      fontSize: 28,
      color: '#FFFFFF',
      outlineColor: '#000000',
      outlineWidth: 4,
      uppercase: true,
      alignment: 'center',
      fontFamily: 'Impact',
    };
    this.textBoxes.update((boxes) => [...boxes, newBox]);
    this.activeBoxId.set(newBox.id);
  }

  removeTextBox(id: string) {
    this.textBoxes.update((boxes) => boxes.filter((b) => b.id !== id));
    if (this.activeBoxId() === id) {
      const current = this.textBoxes();
      this.activeBoxId.set(current.length ? current[0].id : null);
    }
  }

  onCustomImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        this.customImage.set(url);
        // Create a dummy template representation
        const customTpl: MemeTemplate = {
          id: 'custom',
          name: file.name || 'Custom Image',
          url: url,
          width: 800,
          height: 600,
          box_count: 2,
        };
        this.selectedTemplate.set(customTpl);
        this.resetTextBoxesForTemplate(customTpl);
      };
      reader.readAsDataURL(file);
    }
  }

  selectBox(id: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.activeBoxId.set(id);
  }

  updateActiveBox(field: keyof TextBox, value: any) {
    const activeId = this.activeBoxId();
    if (!activeId) return;
    this.textBoxes.update((boxes) =>
      boxes.map((b) => (b.id === activeId ? { ...b, [field]: value } : b))
    );
  }

  // Drag handlers
  onDragStart(boxId: string, event: MouseEvent | TouchEvent) {
    event.preventDefault();
    this.selectBox(boxId);
    this.dragBoxId = boxId;
    this.draggedElement = event.currentTarget as HTMLElement;

    const isTouch = event instanceof TouchEvent;
    const clientX = isTouch ? event.touches[0].clientX : event.clientX;
    const clientY = isTouch ? event.touches[0].clientY : event.clientY;

    this.dragStartX = clientX;
    this.dragStartY = clientY;

    const index = this.textBoxes().findIndex((b) => b.id === boxId);
    this.draggedIndex = index;
    if (index !== -1) {
      this.draggedBox = this.textBoxes()[index];
      this.dragStartBoxX = this.draggedBox.x;
      this.dragStartBoxY = this.draggedBox.y;
    }

    // Attach window level drag handlers outside of Zone.js for high performance dragging
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('mousemove', this.onDragMoveBound);
      window.addEventListener('touchmove', this.onDragMoveBound, { passive: false });
      window.addEventListener('mouseup', this.onDragEndBound);
      window.addEventListener('touchend', this.onDragEndBound);
    });
  }

  private dragMove(event: MouseEvent | TouchEvent) {
    if (!this.dragBoxId || !this.draggedElement || !this.draggedBox) return;

    const isTouch = event instanceof TouchEvent;
    const clientX = isTouch ? event.touches[0].clientX : event.clientX;
    const clientY = isTouch ? event.touches[0].clientY : event.clientY;

    const containerRect = this.previewContainerEl.nativeElement.getBoundingClientRect();

    const deltaX = ((clientX - this.dragStartX) / containerRect.width) * 100;
    const deltaY = ((clientY - this.dragStartY) / containerRect.height) * 100;

    let newX = Math.max(0, Math.min(100 - this.draggedBox.width, this.dragStartBoxX + deltaX));
    let newY = Math.max(0, Math.min(100 - this.draggedBox.height, this.dragStartBoxY + deltaY));

    // Update style directly on the element! No DOM queries, no array searches!
    this.draggedElement.style.left = `${newX.toFixed(2)}%`;
    this.draggedElement.style.top = `${newY.toFixed(2)}%`;
  }

  private dragEnd() {
    if (!this.dragBoxId || !this.draggedElement) return;

    // Unregister window events
    window.removeEventListener('mousemove', this.onDragMoveBound);
    window.removeEventListener('touchmove', this.onDragMoveBound);
    window.removeEventListener('mouseup', this.onDragEndBound);
    window.removeEventListener('touchend', this.onDragEndBound);

    // Get final values from DOM styles and update the signal inside the Angular zone
    const finalX = parseFloat(this.draggedElement.style.left) || 0;
    const finalY = parseFloat(this.draggedElement.style.top) || 0;

    this.ngZone.run(() => {
      this.textBoxes.update((boxes) => {
        const next = [...boxes];
        if (next[this.draggedIndex]) {
          next[this.draggedIndex] = { ...next[this.draggedIndex], x: finalX, y: finalY };
        }
        return next;
      });
      this.dragBoxId = null;
      this.draggedElement = null;
      this.draggedBox = null;
      this.draggedIndex = -1;
    });
  }

  async downloadMeme() {
    const template = this.selectedTemplate();
    const boxes = this.textBoxes();
    const imgUrl = template.url;

    this.toastService.info({ message: 'Generating meme...' });

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load template image.'));
        img.src = imgUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D canvas context.');

      canvas.width = img.naturalWidth || template.width || 800;
      canvas.height = img.naturalHeight || template.height || 600;

      // Draw original template image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw all text boxes
      for (const box of boxes) {
        let text = box.uppercase ? box.text.toUpperCase() : box.text;
        if (!text.trim()) continue;

        const x = (box.x / 100) * canvas.width;
        const y = (box.y / 100) * canvas.height;
        const width = (box.width / 100) * canvas.width;
        const height = (box.height / 100) * canvas.height;

        // Font scaling based on canvas size
        // Assume default box fontSize is calibrated for a ~500px preview container height
        const scaleFactor = canvas.height / 500;
        const fontSize = Math.max(12, box.fontSize * scaleFactor);

        ctx.font = `bold ${fontSize}px ${box.fontFamily}`;
        ctx.fillStyle = box.color;
        ctx.strokeStyle = box.outlineColor;
        ctx.lineWidth = box.outlineWidth * scaleFactor;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;

        // Wrap text algorithm
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (let n = 0; n < words.length; n++) {
          const testLine = currentLine ? currentLine + ' ' + words[n] : words[n];
          const metrics = ctx.measureText(testLine);
          if (metrics.width > width && n > 0) {
            lines.push(currentLine);
            currentLine = words[n];
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }

        // Draw wrapped lines
        const lineHeight = fontSize * 1.2;
        const totalTextHeight = lines.length * lineHeight;
        
        // Vertically center text inside the box height
        const startY = y + (height - totalTextHeight) / 2 + fontSize * 0.85;

        lines.forEach((line, index) => {
          const lineY = startY + index * lineHeight;
          let lineX = x;

          if (box.alignment === 'center') {
            ctx.textAlign = 'center';
            lineX = x + width / 2;
          } else if (box.alignment === 'right') {
            ctx.textAlign = 'right';
            lineX = x + width;
          } else {
            ctx.textAlign = 'left';
            lineX = x;
          }

          if (box.outlineWidth > 0) {
            ctx.strokeText(line, lineX, lineY);
          }
          ctx.fillText(line, lineX, lineY);
        });
      }

      // Trigger download
      const mimeType = 'image/jpeg';
      const url = canvas.toDataURL(mimeType, 0.9);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}-meme.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      this.toastService.success({ message: 'Meme downloaded successfully!' });
    } catch (error) {
      console.error(error);
      this.toastService.error({ message: 'Failed to generate meme. Please try again.' });
    }
  }
}
