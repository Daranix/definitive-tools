import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormField, disabled, form, validateStandardSchema } from '@angular/forms/signals';
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
  type CalculatorTranslate,
} from '../shared/calculator-format';
import { SpainNetSalaryResult, calculateSpainNetSalary } from './spain-net-salary.logic';
import {
  SpainNetSalaryFormModel,
  createSpainNetSalarySchema,
} from './spain-net-salary.schema';

@Component({
  selector: 'app-spain-net-salary',
  standalone: true,
  imports: [FormField, TopNavbarComponent, FooterComponent, LucideIconComponent, TranslatePipe],
  templateUrl: './spain-net-salary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpainNetSalaryComponent {
  private readonly metadataService = inject(MetadataService);
  private readonly i18n = inject(I18nService);

  private readonly translate: CalculatorTranslate = (key, params) =>
    this.i18n.t(key, params);

  readonly salaryModel = signal<SpainNetSalaryFormModel>({
    grossAnnual: 30000,
    extraPayments: 0,
    region: 'general',
    ageBracket: 'under65',
    contractType: 'indefinite',
    familySituation: 'single',
    childrenTotal: 0,
    childrenUnder3: 0,
    sharedCustody: false,
    disability: 'none',
    geographicMobility: false,
  });

  private readonly salarySchema = computed(() =>
    createSpainNetSalarySchema(this.translate),
  );

  readonly salaryForm = form(this.salaryModel, (schemaPath) => {
    validateStandardSchema(schemaPath, () => this.salarySchema());
    disabled(schemaPath.childrenUnder3, {
      when: ({ valueOf }) => (valueOf(schemaPath.childrenTotal) ?? 0) <= 0,
    });
  });

  readonly totalPayments = computed(() =>
    computeTotalPayments(this.salaryModel().extraPayments),
  );

  readonly clampedSliderGross = computed(() => {
    const gross = this.salaryModel().grossAnnual ?? 0;
    return Math.max(0, Math.min(150000, gross));
  });

  readonly result = computed<SpainNetSalaryResult>(() => {
    // Re-evaluate validation messages whenever the language changes.
    this.i18n.language();
    const raw = this.salaryModel();
    const parsed = this.salarySchema().safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          parsed.error.issues[0]?.message ??
          this.translate('calculators.shared.formError'),
      };
    }

    const valid = parsed.data;
    return calculateSpainNetSalary(
      {
        grossAnnual: valid.grossAnnual ?? 0,
        extraPayments: valid.extraPayments ?? 0,
        ageBracket: valid.ageBracket,
        familySituation: valid.familySituation,
        contractType: valid.contractType,
        region: valid.region,
        childrenTotal: valid.childrenTotal ?? 0,
        childrenUnder3: valid.childrenUnder3 ?? 0,
        sharedCustody: valid.sharedCustody,
        disability: valid.disability,
        geographicMobility: valid.geographicMobility,
      },
      { translate: this.translate },
    );
  });

  constructor() {
    this.updateMetadata();
    effect(() => {
      this.i18n.language();
      this.updateMetadata();
    });
  }

  onGrossSliderInput(rawValue: string): void {
    const numeric = Number(rawValue);
    if (Number.isFinite(numeric)) {
      this.salaryForm.grossAnnual().value.set(numeric);
    }
  }

  onChildrenTotalInput(): void {
    const rawTotal = this.salaryModel().childrenTotal;
    if (rawTotal === null || !Number.isFinite(rawTotal)) {
      return;
    }
    const under3 = this.salaryModel().childrenUnder3 ?? 0;
    if (rawTotal <= 0) {
      this.salaryForm.childrenUnder3().value.set(0);
      this.salaryForm.sharedCustody().value.set(false);
    } else if (under3 > rawTotal) {
      this.salaryForm.childrenUnder3().value.set(rawTotal);
    }
  }

  formatEur(value: number): string {
    return formatCurrency(value, 2, this.i18n.locale());
  }

  formatPct(value: number): string {
    return this.i18n.formatPercent(value / 100, { maximumFractionDigits: 2 });
  }

  formatNum(value: number, maxDecimals = 2): string {
    return formatNumber(value, maxDecimals, this.i18n.locale());
  }

  private updateMetadata(): void {
    this.metadataService.updateMetadata({
      title: this.i18n.t('calculators.netSalary.seo.title'),
      description: this.i18n.t('calculators.netSalary.seo.description'),
      keywords: this.i18n.t('calculators.netSalary.seo.keywords'),
    });
  }
}
