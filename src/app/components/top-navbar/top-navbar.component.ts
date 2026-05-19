import { TOOLS } from '@/app/utils/constants';
import { Component, computed, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '@app/services/toast.service';

@Component({
  selector: 'app-top-navbar',
  imports: [LucideAngularModule, RouterLink],
  templateUrl: './top-navbar.component.html',
  styleUrl: './top-navbar.component.scss'
})
export class TopNavbarComponent {

  readonly activatedRoute = inject(ActivatedRoute);
  readonly toastService = inject(ToastService);
  
  readonly info = computed(() => this.getToolInfo());
  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly isFavorite = signal<boolean>(false);

  constructor() {
    effect(() => {
      const toolInfo = this.info();
      if (toolInfo) {
        const favs = this.getFavorites();
        this.isFavorite.set(favs.includes(toolInfo.id));
      }
    });
  }

  private getToolInfo() {
    const id = this.activatedRoute.snapshot.data['id'];
    const tool = TOOLS.find(tool => tool.id === id);
    if(tool) {
      return tool;
    }

    return undefined;
  }

  private getFavorites(): string[] {
    try {
      return JSON.parse(localStorage.getItem('favorite-tools') || '[]');
    } catch {
      return [];
    }
  }

  toggleFavorite() {
    const toolInfo = this.info();
    if (!toolInfo) return;
    
    let favs = this.getFavorites();
    if (favs.includes(toolInfo.id)) {
      favs = favs.filter(id => id !== toolInfo.id);
      this.isFavorite.set(false);
      this.toastService.info({ message: `${toolInfo.name} removed from favorites.` });
    } else {
      favs.push(toolInfo.id);
      this.isFavorite.set(true);
      this.toastService.success({ message: `${toolInfo.name} added to favorites!` });
    }
    localStorage.setItem('favorite-tools', JSON.stringify(favs));
  }

  shareTool() {
    const toolInfo = this.info();
    if (!toolInfo) return;

    const shareData = {
      title: `${toolInfo.name} - Definitive Tools`,
      text: toolInfo.description,
      url: window.location.href
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData)
        .then(() => this.toastService.success({ message: 'Shared successfully!' }))
        .catch(err => {
          if (err.name !== 'AbortError') {
            this.fallbackShare();
          }
        });
    } else {
      this.fallbackShare();
    }
  }

  private fallbackShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.toastService.success({ message: 'Link copied to clipboard!' });
    }).catch(() => {
      this.toastService.error({ message: 'Failed to copy link to clipboard.' });
    });
  }

}
