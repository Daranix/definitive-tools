import { AbstractControl, FormControl, FormGroup, ValidatorFn } from "@angular/forms";
import { z } from "zod";

export function zodToFormGroup<T extends z.ZodObject<any>>(schema: T): FormGroup<z.infer<T>> {
    const formControls: { [key: string]: any } = {};

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

    return new FormGroup(formControls);
}

export function zodFieldValidator(fieldSchema: z.ZodTypeAny): ValidatorFn {
    return (control: AbstractControl) => {
        const result = fieldSchema.safeParse(control.value);
        return result.success ? null : { zodError: result.error.format()._errors };
    };
}