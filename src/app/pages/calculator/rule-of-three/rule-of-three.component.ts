import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormField, form, validateStandardSchema } from '@angular/forms/signals';
import { TopNavbarComponent } from '@/app/components/top-navbar/top-navbar.component';
import { FooterComponent } from '@/app/components/footer/footer.component';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { MetadataService } from '@/app/services/metadata.service';
import { ToastService } from '@/app/services/toast.service';
import { copyTextToClipboard } from '../shared/calculator-format';
import {
  RuleOfThreeMode,
  RuleOfThreeResult,
  calculateCompoundRuleOfThree,
  calculateSimpleRuleOfThree,
} from './rule-of-three.logic';
import { RuleOfThreeFormModel, RuleOfThreeSchema } from './rule-of-three.schema';

@Component({
  selector: 'app-rule-of-three',
  standalone: true,
  imports: [FormField, TopNavbarComponent, FooterComponent, LucideIconComponent],
  templateUrl: './rule-of-three.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuleOfThreeComponent {
  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);

  private conditionSeq = 3;

  readonly ruleModel = signal<RuleOfThreeFormModel>({
    mode: 'simple-direct',
    simpleLabelKnown: 'Unidades',
    simpleLabelResult: 'Precio (€)',
    a: 4,
    b: 12,
    c: 10,
    compoundTargetLabel: 'Días',
    baseResult: 12,
    decimals: 4,
    compoundConditions: [
      { id: 'cond-1', label: 'Trabajadores', knownValue: 6, targetValue: 9, relation: 'inverse' },
      { id: 'cond-2', label: 'Horas al día', knownValue: 8, targetValue: 6, relation: 'inverse' },
      {
        id: 'cond-3',
        label: 'Metros construidos',
        knownValue: 120,
        targetValue: 180,
        relation: 'direct',
      },
    ],
  });

  readonly ruleForm = form(this.ruleModel, (schemaPath) => {
    validateStandardSchema(schemaPath, RuleOfThreeSchema);
  });

  readonly result = computed<RuleOfThreeResult>(() => {
    const model = this.ruleModel();
    const parsed = RuleOfThreeSchema.safeParse(model);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Revisa los valores introducidos.',
      };
    }

    const valid = parsed.data;
    if (valid.mode === 'compound') {
      return calculateCompoundRuleOfThree({
        targetLabel: valid.compoundTargetLabel,
        baseKnownValue: valid.baseResult,
        conditions: valid.compoundConditions,
        decimals: valid.decimals,
      });
    }

    return calculateSimpleRuleOfThree({
      mode: valid.mode,
      a: valid.a,
      b: valid.b,
      c: valid.c,
      decimals: valid.decimals,
    });
  });

  readonly canAddCondition = computed(() => this.ruleModel().compoundConditions.length < 6);
  readonly canRemoveCondition = computed(() => this.ruleModel().compoundConditions.length > 2);

  readonly copied = signal<boolean>(false);

  constructor() {
    this.metadataService.updateMetadata({
      title: 'Calculadora de Regla de 3 Online - Directa, Inversa y Compuesta',
      description:
        'Calcula reglas de tres simples directas, inversas y compuestas mixtas paso a paso con alta precisión decimal.',
      keywords:
        'regla de tres, regla de 3 directa, regla de 3 inversa, regla de 3 compuesta, calculadora proporcionalidad',
    });
  }

  setMode(nextMode: RuleOfThreeMode): void {
    this.ruleForm.mode().value.set(nextMode);
  }

  onDecimalsChange(rawValue: string): void {
    const numeric = Number(rawValue);
    if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 15) {
      this.ruleForm.decimals().value.set(numeric);
    }
  }

  swapSimplePairs(): void {
    const currentModel = this.ruleModel();
    const current = this.result();

    if (current.ok) {
      this.ruleModel.update((m) => ({
        ...m,
        a: currentModel.c,
        b: Number(current.value.toDecimalPlaces(6).toString()),
        c: currentModel.a,
      }));
      return;
    }

    this.ruleModel.update((m) => ({
      ...m,
      a: currentModel.c,
      c: currentModel.a,
    }));
  }

  addCondition(): void {
    if (!this.canAddCondition()) return;
    this.conditionSeq += 1;
    const nextIndex = this.ruleModel().compoundConditions.length + 1;
    this.ruleModel.update((m) => ({
      ...m,
      compoundConditions: [
        ...m.compoundConditions,
        {
          id: `cond-${this.conditionSeq}`,
          label: `Magnitud ${nextIndex}`,
          knownValue: 1,
          targetValue: 1,
          relation: 'direct',
        },
      ],
    }));
  }

  removeCondition(id: string): void {
    if (!this.canRemoveCondition()) return;
    this.ruleModel.update((m) => ({
      ...m,
      compoundConditions: m.compoundConditions.filter((item) => item.id !== id),
    }));
  }

  swapCompoundValues(): void {
    this.ruleModel.update((m) => ({
      ...m,
      compoundConditions: m.compoundConditions.map((item) => ({
        ...item,
        knownValue: item.targetValue,
        targetValue: item.knownValue,
      })),
    }));
  }

  applyPreset(preset: 'recipe' | 'speed' | 'factory' | 'logistics'): void {
    if (preset === 'recipe') {
      this.ruleModel.update((m) => ({
        ...m,
        mode: 'simple-direct',
        simpleLabelKnown: 'Comensales',
        simpleLabelResult: 'Harina (g)',
        a: 4,
        b: 300,
        c: 7,
      }));
      return;
    }

    if (preset === 'speed') {
      this.ruleModel.update((m) => ({
        ...m,
        mode: 'simple-inverse',
        simpleLabelKnown: 'Velocidad (km/h)',
        simpleLabelResult: 'Tiempo (horas)',
        a: 90,
        b: 4,
        c: 120,
      }));
      return;
    }

    if (preset === 'factory') {
      this.ruleModel.update((m) => ({
        ...m,
        mode: 'compound',
        compoundTargetLabel: 'Días',
        baseResult: 12,
        compoundConditions: [
          { id: 'cond-p1', label: 'Trabajadores', knownValue: 6, targetValue: 9, relation: 'inverse' },
          { id: 'cond-p2', label: 'Horas al día', knownValue: 8, targetValue: 6, relation: 'inverse' },
          {
            id: 'cond-p3',
            label: 'Metros construidos',
            knownValue: 120,
            targetValue: 180,
            relation: 'direct',
          },
        ],
      }));
      return;
    }

    this.ruleModel.update((m) => ({
      ...m,
      mode: 'compound',
      compoundTargetLabel: 'Coste (€)',
      baseResult: 450,
      compoundConditions: [
        { id: 'cond-l1', label: 'Camiones', knownValue: 3, targetValue: 5, relation: 'direct' },
        { id: 'cond-l2', label: 'Distancia (km)', knownValue: 200, targetValue: 320, relation: 'direct' },
      ],
    }));
  }

  reset(): void {
    if (this.ruleModel().mode === 'compound') {
      this.ruleModel.update((m) => ({
        ...m,
        compoundTargetLabel: 'Resultado',
        baseResult: 10,
        compoundConditions: [
          { id: 'cond-r1', label: 'Magnitud 1', knownValue: 2, targetValue: 4, relation: 'direct' },
          { id: 'cond-r2', label: 'Magnitud 2', knownValue: 5, targetValue: 10, relation: 'inverse' },
        ],
      }));
      return;
    }

    this.ruleModel.update((m) => ({
      ...m,
      simpleLabelKnown: 'Magnitud A',
      simpleLabelResult: 'Magnitud B',
      a: 1,
      b: 1,
      c: 1,
    }));
  }

  async copyResult(): Promise<void> {
    const res = this.result();
    if (!res.ok) {
      return;
    }

    const ok = await copyTextToClipboard(
      isPlatformBrowser(this.platformId),
      res.formattedValue,
      this.toastService,
    );
    if (ok) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    }
  }
}
