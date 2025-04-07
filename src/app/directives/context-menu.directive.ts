import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { contentChild, Directive, ElementRef, HostListener, inject, Input, OnInit, PLATFORM_ID, Renderer2, signal, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[appContextMenu]'
})
export class ContextMenuDirective implements OnInit {
  // Mobile breakpoint (in pixels)
  private readonly MOBILE_BREAKPOINT = 768;

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly renderer = inject(Renderer2);
  private readonly el = inject(ElementRef);
  private readonly contextMenuContent = contentChild<TemplateRef<any>>('contextMenuContent');

  private scrollListener: (() => void) | null = null;
  private resizeListener: (() => void) | null = null;
  
  private readonly isMobileViewOpen = signal(false);

  private menuElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private isMenuOpen = false;

  ngOnInit() {

    if(isPlatformBrowser(this.platformId)) {

      // Create menu elements when directive is initialized
      this.createMenuElements();
      
      // Listen for window resize events
      this.resizeListener = this.renderer.listen('window', 'resize', () => {
          if(this.isMenuOpen) {
            this.closeMenu();
          }
      });
      
      // Close menu when clicking outside
      this.renderer.listen('document', 'click', (event: Event) => {
        if (this.isMenuOpen && !this.el.nativeElement.contains(event.target) && 
            !this.menuElement?.contains(event.target as Node)) {
          this.closeMenu();
        }
      });
    }
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.isMenuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  private isMobileView() {
    return window.innerWidth < this.MOBILE_BREAKPOINT;
  }

  private createMenuElements() {
    // Create the menu container
    this.menuElement = this.renderer.createElement('div');
    
    // Create overlay for mobile view
    this.overlayElement = this.renderer.createElement('div');
    this.renderer.setStyle(this.overlayElement, 'position', 'fixed');
    this.renderer.setStyle(this.overlayElement, 'top', '0');
    this.renderer.setStyle(this.overlayElement, 'left', '0');
    this.renderer.setStyle(this.overlayElement, 'width', '100%');
    this.renderer.setStyle(this.overlayElement, 'height', '100%');
    this.renderer.setStyle(this.overlayElement, 'background-color', 'rgba(0, 0, 0, 0.5)');
    this.renderer.setStyle(this.overlayElement, 'z-index', '999');
    this.renderer.setStyle(this.overlayElement, 'display', 'none');
    
    // Add elements to the body
    this.renderer.appendChild(this.document.body, this.overlayElement);
    this.renderer.appendChild(this.document.body, this.menuElement);
  }

  private openMenu() {
    const content = this.contextMenuContent();
    if (!this.menuElement || !content) return;
    
    // Clear any existing content
    while (this.menuElement.firstChild) {
      this.renderer.removeChild(this.menuElement, this.menuElement.firstChild);
    }
    
    // Create an embedded view from the template
    const embeddedViewRef = this.viewContainerRef.createEmbeddedView(content);
    
    // Append template nodes to menu element
    embeddedViewRef.rootNodes.forEach(node => {
      this.renderer.appendChild(this.menuElement!, node);
    });
    
    if (this.isMobileView()) {
      this.openBottomSheet();
    } else {
      this.openContextMenu();
    }
    
    this.isMenuOpen = true;
  }

  private openContextMenu() {
    if (!this.menuElement) return;
    
    // Set positioning as regular context menu
    this.renderer.setStyle(this.menuElement, 'position', 'absolute');
    this.renderer.setStyle(this.menuElement, 'bottom', null);
    this.renderer.setStyle(this.menuElement, 'left', null);
    this.renderer.setStyle(this.menuElement, 'width', null);
    this.renderer.setStyle(this.menuElement, 'border-radius', null);
    this.renderer.setStyle(this.menuElement, 'transform', null);
    this.renderer.setStyle(this.menuElement, 'transition', null);
    this.renderer.setStyle(this.menuElement, 'max-height', null);
    this.renderer.setStyle(this.menuElement, 'overflow-y', null);
    this.renderer.setStyle(this.menuElement, 'z-index', '1000');
    
    // Position the menu near the button
    const buttonRect = this.el.nativeElement.getBoundingClientRect();
    
    this.renderer.setStyle(this.menuElement, 'top', `${buttonRect.bottom + window.scrollY}px`);
    this.renderer.setStyle(this.menuElement, 'left', `${buttonRect.left + window.scrollX}px`);
    this.renderer.setStyle(this.menuElement, 'display', 'block');

    this.scrollListener = this.renderer.listen('window', 'scroll', () => this.positionContextMenu(), { capture: true });
  }

  private openBottomSheet() {
    if (!this.menuElement || !this.overlayElement) return;
    
    // Show overlay
    this.renderer.setStyle(this.overlayElement, 'display', 'block');
    
    // Set bottom sheet styling
    this.renderer.setStyle(this.menuElement, 'position', 'fixed');
    this.renderer.setStyle(this.menuElement, 'bottom', '0');
    this.renderer.setStyle(this.menuElement, 'left', '0');
    this.renderer.setStyle(this.menuElement, 'width', '100%');
    this.renderer.setStyle(this.menuElement, 'background-color', 'white');
    this.renderer.setStyle(this.menuElement, 'border-top-left-radius', '16px');
    this.renderer.setStyle(this.menuElement, 'border-top-right-radius', '16px');
    this.renderer.setStyle(this.menuElement, 'box-shadow', '0px -2px 10px rgba(0, 0, 0, 0.1)');
    this.renderer.setStyle(this.menuElement, 'z-index', '1000');
    this.renderer.setStyle(this.menuElement, 'max-height', '80%');
    this.renderer.setStyle(this.menuElement, 'overflow-y', 'auto');
    this.renderer.setStyle(this.menuElement, 'transform', 'translateY(100%)');
    this.renderer.setStyle(this.menuElement, 'transition', 'transform 0.3s ease-out');
    this.renderer.setStyle(this.menuElement, 'display', 'block');
    
    // Add drag handle indicator if not already present
    const handleElement = this.renderer.createElement('div');
    this.renderer.setStyle(handleElement, 'width', '40px');
    this.renderer.setStyle(handleElement, 'height', '5px');
    this.renderer.setStyle(handleElement, 'background-color', '#e0e0e0');
    this.renderer.setStyle(handleElement, 'border-radius', '2.5px');
    this.renderer.setStyle(handleElement, 'margin', '12px auto');
    
    // Insert handle at the beginning of the menu element
    this.renderer.insertBefore(this.menuElement, handleElement, this.menuElement.firstChild);
    
    // Prevent body scrolling
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
    
    // Animate bottom sheet entrance
    setTimeout(() => {
      this.renderer.setStyle(this.menuElement, 'transform', 'translateY(0)');
    }, 10);

    this.isMobileViewOpen.set(true);
  }

  private closeMenu() {
    if (!this.menuElement) return;
    
    if (this.isMobileViewOpen()) {
      this.closeBottomSheet();
    } else {
      this.closeContextMenu();
    }
    
    this.isMenuOpen = false;
  }

  private closeContextMenu() {
    if (!this.menuElement) return;
    
    this.renderer.setStyle(this.menuElement, 'display', 'none');
    
    // Remove scroll listener
    if (this.scrollListener) {
      this.scrollListener();
      this.scrollListener = null;
    }
    
    // Clear view container to prevent memory leaks
    this.viewContainerRef.clear();
  }

  private closeBottomSheet() {
    if (!this.menuElement || !this.overlayElement) return;
    
    // Animate sheet closing
    this.renderer.setStyle(this.menuElement, 'transform', 'translateY(100%)');
    
    // Hide overlay and restore body scrolling after animation
    setTimeout(() => {
      this.renderer.setStyle(this.overlayElement, 'display', 'none');
      this.renderer.setStyle(this.menuElement, 'display', 'none');
      this.renderer.setStyle(this.document.body, 'overflow', 'auto');
      
      // Clear view container to prevent memory leaks
      this.viewContainerRef.clear();
    }, 300);
  }

  private positionContextMenu() {
    if (!this.menuElement || !this.el.nativeElement) return;

    // Get the bounding rectangle of the trigger element
    const triggerRect = this.el.nativeElement.getBoundingClientRect();

    // Calculate the position
    const left = triggerRect.left + window.scrollX;
    const top = triggerRect.bottom + window.scrollY;

    // Set the position of the menu
    this.renderer.setStyle(this.menuElement, 'left', `${left}px`);
    this.renderer.setStyle(this.menuElement, 'top', `${top}px`);
  }

  ngOnDestroy() {
    // Clean up by removing elements when directive is destroyed
    if (this.menuElement) {
      this.renderer.removeChild(this.document.body, this.menuElement);
    }
    
    if (this.overlayElement) {
      this.renderer.removeChild(this.document.body, this.overlayElement);
    }
    
    this.viewContainerRef.clear();
    
    // Remove event listeners
    if (this.scrollListener) {
      this.scrollListener();
    }
    
    if (this.resizeListener) {
      this.resizeListener();
    }
  }
}