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
import { ToastService } from '@/app/services/toast.service';
import {
  downloadCsv,
  formatCurrency,
  parseNullableNumber,
  type CalculatorTranslate,
} from '../shared/calculator-format';
import { MortgageResult, calculateMortgage } from './mortgage.logic';
import { MortgageFormModel, createMortgageSchema } from './mortgage.schema';

@Component({
  selector: 'app-mortgage',
  standalone: true,
  imports: [FormField, TopNavbarComponent, FooterComponent, LucideIconComponent, TranslatePipe],
  templateUrl: './mortgage.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MortgageComponent {
  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);
  private readonly i18n = inject(I18nService);

  private readonly translate: CalculatorTranslate = (key, params) =>
    this.i18n.t(key, params);

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

  private readonly mortgageSchema = computed(() =>
    createMortgageSchema(this.translate),
  );

  readonly mortgageForm = form(this.mortgageModel, (schemaPath) => {
    validateStandardSchema(schemaPath, () => this.mortgageSchema());
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
    // Re-evaluate validation messages whenever the language changes.
    this.i18n.language();
    const raw = this.mortgageModel();
    const parsed = this.mortgageSchema().safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          parsed.error.issues[0]?.message ??
          this.translate('calculators.shared.formError'),
      };
    }

    const valid = parsed.data;
    return calculateMortgage(
      {
        propertyPrice: valid.propertyPrice ?? 0,
        downPayment: valid.downPayment ?? 0,
        years: valid.years ?? 1,
        tinAnnual: valid.tinAnnual ?? 0,
        additionalInitialFees: valid.additionalInitialFees ?? 0,
        annualRecurringCost: valid.annualRecurringCost ?? 0,
        purchaseTaxPercent: valid.purchaseTaxPercent ?? 0,
      },
      { translate: this.translate },
    );
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
    this.updateMetadata();
    effect(() => {
      this.i18n.language();
      this.updateMetadata();
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
    return formatCurrency(value ?? 0, 2, this.i18n.locale());
  }

  formatPct(value: number | null, maxDecimals = 2): string {
    if (value === null) {
      return this.translate('calculators.shared.notAvailable');
    }
    return this.i18n.formatPercent(value / 100, {
      maximumFractionDigits: maxDecimals,
    });
  }

  exportCsv(): void {
    const res = this.result();
    if (!res.ok) {
      return;
    }

    if (this.tableView() === 'annual') {
      const headers = [
        this.translate('calculators.mortgage.csv.year'),
        this.translate('calculators.mortgage.csv.annualPayment'),
        this.translate('calculators.mortgage.csv.principal'),
        this.translate('calculators.mortgage.csv.interest'),
        this.translate('calculators.mortgage.csv.balance'),
      ];
      const rows = res.data.yearlySummary.map((row) => [
        row.year,
        row.totalPayment.toFixed(2),
        row.totalPrincipal.toFixed(2),
        row.totalInterest.toFixed(2),
        row.endingBalance.toFixed(2),
      ]);
      downloadCsv(
        this.translate('calculators.mortgage.csv.annualFileName'),
        headers,
        rows,
      );
    } else {
      const headers = [
        this.translate('calculators.mortgage.csv.month'),
        this.translate('calculators.mortgage.csv.year'),
        this.translate('calculators.mortgage.csv.payment'),
        this.translate('calculators.mortgage.csv.principal'),
        this.translate('calculators.mortgage.csv.interest'),
        this.translate('calculators.mortgage.csv.balance'),
      ];
      const rows = res.data.schedule.map((row) => [
        row.month,
        row.year,
        row.payment.toFixed(2),
        row.principal.toFixed(2),
        row.interest.toFixed(2),
        row.remainingBalance.toFixed(2),
      ]);
      downloadCsv(
        this.translate('calculators.mortgage.csv.monthlyFileName'),
        headers,
        rows,
      );
    }

    this.toastService.success({
      message: this.translate('calculators.mortgage.csv.exported'),
    });
  }

  private updateMetadata(): void {
    this.metadataService.updateMetadata({
      title: this.i18n.t('calculators.mortgage.seo.title'),
      description: this.i18n.t('calculators.mortgage.seo.description'),
      keywords: this.i18n.t('calculators.mortgage.seo.keywords'),
    });
  }
}
