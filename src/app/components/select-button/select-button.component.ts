import { NgClass } from '@angular/common';
import { Component, input, model, OnInit, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-select-button',
  standalone: true,
  imports: [NgClass, FormsModule],
  templateUrl: './select-button.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: SelectButtonComponent,
      multi: true
    }
  ]
})
export class SelectButtonComponent implements ControlValueAccessor, OnInit {
  private onChanged: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  readonly disabled = model(false);
  readonly options = input.required<Array<{ label: string, value: string }>>();
  protected selectedOption = signal<string | undefined>(undefined);

  ngOnInit() {
    if (!this.selectedOption() && this.options().length > 0) {
      this.writeValue(this.options()[0].value);
    }
  }

  selectOption(option: string) {
    if (this.disabled()) return;
    
    this.selectedOption.set(option);
    this.onChanged(option);
    this.onTouched();
  }

  writeValue(obj: string): void {
    this.selectedOption.set(obj);
  }

  registerOnChange(fn: any): void {
    this.onChanged = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}