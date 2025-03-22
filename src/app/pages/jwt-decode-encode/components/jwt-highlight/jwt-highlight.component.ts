import { NgFor, NgIf } from '@angular/common';
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-jwt-highlight',
  imports: [NgFor, NgIf],
  templateUrl: './jwt-highlight.component.html',
  styleUrl: './jwt-highlight.component.scss'
})
export class JwtHighlightComponent {

  readonly jwt = input.required<string | undefined>();
  readonly highlighted = computed(() => this.highlight(this.jwt()));


  private highlight(jwt?: string): Array<{ text: string, class: string, separator: string }> {

    if (!jwt) {
      return [];
    };

    const parts = jwt.split('.');
    const displayParts = [];
    
    if (parts.length >= 1) {
      displayParts.push({
        text: parts[0],
        class: 'ace_header',
        separator: parts.length > 1 ? '.' : ''
      });
    }
    
    if (parts.length >= 2) {
      displayParts.push({
        text: parts[1],
        class: 'ace_payload',
        separator: parts.length > 2 ? '.' : ''
      });
    }
    
    if (parts.length >= 3) {
      displayParts.push({
        text: parts[2],
        class: 'ace_signature',
        separator: ''
      });
    }
    
    // If there are more parts (malformed JWT), add them as plain text
    for (let i = 3; i < parts.length; i++) {
      displayParts.push({
        text: parts[i],
        class: 'ace_plain',
        separator: i < parts.length - 1 ? '.' : ''
      });
    }

    return displayParts;
  }

}
