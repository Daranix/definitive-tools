import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, disabled, form, validateStandardSchema } from '@angular/forms/signals';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '@/app/components/footer/footer.component';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { MetadataService } from '@/app/services/metadata.service';
import { computeTotalPayments, formatCurrencyEs, formatNumberEs } from '../shared/calculator-format';
import { SpainNetSalaryResult, calculateSpainNetSalary } from './spain-net-salary.logic';
import { SpainNetSalaryFormModel, SpainNetSalarySchema } from './spain-net-salary.schema';

@Component({
  selector: 'app-spain-net-salary',
  standalone: true,
  imports: [FormField, TopNavbarComponent, FooterComponent, LucideIconComponent],
  templateUrl: './spain-net-salary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpainNetSalaryComponent {
  private readonly metadataService = inject(MetadataService);

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

  readonly salaryForm = form(this.salaryModel, (schemaPath) => {
    validateStandardSchema(schemaPath, SpainNetSalarySchema);
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
    const raw = this.salaryModel();
    const parsed = SpainNetSalarySchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Revisa los datos introducidos en el formulario.',
      };
    }

    const valid = parsed.data;
    return calculateSpainNetSalary({
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
    });
  });

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Calculadora de Salario Neto España 2026 - IRPF y Seguridad Social',
      description:
        'Calcula tu sueldo neto mensual y anual en España para 2026 incluyendo Seguridad Social, cuota de solidaridad, MEI y retención de IRPF.',
      keywords:
        'calculadora salario neto espana, sueldo neto 2026, calcular irpf, seguridad social, cuota solidaridad',
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
    return formatCurrencyEs(value);
  }

  formatPct(value: number): string {
    return `${formatNumberEs(value, 2)} %`;
  }
}
