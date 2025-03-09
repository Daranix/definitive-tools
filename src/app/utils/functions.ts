import { FormGroup } from "@angular/forms";
import { ZodFormControls } from "./types";

export function asZodFormControls<T extends Record<any, any>>(formGroup: any): ZodFormControls<T> {
    return formGroup as ZodFormControls<T>;
}

export function svgToText(svg: SVGElement) {
    return svg.outerHTML;
}

export function svgToDataURL(svg: SVGElement) {
    const svgCode = svgToText(svg);
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    return url;
}