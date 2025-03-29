import { DOCUMENT } from '@angular/common';
import { contentChild, Directive, ElementRef, HostListener, inject, Input, OnInit, Renderer2, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[appContextMenu]'
})
export class ContextMenuDirective implements OnInit {

  private readonly document = inject(DOCUMENT);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly renderer = inject(Renderer2);
  private readonly el = inject(ElementRef);
  private readonly contextMenuContent = contentChild<TemplateRef<any>>('contextMenuContent');

  private scrollListener: (() => void) | null = null;
  
  private menuElement: HTMLElement | null = null;
  private isMenuOpen = false;

  ngOnInit() {
    // Create menu element when directive is initialized
    this.createMenu();
    
    // Close menu when clicking outside
    this.renderer.listen('document', 'click', (event: Event) => {
      if (this.isMenuOpen && !this.el.nativeElement.contains(event.target) && 
          !this.menuElement?.contains(event.target as Node)) {
        this.closeMenu();
      }
    });
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

  private createMenu() {
    // Create the menu container
    this.menuElement = this.renderer.createElement('div');
    this.renderer.setStyle(this.menuElement, 'position', 'absolute');
    
    // Add the menu to the body
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
    
    // Position the menu near the button
    const buttonRect = this.el.nativeElement.getBoundingClientRect();
    
    this.renderer.setStyle(this.menuElement, 'top', `${buttonRect.bottom + window.scrollY}px`);
    this.renderer.setStyle(this.menuElement, 'left', `${buttonRect.left + window.scrollX}px`);
    this.renderer.setStyle(this.menuElement, 'display', 'block');

    this.scrollListener = this.renderer.listen('window', 'scroll', () => this.positionMenu(), { capture: true });
    
    this.isMenuOpen = true;
  }

  private closeMenu() {
    if (this.menuElement) {
      this.renderer.setStyle(this.menuElement, 'display', 'none');
      
      // Clear view container to prevent memory leaks
      this.viewContainerRef.clear();
    }
    this.isMenuOpen = false;
  }

  
  private positionMenu() {
    if (!this.menuElement || !this.el.nativeElement) return;

    // Get the bounding rectangle of the trigger element
    const triggerRect = this.el.nativeElement.getBoundingClientRect();

    // Calculate the position
    const left = triggerRect.left;
    const top = triggerRect.bottom + window.scrollY;

    // Set the position of the popper
    this.renderer.setStyle(this.menuElement, 'left', `${left}px`);
    this.renderer.setStyle(this.menuElement, 'top', `${top}px`);
  }

  ngOnDestroy() {
    // Clean up by removing menu element when directive is destroyed
    if (this.menuElement) {
      this.renderer.removeChild(this.document.body, this.menuElement);
      this.viewContainerRef.clear();
    }

    if (this.scrollListener) {
      this.scrollListener();
    }
    
  }
}