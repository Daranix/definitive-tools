import { Component, computed, contentChild, input, output, TemplateRef } from '@angular/core';
import { z, ZodObject, ZodRawShape } from 'zod';
import { AbstractControl, FormControl, FormGroup, NgModel, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, NgIf, NgTemplateOutlet } from '@angular/common';
import { OutletContext } from '@angular/router';

@Component({
  selector: 'app-zod-form',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './zod-form.component.html',
  styleUrl: './zod-form.component.scss'
})
export class ZodFormComponent<T extends ZodObject<any>> {

  readonly tmpl = contentChild.required(TemplateRef)
  readonly submit = output<z.infer<T>>();
  readonly zodSchema = input.required<T>();
  readonly formGroup = computed(() => this.zodToFormGroup(this.zodSchema()));

  private zodToFormGroup(schema: z.ZodObject<any>): FormGroup<z.infer<T>> {
    const formControls: { [key: string]: any } = {};
  
    for (const key in schema.shape) {
      const zodType = schema.shape[key];
      const defaultValue = zodType._def.defaultValue ? zodType._def.defaultValue() : null;
  
      if (zodType instanceof z.ZodObject) {
        // Handle nested objects
        formControls[key] = this.zodToFormGroup(zodType);
      } else {
        // Assign default values
        formControls[key] = new FormControl(defaultValue);
      }
    }
  
    return new FormGroup(formControls);
  }
  
  // Validate a specific field
  validateField(control: NgModel) {
    // Skip validation if schema is not provided
    if (!this.zodSchema) return;
    
    const fieldName = control.name;
    const fieldValue = control.value;
    
    // Find the field's schema in the main schema
    const fieldSchema = this.zodSchema().shape[fieldName];
    if (!fieldSchema) return;
    
    // Create a single-field schema for validation
    const singleFieldSchema = z.object({ [fieldName]: fieldSchema });
    
    // Validate just this field
    const result = singleFieldSchema.safeParse({ [fieldName]: fieldValue });
    
    if (!result.success) {
      // Extract field-specific errors and set them on the control
      const formatErrors = result.error.format();
      this.setZodErrors(control, formatErrors[fieldName]?._errors);
    } else {
      // Clear Zod errors for this field
      this.clearZodErrors(control);
    }
  }
  
  // Set Zod validation errors on a form control
  private setZodErrors(control: NgModel | AbstractControl, errors?: string[]) {

    control = control instanceof NgModel ? control.control : control;
    if (errors?.length) {
      const errorObj = { 
        zodError: errors[0],
        zodErrors: errors
      };
      control.setErrors(errorObj);
    }
  }
  
  // Clear only Zod errors from a form control, preserving other validation errors
  private clearZodErrors(control: NgModel | AbstractControl) {

    control = control instanceof NgModel ? control.control : control;

    if (control.errors) {
      const currentErrors = { ...control.errors };
      delete currentErrors['zodError'];
      delete currentErrors['zodErrors'];
      
      if (Object.keys(currentErrors).length === 0) {
        control.setErrors(null);
      } else {
        control.setErrors(currentErrors);
      }
    }
  }
  
  // Collect form data from all controls
  private getFormData(form: FormGroup): Record<string, any> {
    const controls = Object.entries(form.controls).map(([name, control]) => ({ name, control }));
    return controls.reduce((data, control) => {
      data[control.name] = control.control.value;
      return data;
    }, {} as Record<string, any>);
  }
  
  // Full form validation
  validateForm(form: FormGroup) {
    // Skip validation if schema is not provided
    // if (!this.zodSchema) return { isValid: true, result: undefined };
    
    // Create data object from form controls
    const formData = this.getFormData(form);
    
    // Validate with Zod
    const result = this.zodSchema().safeParse(formData);

    const controls = Object.entries(form.controls).map(([name, control]) => ({ name, control }));
    
    if (!result.success) {
      // Extract and apply errors to corresponding form controls
      const formattedErrors = result.error.format();
      const errors: Record<string, string[] | undefined> = {};
      controls.forEach(control => {
        const fieldName = control.name;
        const fieldErrors = (formattedErrors as Record<string, { _errors?: string[] }>)?.[fieldName]?._errors;
        this.setZodErrors(control.control, fieldErrors);
        if(fieldErrors) {
          errors[fieldName] = fieldErrors;
        }
      });

      form.setErrors(errors);
      
      return { isValid: false, result };
    } else {
      // Clear Zod errors when validation passes
      controls.forEach(({ control }) => {
        this.clearZodErrors(control);
      });

      form.setErrors(null);
      
      return { isValid: true, result };
    }
  }
  
  onSubmit(evt: Event) {

    const form = this.formGroup();
    const { isValid, result } = this.validateForm(form);
    
    if (!isValid) {
      evt.preventDefault();
      evt.stopPropagation();
      // Form is valid according to Zod
      console.error('Form invalid!', { values: form.value, errors: form.errors, result });
      return;
    }

    this.submit.emit(result.data!);
  }
}
