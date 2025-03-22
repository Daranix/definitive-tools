import { Component, ElementRef, HostListener, Injector, OnDestroy, OnInit, Renderer2, forwardRef, inject, input, model, output, signal, viewChild } from '@angular/core';
import { ControlContainer, ControlValueAccessor, FormControl, FormControlDirective, FormControlName, FormGroup, NG_VALUE_ACCESSOR, NgControl, NgModel, ValidationErrors } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Subscription } from 'rxjs';
import { FileSizePipe } from '@app/pipes/file-size.pipe';
import { ToastService } from '@app/services/toast.service';
import { formatBytes } from '@app/utils/functions';

@Component({
  selector: 'app-drag-and-drop-file',
  templateUrl: './drag-and-drop-file.component.html',
  styleUrls: ['./drag-and-drop-file.component.scss'],
  imports: [NgClass, FileSizePipe],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DragAndDropFileComponent),
      multi: true
    }
  ]
})
export class DragAndDropFileComponent implements ControlValueAccessor, OnInit, OnDestroy {

  readonly loading = input(false);
  readonly maxFileSize = input<number>();
  readonly name = input.required<string>();
  readonly validExtensions = input<string[]>();
  private readonly fileUploadInput = viewChild<ElementRef<HTMLInputElement>>('fileUploadInput');
  private readonly toastService = inject(ToastService);
  readonly onFileChange = output<File | undefined>();
  private readonly injector = inject(Injector);
  private readonly renderer2 = inject(Renderer2);
  readonly file = model<File>();

  ngControl?: NgControl;
  private control?: FormControl | null;
  private subscription?: Subscription;

  readonly hover = signal(false);
  readonly disabled = signal(false);

  private readonly errorMessages: Record<string, string> = {
    'required': 'Field is required'
  };

  onChange = (value?: File) => {
    this.file.set(value)
    this.onFileChange.emit(value);
  };

  onTouch = () => { }

  @HostListener('dragover', ['$event']) onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.hover.set(true);
  }

  @HostListener('drop', ['$event']) onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.hover.set(false);
    this.onFileChanged(event.dataTransfer?.files)
  }

  @HostListener('dragleave', ['$event']) onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.hover.set(false);
  }

  writeValue(value?: File): void {
    this.file.set(value);
    // this.setProperty('value', value);
  }

  registerOnChange(fn: (value?: File) => any): void {
    this.onChange = (value?: File) => {
      this.file.set(value);
      fn(value);
    };
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onFileChangedManual(event: Event) {
    const target = event.target as HTMLInputElement;
    this.onFileChanged(target.files);
  }

  onFileChanged(files: FileList | null | undefined) {

    const file = files?.item(0) || undefined;

    if(!file) {
      return;
    }

    if(this.maxFileSize() && file.size > this.maxFileSize()!) {
      this.toastService.error({ message: `The file exceeds the maximun size limit ${formatBytes(this.maxFileSize()!)}` })
      return;
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if(this.validExtensions() && !this.validExtensions()!.includes(ext)) {
      this.toastService.error({ message: `The file type is not supported. Only ${this.validExtensions()?.join(', ')} are allowed.` })
      return;
    }

    this.updateValue(file);
  }

  ngOnInit(): void {
    const ngControl = this.injector.get(NgControl, null, { self: true, optional: true });
    this.ngControl = ngControl!;

    if (ngControl && ngControl != null) {
      if (ngControl instanceof NgModel) {
        this.control = ngControl.control;
        this.subscription = ngControl.control.valueChanges.subscribe((value) => {
          if (ngControl.model !== value || ngControl.viewModel !== value && value !== '') {
            ngControl.viewToModelUpdate(value);
          }
        });
      } else if (ngControl instanceof FormControlDirective) {
        this.control = ngControl.control;
      } else if (ngControl instanceof FormControlName) {
        const container = this.injector.get(ControlContainer).control as FormGroup;
        this.control = container.controls[ngControl.name!] as FormControl;
      } else {
        this.control = new FormControl();
      }
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  getErrorMessages(errors: ValidationErrors | null | undefined) {

    if (!errors) {
      return [];
    }

    const keys = Object.keys(errors);
    return keys.map((v) => this.errorMessages[v] || undefined);
  }

  setProperty(key: string, value: any): void {
    this.renderer2.setProperty(this.fileUploadInput()?.nativeElement, key, value);
  }

  private updateValue(value?: File) {
    this.writeValue(value);
    this.file.set(value);
    this.onChange(value);
    this.onTouch();
  }
  
}
