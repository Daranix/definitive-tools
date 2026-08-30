import { AbstractControl, FormControl, FormGroup, ValidatorFn } from "@angular/forms";
import { z } from "zod";

export function zodToFormGroup<T extends z.ZodObject<any>>(schema: T) {
    const formControls: { [key: string]: AbstractControl } = {};

    for (const key in schema.shape) {
        const zodType = schema.shape[key];

        let defaultValue = zodType._def.defaultValue ? zodType._def.defaultValue() : null;

        if (zodType instanceof z.ZodObject) {
            // Handle nested objects
            formControls[key] = zodToFormGroup(zodType);
        } else {
            defaultValue = (zodType instanceof z.ZodLiteral ? zodType.value : defaultValue);
            // Assign default values
            formControls[key] = new FormControl(defaultValue, zodFieldValidator(zodType));
        }
    }

    return new FormGroup(formControls) as unknown as ZodFormGroup<z.infer<T>>;
}

export function zodFieldValidator(fieldSchema: z.ZodTypeAny): ValidatorFn {
    return (control: AbstractControl) => {
        const result = fieldSchema.safeParse(control.value);
        return result.success ? null : { zodError: result.error.format()._errors };
    };
}

export type ZodFormGroup<T> = T extends object ?
    T extends (infer U)[] ?
    FormControl<T> :
    FormGroup<{
      [K in keyof T]: 
        T[K] extends object ?
          ZodFormGroup<T[K]> :
          FormControl<T[K]>
    }> :
  FormControl<T>;

/**
 * Allows to apply custom metadata to a Zod schema.
 * @param schema 
 * @param metadata 
 * @returns 
 */
export const withMetadata = <T extends z.ZodTypeAny>(schema: T, metadata: Record<string, any>): T => {
    (schema as any)._metadata = metadata;
    return schema;
};