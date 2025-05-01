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

export function formatBytes(bytes: number): string {
    const kilobyte = 1024;
    const megabyte = kilobyte * 1024;
    const gigabyte = megabyte * 1024;

    if (bytes < kilobyte) {
        return bytes + ' Bytes';
    } else if (bytes < megabyte) {
        return (bytes / kilobyte).toFixed(2) + ' KB';
    } else if (bytes < gigabyte) {
        return (bytes / megabyte).toFixed(2) + ' MB';
    } else {
        return (bytes / gigabyte).toFixed(2) + ' GB';
    }
}

export function webgl_detect(return_context?: boolean) {
    if (!!window.WebGLRenderingContext) {
        let canvas = document.createElement("canvas"),
            names = ["webgl2", "webgl", "experimental-webgl", "moz-webgl", "webkit-3d"],
            context: RenderingContext | boolean | null = false;

        for (var i = 0; i < names.length; i++) {
            try {
                context = canvas.getContext(names[i]);
                /** @ts-ignore */
                if (context && typeof context.getParameter == "function") {
                    // WebGL is enabled
                    if (return_context) {
                        // return WebGL object if the function's argument is present
                        return { name: names[i], gl: context };
                    }
                    // else, return just true
                    return true;
                }
            } catch (e) { }
        }

        // WebGL is supported, but disabled
        return false;
    }

    // WebGL not supported
    return false;
}

// Ref: https://gist.github.com/bilelz/c96fb0b1f62983d061910e8d310a5162
export async function getChecksumSha256(blob: Blob): Promise<string> {
    const uint8Array = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', uint8Array);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map((h) => h.toString(16).padStart(2, '0')).join('');
}