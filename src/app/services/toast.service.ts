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

export interface ToastSimpleMessage {
  message: string,
  duration?: number,
  position?: ToastPosition
}

export interface ToastMessage extends ToastSimpleMessage {
  type: ToastType,
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

  show({ type, message, duration = 3000, position = 'top-right' }: ToastMessage /*message: string, type: ToastType = 'info', duration: number = 3000, position: ToastPosition = 'top-right'*/): void {
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

  success({ message, duration, position }: ToastSimpleMessage): void {
    this.show({ message, type: 'success', duration, position });
  }

  error({ message, duration, position }: ToastSimpleMessage): void {
    this.show({ message, type: 'error', duration, position });
  }

  info({ message, duration, position }: ToastSimpleMessage): void {
    this.show({ message, type: 'info', duration, position });
  }

  warning({ message, duration, position }: ToastSimpleMessage): void {
    this.show({ message, type: 'warning', duration, position });
  }
}
