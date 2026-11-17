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
import { FormField, form, validateStandardSchema } from '@angular/forms/signals';
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
  RuleOfThreeMode,
  RuleOfThreeResult,
  calculateCompoundRuleOfThree,
  calculateSimpleRuleOfThree,
} from './rule-of-three.logic';
import {
  RuleOfThreeFormModel,
  createRuleOfThreeSchema,
} from './rule-of-three.schema';

@Component({
  selector: 'app-rule-of-three',
  standalone: true,
  imports: [FormField, TopNavbarComponent, FooterComponent, LucideIconComponent, TranslatePipe],
  templateUrl: './rule-of-three.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuleOfThreeComponent {
  private readonly metadataService = inject(MetadataService);
  private readonly toastService = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly i18n = inject(I18nService);

  private readonly translate: CalculatorTranslate = (key, params) =>
    this.i18n.t(key, params);

  private conditionSeq = 3;

  readonly ruleModel = signal<RuleOfThreeFormModel>({
    mode: 'simple-direct',
    simpleLabelKnown: this.translate('calculators.ruleOfThree.defaults.unitKnown'),
    simpleLabelResult: this.translate('calculators.ruleOfThree.defaults.unitResult'),
    a: 4,
    b: 12,
    c: 10,
    compoundTargetLabel: this.translate(
      'calculators.ruleOfThree.defaults.compoundTarget',
    ),
    baseResult: 12,
    decimals: 4,
    compoundConditions: [
      {
        id: 'cond-1',
        label: this.translate('calculators.ruleOfThree.defaults.workers'),
        knownValue: 6,
        targetValue: 9,
        relation: 'inverse',
      },
      {
        id: 'cond-2',
        label: this.translate('calculators.ruleOfThree.defaults.hoursPerDay'),
        knownValue: 8,
        targetValue: 6,
        relation: 'inverse',
      },
      {
        id: 'cond-3',
        label: this.translate('calculators.ruleOfThree.defaults.metersBuilt'),
        knownValue: 120,
        targetValue: 180,
        relation: 'direct',
      },
    ],
  });

  private readonly ruleSchema = computed(() =>
    createRuleOfThreeSchema(this.translate),
  );

  readonly ruleForm = form(this.ruleModel, (schemaPath) => {
    validateStandardSchema(schemaPath, () => this.ruleSchema());
  });

  readonly result = computed<RuleOfThreeResult>(() => {
    // Re-evaluate messages and number formatting whenever the language changes.
    this.i18n.language();
    const model = this.ruleModel();
    const parsed = this.ruleSchema().safeParse(model);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          parsed.error.issues[0]?.message ??
          this.translate('calculators.shared.formError'),
      };
    }

    const options = {
      locale: this.i18n.locale(),
      translate: this.translate,
    };
    const valid = parsed.data;
    if (valid.mode === 'compound') {
      return calculateCompoundRuleOfThree(
        {
          targetLabel: valid.compoundTargetLabel,
          baseKnownValue: valid.baseResult,
          conditions: valid.compoundConditions,
          decimals: valid.decimals,
        },
        options,
      );
    }

    return calculateSimpleRuleOfThree(
      {
        mode: valid.mode,
        a: valid.a,
        b: valid.b,
        c: valid.c,
        decimals: valid.decimals,
      },
      options,
    );
  });

  readonly canAddCondition = computed(() => this.ruleModel().compoundConditions.length < 6);
  readonly canRemoveCondition = computed(() => this.ruleModel().compoundConditions.length > 2);

  readonly copied = signal<boolean>(false);

  constructor() {
    this.updateMetadata();
    effect(() => {
      this.i18n.language();
      this.updateMetadata();
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
          label: this.translate(
            'calculators.ruleOfThree.defaults.magnitudeIndexed',
            { index: nextIndex },
          ),
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
        simpleLabelKnown: this.translate('calculators.ruleOfThree.defaults.servings'),
        simpleLabelResult: this.translate('calculators.ruleOfThree.defaults.flour'),
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
        simpleLabelKnown: this.translate('calculators.ruleOfThree.defaults.speed'),
        simpleLabelResult: this.translate('calculators.ruleOfThree.defaults.time'),
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
        compoundTargetLabel: this.translate(
          'calculators.ruleOfThree.defaults.compoundTarget',
        ),
        baseResult: 12,
        compoundConditions: [
          {
            id: 'cond-p1',
            label: this.translate('calculators.ruleOfThree.defaults.workers'),
            knownValue: 6,
            targetValue: 9,
            relation: 'inverse',
          },
          {
            id: 'cond-p2',
            label: this.translate('calculators.ruleOfThree.defaults.hoursPerDay'),
            knownValue: 8,
            targetValue: 6,
            relation: 'inverse',
          },
          {
            id: 'cond-p3',
            label: this.translate('calculators.ruleOfThree.defaults.metersBuilt'),
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
      compoundTargetLabel: this.translate('calculators.ruleOfThree.defaults.cost'),
      baseResult: 450,
      compoundConditions: [
        {
          id: 'cond-l1',
          label: this.translate('calculators.ruleOfThree.defaults.trucks'),
          knownValue: 3,
          targetValue: 5,
          relation: 'direct',
        },
        {
          id: 'cond-l2',
          label: this.translate('calculators.ruleOfThree.defaults.distance'),
          knownValue: 200,
          targetValue: 320,
          relation: 'direct',
        },
      ],
    }));
  }

  reset(): void {
    if (this.ruleModel().mode === 'compound') {
      this.ruleModel.update((m) => ({
        ...m,
        compoundTargetLabel: this.translate(
          'calculators.ruleOfThree.defaults.defaultTarget',
        ),
        baseResult: 10,
        compoundConditions: [
          {
            id: 'cond-r1',
            label: this.translate(
              'calculators.ruleOfThree.defaults.magnitudeIndexed',
              { index: 1 },
            ),
            knownValue: 2,
            targetValue: 4,
            relation: 'direct',
          },
          {
            id: 'cond-r2',
            label: this.translate(
              'calculators.ruleOfThree.defaults.magnitudeIndexed',
              { index: 2 },
            ),
            knownValue: 5,
            targetValue: 10,
            relation: 'inverse',
          },
        ],
      }));
      return;
    }

    this.ruleModel.update((m) => ({
      ...m,
      simpleLabelKnown: this.translate(
        'calculators.ruleOfThree.defaults.magnitudeA',
      ),
      simpleLabelResult: this.translate(
        'calculators.ruleOfThree.defaults.magnitudeB',
      ),
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
      title: this.i18n.t('calculators.ruleOfThree.seo.title'),
      description: this.i18n.t('calculators.ruleOfThree.seo.description'),
      keywords: this.i18n.t('calculators.ruleOfThree.seo.keywords'),
    });
  }
}
