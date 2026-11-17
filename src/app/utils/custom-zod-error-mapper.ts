import type { core } from 'zod';

export type ZodMessageTranslator = (
  key: string,
  params?: Record<string, unknown>,
) => string;

/**
 * Builds Zod's error map from the active translations.
 *
 * The map itself is language agnostic: it resolves every message through the
 * supplied `t` callback, which is bound to `I18nService.t` when the map is
 * registered in `AppComponent`, so validation messages follow the active
 * language.
 */
export function createCustomErrorMap(
  t: ZodMessageTranslator,
): core.$ZodErrorMap {
  return (issue) => {
    switch (issue.code) {
      case 'invalid_type':
        if (issue.expected === 'string') {
          return { message: t('common.validation.mustBeText') };
        }
        if (issue.expected === 'number') {
          return { message: t('common.validation.mustBeNumber') };
        }
        if (issue.expected === 'undefined' || issue.expected === 'null') {
          return { message: t('common.validation.required') };
        }
        break;
      case 'too_small':
        if (issue.origin === 'string') {
          return {
            message: t('common.validation.minCharacters', {
              minimum: issue.minimum,
            }),
          };
        }
        if (issue.origin === 'number' || issue.origin === 'bigint') {
          return {
            message: t('common.validation.minValue', { minimum: issue.minimum }),
          };
        }
        if (issue.origin === 'array') {
          return {
            message: t('common.validation.minItems', { minimum: issue.minimum }),
          };
        }
        if (issue.origin === 'date') {
          return {
            message: t('common.validation.minValue', {
              minimum: issue.minimum,
            }),
          };
        }
        break;
      case 'too_big':
        if (issue.origin === 'string') {
          return {
            message: t('common.validation.maxCharacters', {
              maximum: issue.maximum,
            }),
          };
        }
        if (issue.origin === 'number' || issue.origin === 'bigint') {
          return {
            message: t('common.validation.maxValue', { maximum: issue.maximum }),
          };
        }
        if (issue.origin === 'array') {
          return {
            message: t('common.validation.maxItems', { maximum: issue.maximum }),
          };
        }
        break;
      case 'invalid_format':
        if (issue.format === 'email') {
          return { message: t('common.validation.email') };
        }
        if (issue.format === 'url') {
          return { message: t('common.validation.url') };
        }
        return { message: t('common.validation.invalidFormat') };
      case 'invalid_value':
        return { message: t('common.validation.invalidOption') };
      case 'not_multiple_of':
        return { message: t('common.validation.invalidFormat') };
    }

    // Fallback to Zod's default error map.
    return undefined;
  };
}
