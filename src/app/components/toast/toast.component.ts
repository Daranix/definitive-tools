import {
  Toast,
  ToastPosition,
  ToastService,
} from '@app/services/toast.service';
import { NgClass } from '@angular/common';
import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  imports: [NgClass],
  templateUrl: './toast.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './toast.component.scss',
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  readonly positions: ToastPosition[] = [
    'top-right',
    'top-left',
    'bottom-right',
    'bottom-left',
    'top-center',
    'bottom-center',
  ];
  private subscription?: Subscription;
  private readonly toastService = inject(ToastService);

  ngOnInit(): void {
    this.subscription = this.toastService
      .getToasts()
      .subscribe((toasts) => (this.toasts = toasts));
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
    return this.toasts.filter((toast) => toast.position === position);
  }
}
