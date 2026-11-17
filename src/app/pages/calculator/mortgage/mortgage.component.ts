import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, validateStandardSchema } from '@angular/forms/signals';
import Decimal from 'decimal.js';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '@/app/components/footer/footer.component';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { MetadataService } from '@/app/services/metadata.service';
import { ToastService } from '@/app/services/toast.service';
import {
  downloadCsv,
  formatCurrencyEs,
  formatNumberEs,
  parseNullableNumber,
} from '../shared/calculator-format';
import { MortgageResult, calculateMortgage } from './mortgage.logic';
import { MortgageFormModel, MortgageSchema } from './mortgage.schema';

@Component({
  selector: 'app-mortgage',
  standalone: true,
  imports: [FormField, TopNavbarComponent, FooterComponent, LucideIconComponent],
  templateUrl: './mortgage.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MortgageComponent {
  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);

  readonly mortgageModel = signal<MortgageFormModel>({
    propertyPrice: 250000,
    downPayment: 50000,
    downPaymentPercent: 20,
    years: 30,
    tinAnnual: 3.1,
    additionalInitialFees: 1200,
    annualRecurringCost: 450,
    purchaseTaxPercent: 8,
  });

  readonly mortgageForm = form(this.mortgageModel, (schemaPath) => {
    validateStandardSchema(schemaPath, MortgageSchema);
  });

  readonly tableView = signal<'annual' | 'monthly'>('annual');

  readonly clampedPriceSlider = computed(() =>
    Math.max(30000, Math.min(1000000, this.mortgageModel().propertyPrice ?? 30000)),
  );
  readonly clampedDownPctSlider = computed(() =>
    Math.max(0, Math.min(80, this.mortgageModel().downPaymentPercent ?? 0)),
  );
  readonly clampedYearsSlider = computed(() =>
    Math.max(1, Math.min(40, this.mortgageModel().years ?? 1)),
  );
  readonly clampedTinSlider = computed(() =>
    Math.max(0, Math.min(10, this.mortgageModel().tinAnnual ?? 0)),
  );

  readonly result = computed<MortgageResult>(() => {
    const raw = this.mortgageModel();
    const parsed = MortgageSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Revisa los datos introducidos en el formulario.',
      };
    }

    const valid = parsed.data;
    return calculateMortgage({
      propertyPrice: valid.propertyPrice ?? 0,
      downPayment: valid.downPayment ?? 0,
      years: valid.years ?? 1,
      tinAnnual: valid.tinAnnual ?? 0,
      additionalInitialFees: valid.additionalInitialFees ?? 0,
      annualRecurringCost: valid.annualRecurringCost ?? 0,
      purchaseTaxPercent: valid.purchaseTaxPercent ?? 0,
    });
  });

  readonly principalSharePercent = computed<number>(() => {
    const res = this.result();
    if (!res.ok || res.data.totalPaid <= 0) return 100;
    return new Decimal(res.data.loanAmount)
      .div(res.data.totalPaid)
      .mul(100)
      .toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
      .toNumber();
  });

  readonly interestSharePercent = computed<number>(() => {
    const principal = this.principalSharePercent();
    return Number((100 - principal).toFixed(1));
  });

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Calculadora de Hipotecas - Cuota, TAE y Cuadro de Amortización',
      description:
        'Simula tu hipoteca con sistema francés, calcula la cuota mensual, la TAE efectiva con gastos, el ahorro necesario y descarga el cuadro de amortización en CSV.',
      keywords:
        'calculadora hipoteca, simulador hipoteca, cuota mensual, calcular TAE, cuadro de amortizacion frances',
    });
  }

  onPriceInput(rawValue: unknown, fromSlider = false): void {
    const price = parseNullableNumber(rawValue);
    if (fromSlider && price !== null) {
      this.mortgageForm.propertyPrice().value.set(price);
    }
    const pct = this.mortgageModel().downPaymentPercent;
    if (price !== null && price > 0 && pct !== null && pct >= 0) {
      const syncedDown = new Decimal(price)
        .mul(pct)
        .div(100)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
        .toNumber();
      this.mortgageForm.downPayment().value.set(syncedDown);
    }
  }

  onDownPaymentEuroInput(rawValue: unknown): void {
    const euros = parseNullableNumber(rawValue);
    if (euros === null) {
      this.mortgageForm.downPaymentPercent().value.set(null);
      return;
    }
    const price = this.mortgageModel().propertyPrice;
    if (price !== null && price > 0) {
      const pct = new Decimal(euros)
        .div(price)
        .mul(100)
        .toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
        .toNumber();
      this.mortgageForm.downPaymentPercent().value.set(pct);
    }
  }

  onDownPaymentPercentInput(rawValue: unknown, fromSlider = false): void {
    const pct = parseNullableNumber(rawValue);
    if (fromSlider && pct !== null) {
      this.mortgageForm.downPaymentPercent().value.set(pct);
    }
    if (pct === null) {
      this.mortgageForm.downPayment().value.set(null);
      return;
    }
    const price = this.mortgageModel().propertyPrice;
    if (price !== null && price > 0) {
      const euros = new Decimal(price)
        .mul(pct)
        .div(100)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
        .toNumber();
      this.mortgageForm.downPayment().value.set(euros);
    }
  }

  onSliderNumberChange(field: 'years' | 'tinAnnual', rawValue: string): void {
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) return;
    if (field === 'years') {
      this.mortgageForm.years().value.set(Math.trunc(numeric));
    } else {
      this.mortgageForm.tinAnnual().value.set(numeric);
    }
  }

  formatEur(value: number | null): string {
    return formatCurrencyEs(value ?? 0);
  }

  formatPct(value: number | null, maxDecimals = 2): string {
    if (value === null) {
      return 'N/A';
    }
    return `${formatNumberEs(value, maxDecimals)} %`;
  }

  exportCsv(): void {
    const res = this.result();
    if (!res.ok) {
      return;
    }

    if (this.tableView() === 'annual') {
      const headers = [
        'Año',
        'Cuota anual (EUR)',
        'Capital amortizado (EUR)',
        'Intereses (EUR)',
        'Capital pendiente (EUR)',
      ];
      const rows = res.data.yearlySummary.map((row) => [
        row.year,
        row.totalPayment.toFixed(2),
        row.totalPrincipal.toFixed(2),
        row.totalInterest.toFixed(2),
        row.endingBalance.toFixed(2),
      ]);
      downloadCsv('amortizacion-hipoteca-anual.csv', headers, rows);
    } else {
      const headers = [
        'Mes',
        'Año',
        'Cuota (EUR)',
        'Capital amortizado (EUR)',
        'Intereses (EUR)',
        'Capital pendiente (EUR)',
      ];
      const rows = res.data.schedule.map((row) => [
        row.month,
        row.year,
        row.payment.toFixed(2),
        row.principal.toFixed(2),
        row.interest.toFixed(2),
        row.remainingBalance.toFixed(2),
      ]);
      downloadCsv('amortizacion-hipoteca-mensual.csv', headers, rows);
    }

    this.toastService.success({ message: 'Cuadro de amortización exportado en CSV' });
  }
}
