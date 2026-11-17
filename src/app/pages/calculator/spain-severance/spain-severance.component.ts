import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormField, form, validateStandardSchema } from '@angular/forms/signals';
import Decimal from 'decimal.js';
import { TranslatePipe } from '@ngx-translate/core';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '@/app/components/footer/footer.component';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { I18nService } from '@/app/i18n/i18n.service';
import { MetadataService } from '@/app/services/metadata.service';
import {
  computeTotalPayments,
  formatCurrency,
  formatNumber,
  round2,
  type CalculatorTranslate,
} from '../shared/calculator-format';
import {
  DismissalType,
  SalaryInputMode,
  SpainSeveranceResult,
  calculateSpainSeverance,
} from './spain-severance.logic';
import {
  SpainSeveranceFormModel,
  createSpainSeveranceSchema,
} from './spain-severance.schema';

@Component({
  selector: 'app-spain-severance',
  standalone: true,
  imports: [FormField, TopNavbarComponent, FooterComponent, LucideIconComponent, TranslatePipe],
  templateUrl: './spain-severance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpainSeveranceComponent {
  private readonly metadataService = inject(MetadataService);
  private readonly i18n = inject(I18nService);

  private readonly translate: CalculatorTranslate = (key, params) =>
    this.i18n.t(key, params);

  readonly severanceModel = signal<SpainSeveranceFormModel>({
    startDate: '2020-01-15',
    endDate: '2026-01-14',
    salaryMode: 'annual',
    salaryAmount: 36500,
    extraPayments: 0,
    dismissalType: 'unfair',
  });

  private readonly severanceSchema = computed(() =>
    createSpainSeveranceSchema(this.translate),
  );

  readonly severanceForm = form(this.severanceModel, (schemaPath) => {
    validateStandardSchema(schemaPath, () => this.severanceSchema());
  });

  readonly totalPayments = computed(() =>
    computeTotalPayments(this.severanceModel().extraPayments),
  );

  readonly result = computed<SpainSeveranceResult>(() => {
    // Re-evaluate validation messages whenever the language changes.
    this.i18n.language();
    const raw = this.severanceModel();
    const parsed = this.severanceSchema().safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          parsed.error.issues[0]?.message ??
          this.translate('calculators.shared.formError'),
      };
    }

    const valid = parsed.data;
    return calculateSpainSeverance(
      {
        startDate: valid.startDate,
        endDate: valid.endDate,
        salaryMode: valid.salaryMode,
        salaryAmount: valid.salaryAmount ?? 0,
        extraPayments: valid.extraPayments ?? 0,
        dismissalType: valid.dismissalType,
      },
      { translate: this.translate },
    );
  });

  readonly dismissalLabels = computed<Record<DismissalType, string>>(() => ({
    unfair: this.translate('calculators.severance.dismissals.unfair'),
    objective: this.translate('calculators.severance.dismissals.objective'),
    modification: this.translate('calculators.severance.dismissals.modification'),
    temporary_end: this.translate('calculators.severance.dismissals.temporaryEnd'),
    disciplinary: this.translate('calculators.severance.dismissals.disciplinary'),
  }));

  constructor() {
    this.updateMetadata();
    effect(() => {
      this.i18n.language();
      this.updateMetadata();
    });
  }

  onSalaryModeChange(nextMode: SalaryInputMode): void {
    const current = this.severanceModel();
    if (current.salaryMode === nextMode) return;

    const totalPay = this.totalPayments();
    const amount = current.salaryAmount;

    let convertedAmount: number | null = amount;
    if (amount !== null && Number.isFinite(amount)) {
      const decAmount = new Decimal(amount);
      convertedAmount =
        nextMode === 'monthly'
          ? round2(decAmount.div(totalPay)).toNumber()
          : round2(decAmount.mul(totalPay)).toNumber();
    }

    this.severanceModel.update((m) => ({
      ...m,
      salaryMode: nextMode,
      salaryAmount: convertedAmount,
    }));
  }

  formatEur(value: number): string {
    return formatCurrency(value, 2, this.i18n.locale());
  }

  formatNum(value: number, maxDecimals = 2): string {
    return formatNumber(value, maxDecimals, this.i18n.locale());
  }

  dismissalLabel(type: DismissalType): string {
    return this.dismissalLabels()[type];
  }

  private updateMetadata(): void {
    this.metadataService.updateMetadata({
      title: this.i18n.t('calculators.severance.seo.title'),
      description: this.i18n.t('calculators.severance.seo.description'),
      keywords: this.i18n.t('calculators.severance.seo.keywords'),
    });
  }
}
