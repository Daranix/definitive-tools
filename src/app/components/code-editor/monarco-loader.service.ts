import { Injectable, Inject, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type * as monaco from 'monaco-editor';

/** @ts-ignore */
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
/** @ts-ignore */
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
/** @ts-ignore */
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
/** @ts-ignore */
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
/** @ts-ignore */
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

@Injectable({
    providedIn: 'root'
})
export class MonacoLoaderService {


    private readonly platformId = inject(PLATFORM_ID);
    private monacoInstance: any;


    async loadMonaco(): Promise<typeof monaco | null> {
        if (!isPlatformBrowser(this.platformId)) {
            return null; // Skip SSR
        }

        if (this.monacoInstance) {
            return this.monacoInstance; // Return existing instance
        }

        const monaco = await import('monaco-editor');

        const serviceContext = this;
        // Fix worker loading issue
        (self as any).MonacoEnvironment = {
            getWorker(_: string, label: string) {
                return serviceContext.workerPathResolver(label);
            }
        };

        this.monacoInstance = monaco;
        return monaco;
    }

    private workerLoader(label: string) {
        // const workerPath = `./workers/${this.workerPathResolver(label)}`;
        return new Worker(new URL('./workers/editor.worker', import.meta.url), { type: 'module' });
    }

    private workerPathResolver(lang: string): Worker {
        if (lang === 'json') {
            return new Worker(new URL('./workers/editor.worker', import.meta.url), { type: 'module' });
        }
        if (lang === 'css' || lang === 'scss' || lang === 'less') {
            return new Worker(new URL('./workers/css.worker', import.meta.url), { type: 'module' });
        }
        if (lang === 'html' || lang === 'handlebars' || lang === 'razor') {
            return new Worker(new URL('./workers/html.worker', import.meta.url), { type: 'module' });
        }
        if (lang === 'typescript' || lang === 'javascript') {
            return new Worker(new URL('./workers/ts.worker', import.meta.url), { type: 'module' });
        }
        return new Worker(new URL('./workers/editor.worker', import.meta.url), { type: 'module' });
    }
}
