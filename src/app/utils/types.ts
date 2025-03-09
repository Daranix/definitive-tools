import { AbstractControl, FormControl, FormGroup } from '@angular/forms';


export type Prettify<T> = {
    [K in keyof T]: T[K];
  } & {};

// This creates a type that maps each field in T to an AbstractControl
export type FormGroupControls<T> = {
  [K in keyof T]: T[K] extends object 
    ? FormGroup<FormGroupControls<T[K]>> 
    : FormControl<T[K]>;
};

// This distributes over each variant in the union
export type ZodFormControls<T> = T extends any
  ? FormGroup<FormGroupControls<T>>
  : never;