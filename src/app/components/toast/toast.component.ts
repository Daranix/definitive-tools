import { Toast, ToastPosition, ToastService } from '@app/services/toast.service';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { NgClass } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-toast',
    imports: [NgClass],
    templateUrl: './toast.component.html',
    styleUrl: './toast.component.scss',
    animations: [
        trigger('toastAnimation', [
            state('void', style({
                transform: 'translateX(100%)',
                opacity: 0
            })),
            state('*', style({
                transform: 'translateX(0)',
                opacity: 1
            })),
            transition('void => *', animate('300ms ease-in')),
            transition('* => void', animate('300ms ease-out'))
        ])
    ]
})
export class ToastComponent implements OnInit, OnDestroy{
  toasts: Toast[] = [];
  readonly positions: ToastPosition[] = ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'];
  private subscription?: Subscription;
  private readonly toastService = inject(ToastService);

  ngOnInit(): void {
    this.subscription = this.toastService.getToasts()
      .subscribe(toasts => this.toasts = toasts);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  removeToast(id: number): void {
    this.toastService.remove(id);
  }

  getToastsByPosition(position: ToastPosition): Toast[] {
    return this.toasts.filter(toast => toast.position === position);
  }
}
