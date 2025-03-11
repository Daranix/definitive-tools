// toast.service.ts
import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
  position: ToastPosition;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts: Toast[] = [];
  private toastSubject = new Subject<Toast[]>();
  private counter = 0;

  getToasts(): Observable<Toast[]> {
    return this.toastSubject.asObservable();
  }

  show(message: string, type: ToastType = 'info', duration: number = 3000, position: ToastPosition = 'top-right'): void {
    const toast: Toast = {
      id: this.counter++,
      message,
      type,
      duration,
      position
    };

    this.toasts.push(toast);
    this.toastSubject.next([...this.toasts]);

    if (duration > 0) {
      setTimeout(() => this.remove(toast.id), duration);
    }
  }

  remove(id: number): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.toastSubject.next([...this.toasts]);
  }

  success(message: string, duration: number = 3000, position: ToastPosition = 'top-right'): void {
    this.show(message, 'success', duration, position);
  }

  error(message: string, duration: number = 3000, position?: ToastPosition): void {
    this.show(message, 'error', duration, position);
  }

  info(message: string, duration: number = 3000, position?: ToastPosition): void {
    this.show(message, 'info', duration, position);
  }

  warning(message: string, duration: number = 3000, position?: ToastPosition): void {
    this.show(message, 'warning', duration, position);
  }
}
