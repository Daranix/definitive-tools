import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, validateStandardSchema } from '@angular/forms/signals';
import Decimal from 'decimal.js';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '@/app/components/footer/footer.component';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { MetadataService } from '@/app/services/metadata.service';
import {
  computeTotalPayments,
  formatCurrencyEs,
  formatNumberEs,
  round2,
} from '../shared/calculator-format';
import {
  DismissalType,
  SalaryInputMode,
  SpainSeveranceResult,
  calculateSpainSeverance,
} from './spain-severance.logic';
import { SpainSeveranceFormModel, SpainSeveranceSchema } from './spain-severance.schema';

@Component({
  selector: 'app-spain-severance',
  standalone: true,
  imports: [FormField, TopNavbarComponent, FooterComponent, LucideIconComponent],
  templateUrl: './spain-severance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpainSeveranceComponent {
  private readonly metadataService = inject(MetadataService);

  readonly severanceModel = signal<SpainSeveranceFormModel>({
    startDate: '2020-01-15',
    endDate: '2026-01-14',
    salaryMode: 'annual',
    salaryAmount: 36500,
    extraPayments: 0,
    dismissalType: 'unfair',
  });

  readonly severanceForm = form(this.severanceModel, (schemaPath) => {
    validateStandardSchema(schemaPath, SpainSeveranceSchema);
  });

  readonly totalPayments = computed(() =>
    computeTotalPayments(this.severanceModel().extraPayments),
  );

  readonly result = computed<SpainSeveranceResult>(() => {
    const raw = this.severanceModel();
    const parsed = SpainSeveranceSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Revisa los datos introducidos en el formulario.',
      };
    }

    const valid = parsed.data;
    return calculateSpainSeverance({
      startDate: valid.startDate,
      endDate: valid.endDate,
      salaryMode: valid.salaryMode,
      salaryAmount: valid.salaryAmount ?? 0,
      extraPayments: valid.extraPayments ?? 0,
      dismissalType: valid.dismissalType,
    });
  });

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Calculadora de Indemnización por Despido España',
      description:
        'Calcula la indemnización por despido improcedente (45/33 días), objetivo (20 días), fin de contrato temporal o modificación sustancial en España.',
      keywords:
        'calculadora indemnizacion despido espana, despido improcedente 45 33 dias, despido objetivo, finiquito indemnizacion',
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
    return formatCurrencyEs(value);
  }

  formatNum(value: number, maxDecimals = 2): string {
    return formatNumberEs(value, maxDecimals);
  }

  dismissalLabel(type: DismissalType): string {
    switch (type) {
      case 'unfair':
        return 'Despido improcedente (45 / 33 días por año)';
      case 'objective':
        return 'Despido objetivo o ERE procedente (20 días/año, máx. 12 meses)';
      case 'modification':
        return 'Modificación sustancial o traslado (20 días/año, máx. 9 meses)';
      case 'temporary_end':
        return 'Fin de contrato temporal (12 días/año)';
      case 'disciplinary':
        return 'Despido disciplinario procedente (0 días)';
    }
  }
}
