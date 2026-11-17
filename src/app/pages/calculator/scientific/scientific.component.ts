import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Decimal from 'decimal.js';
import { TranslatePipe } from '@ngx-translate/core';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '@/app/components/footer/footer.component';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { I18nService } from '@/app/i18n/i18n.service';
import { MetadataService } from '@/app/services/metadata.service';
import { ToastService } from '@/app/services/toast.service';
import {
  copyTextToClipboard,
  type CalculatorTranslate,
} from '../shared/calculator-format';
import {
  AngleMode,
  PrecisionDigits,
  evaluateScientificExpression,
} from './scientific.logic';

export interface HistoryEntry {
  id: number;
  expression: string;
  result: string;
  angleMode: AngleMode;
}

@Component({
  selector: 'app-scientific',
  standalone: true,
  imports: [FormsModule, TopNavbarComponent, FooterComponent, LucideIconComponent, TranslatePipe],
  templateUrl: './scientific.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onKeyDown($event)',
  },
})
export class ScientificComponent {
  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly i18n = inject(I18nService);

  private readonly translate: CalculatorTranslate = (key, params) =>
    this.i18n.t(key, params);

  private historySeq = 0;

  readonly expression = signal<string>('');
  readonly lastExpression = signal<string>('');
  readonly displayResult = signal<string>('0');
  readonly errorMessage = signal<string | null>(null);
  readonly ansValue = signal<string>('0');

  readonly angleMode = signal<AngleMode>('DEG');
  readonly precision = signal<PrecisionDigits>(15);
  readonly secondMode = signal<boolean>(false);

  readonly memory = signal<string>('0');
  readonly hasMemory = computed(() => !new Decimal(this.memory() || '0').isZero());

  readonly history = signal<HistoryEntry[]>([]);
  readonly copied = signal<boolean>(false);

  readonly livePreview = computed(() => {
    const expr = this.expression().trim();
    if (!expr) return null;
    const res = evaluateScientificExpression(expr, {
      angleMode: this.angleMode(),
      precision: this.precision(),
      ans: this.ansValue(),
      translate: this.translate,
    });
    return res.ok ? res.formatted : null;
  });

  constructor() {
    this.updateMetadata();
    effect(() => {
      this.i18n.language();
      this.updateMetadata();
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName?.toLowerCase() ?? '';
    const isInputFocused = tagName === 'input' || tagName === 'textarea' || tagName === 'select';

    if (event.key === 'Enter' || (event.key === '=' && !isInputFocused)) {
      event.preventDefault();
      this.evaluate();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.clearAll();
      return;
    }

    if (isInputFocused) {
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      this.backspace();
      return;
    }

    const allowedKeys = '0123456789.+-*/%^()!';
    if (allowedKeys.includes(event.key)) {
      event.preventDefault();
      this.appendToken(event.key);
    }
  }

  setAngleMode(mode: AngleMode): void {
    this.angleMode.set(mode);
  }

  setPrecision(rawValue: unknown): void {
    const numeric = Number(rawValue);
    if (numeric === 15 || numeric === 30 || numeric === 50) {
      this.precision.set(numeric);
    }
  }

  toggleSecondMode(): void {
    this.secondMode.update((value) => !value);
  }

  appendToken(token: string): void {
    this.errorMessage.set(null);
    this.expression.update((prev) => `${prev}${token}`);
  }

  appendFunction(fnName: string): void {
    this.appendToken(`${fnName}(`);
  }

  wrapCurrentOrAppend(fnName: string): void {
    const current = this.expression().trim();
    if (!current) {
      this.appendFunction(fnName);
      return;
    }
    this.errorMessage.set(null);
    this.expression.set(`${fnName}(${current})`);
  }

  backspace(): void {
    this.errorMessage.set(null);
    this.expression.update((prev) => prev.slice(0, -1));
  }

  clearAll(): void {
    this.expression.set('');
    this.lastExpression.set('');
    this.displayResult.set('0');
    this.errorMessage.set(null);
  }

  clearEntry(): void {
    this.expression.set('');
    this.errorMessage.set(null);
  }

  toggleSign(): void {
    const current = this.expression().trim();
    if (!current) {
      this.expression.set('-');
      return;
    }

    if (current.startsWith('-(') && current.endsWith(')')) {
      let depth = 0;
      let wrapsWholeExpression = true;
      for (let i = 1; i < current.length; i += 1) {
        if (current[i] === '(') depth += 1;
        else if (current[i] === ')') depth -= 1;
        if (depth === 0 && i < current.length - 1) {
          wrapsWholeExpression = false;
          break;
        }
      }
      if (wrapsWholeExpression) {
        this.expression.set(current.slice(2, -1));
        return;
      }
    }

    const singleNegativeLiteral = /^-(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
    if (singleNegativeLiteral.test(current)) {
      this.expression.set(current.slice(1));
      return;
    }

    this.expression.set(`-(${current})`);
  }

  evaluate(): void {
    const expr = this.expression().trim();
    if (!expr) {
      return;
    }

    const res = evaluateScientificExpression(expr, {
      angleMode: this.angleMode(),
      precision: this.precision(),
      ans: this.ansValue(),
      translate: this.translate,
    });

    if (!res.ok) {
      this.errorMessage.set(res.error);
      return;
    }

    this.errorMessage.set(null);
    this.lastExpression.set(expr);
    this.displayResult.set(res.formatted);
    this.ansValue.set(res.formatted);
    this.expression.set(res.formatted);

    this.historySeq += 1;
    this.history.update((items) => [
      {
        id: this.historySeq,
        expression: expr,
        result: res.formatted,
        angleMode: this.angleMode(),
      },
      ...items.slice(0, 24),
    ]);
  }

  private getMemoryDecimalConstructor(): Decimal.Constructor {
    return Decimal.clone({
      precision: this.precision() + 12,
      rounding: Decimal.ROUND_HALF_UP,
      toExpPos: this.precision(),
      toExpNeg: -9,
    });
  }

  private getCurrentActiveDecimal(): Decimal | null {
    const expr = this.expression().trim();
    if (expr) {
      const res = evaluateScientificExpression(expr, {
        angleMode: this.angleMode(),
        precision: this.precision(),
        ans: this.ansValue(),
        translate: this.translate,
      });
      if (res.ok) {
        return res.value;
      }
      return null;
    }
    const HighPrecisionDecimal = this.getMemoryDecimalConstructor();
    return new HighPrecisionDecimal(this.displayResult() || '0');
  }

  memoryClear(): void {
    this.memory.set('0');
    this.toastService.info({
      message: this.translate('calculators.scientific.messages.memoryCleared'),
    });
  }

  memoryRecall(): void {
    this.appendToken(this.memory());
  }

  memoryAdd(): void {
    const active = this.getCurrentActiveDecimal();
    if (!active) {
      this.toastService.error({
        message: this.translate('calculators.scientific.messages.memoryAddInvalid'),
      });
      return;
    }
    const HighPrecisionDecimal = this.getMemoryDecimalConstructor();
    const next = new HighPrecisionDecimal(this.memory() || '0').plus(active);
    this.memory.set(next.toSignificantDigits(this.precision()).toString());
  }

  memorySubtract(): void {
    const active = this.getCurrentActiveDecimal();
    if (!active) {
      this.toastService.error({
        message: this.translate(
          'calculators.scientific.messages.memorySubtractInvalid',
        ),
      });
      return;
    }
    const HighPrecisionDecimal = this.getMemoryDecimalConstructor();
    const next = new HighPrecisionDecimal(this.memory() || '0').minus(active);
    this.memory.set(next.toSignificantDigits(this.precision()).toString());
  }

  loadFromHistory(entry: HistoryEntry): void {
    this.errorMessage.set(null);
    this.expression.set(entry.expression);
    this.displayResult.set(entry.result);
    this.lastExpression.set(entry.expression);
  }

  clearHistory(): void {
    this.history.set([]);
  }

  async copyResult(): Promise<void> {
    if (this.errorMessage()) {
      return;
    }

    const valueToCopy = this.livePreview() ?? this.displayResult();
    const ok = await copyTextToClipboard(
      isPlatformBrowser(this.platformId),
      valueToCopy,
      this.toastService,
      {
        success: this.translate('calculators.shared.copied'),
        error: this.translate('calculators.shared.copyFailed'),
      },
    );
    if (ok) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    }
  }

  private updateMetadata(): void {
    this.metadataService.updateMetadata({
      title: this.i18n.t('calculators.scientific.seo.title'),
      description: this.i18n.t('calculators.scientific.seo.description'),
      keywords: this.i18n.t('calculators.scientific.seo.keywords'),
    });
  }
}
