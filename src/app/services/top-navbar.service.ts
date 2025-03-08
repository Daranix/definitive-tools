import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TopNavbarService {
  readonly title = signal('Home');
  constructor() { }
}
