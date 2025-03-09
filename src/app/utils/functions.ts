import { FormGroup } from "@angular/forms";
import { ZodFormControls } from "./types";

export function asFormGroup<T extends Record<any, any>>(formGroup: any): FormGroup<T> {
    return formGroup as FormGroup<T>;
}

export function asZodFormControls<T extends Record<any, any>>(formGroup: any): ZodFormControls<T> {
    return formGroup as ZodFormControls<T>;
}