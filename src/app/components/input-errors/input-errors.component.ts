import { Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-input-errors',
  imports: [],
  templateUrl: './input-errors.component.html',
  styleUrl: './input-errors.component.scss'
})
export class InputErrorsComponent {

  readonly control = input.required<AbstractControl>();

}
