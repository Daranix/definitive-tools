import { NgStyle } from '@angular/common';
import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-image-comparison',
    imports: [NgStyle, FormsModule],
    styleUrls: ['./image-comparison.component.scss'],
    templateUrl: './image-comparison.component.html'
})
export class ImageComparisonComponent {


    readonly beforeImage = input.required<string>();
    readonly afterImage = input.required<string>();
    readonly sliderValue = model<number>(50);
    readonly maxHeight = input.required<number>();


    /*private readonly imageComparer = viewChild.required<ElementRef<HTMLDivElement>>('imageComparer');

    ngAfterViewInit(): void {
        const imageComparer = new ImageCompare(this.imageComparer()!.nativeElement);
        imageComparer.mount();
    }*/


}
