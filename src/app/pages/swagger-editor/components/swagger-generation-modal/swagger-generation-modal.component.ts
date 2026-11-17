import {
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  untracked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { CheerpjService } from '@/app/core/services/cheerpj.service';
import { I18nService } from '@/app/i18n/i18n.service';

const OPENAPI_GENERATOR_JAR =
  '/swagger-editor/openapi-generator-cli-7.22.0.jar';

interface GeneratorConfig {
  type: 'client' | 'server';
  lang: string;
}

@Component({
  selector: 'app-swagger-generation-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './swagger-generation-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './swagger-generation-modal.component.scss',
})
export class SwaggerGenerationModalComponent {
  private readonly cheerpjService = inject(CheerpjService);
  private readonly i18n = inject(I18nService);

  spec = input.required<string>();
  generator = input.required<GeneratorConfig>();

  onClose = output<void>();

  readonly isGenerating = this.cheerpjService.isGenerating;
  readonly isMinimized = this.cheerpjService.isMinimized;
  readonly generationStatus = signal<string>(
    this.i18n.t('swagger-editor.modal.generation.initializing'),
  );
  readonly consoleLogs = signal<{ message: string; type: 'info' | 'error' }[]>(
    [],
  );
  readonly isInitialized = this.cheerpjService.isInitialized;

  readonly cancelRequested = signal<boolean>(false);

  private originalLog = console.log;
  private originalError = console.error;

  readonly consoleScroll =
    viewChild<ElementRef<HTMLDivElement>>('consoleScroll');

  constructor() {
    effect(() => {
      if (this.consoleLogs().length > 0) {
        setTimeout(() => {
          const el = this.consoleScroll()?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        }, 50);
      }
    });

    // Reactively start generation whenever the generator selection changes
    effect(() => {
      const gen = this.generator();
      if (gen) {
        // Always maximize when a new generator is selected to show the process
        this.isMinimized.set(false);
        untracked(() => this.startGeneration());
      }
    });
  }

  cancelGeneration() {
    if (!this.isGenerating()) return;
    this.cancelRequested.set(true);
    this.addConsoleLog(
      this.i18n.t('swagger-editor.modal.logs.cancellationRequested'),
      'error',
    );
    this.generationStatus.set(
      this.i18n.t('swagger-editor.modal.generation.cancelling'),
    );
  }

  private setupConsoleInterception() {
    console.log = (...args: any[]) => {
      this.originalLog.apply(console, args);
      const message = args
        .map((arg) =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg),
        )
        .join(' ');
      this.addConsoleLog(message, 'info');
    };

    console.error = (...args: any[]) => {
      this.originalError.apply(console, args);
      const message = args
        .map((arg) =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg),
        )
        .join(' ');
      this.addConsoleLog(message, 'error');
    };
  }

  private restoreConsole() {
    console.log = this.originalLog;
    console.error = this.originalError;
  }

  private addConsoleLog(message: string, type: 'info' | 'error') {
    this.consoleLogs.update((logs) => [...logs.slice(-100), { message, type }]);
  }

  async startGeneration() {
    if (this.isGenerating()) return;
    this.cancelRequested.set(false);
    this.setupConsoleInterception();
    try {
      // 0. Reset state for new run
      this.clearConsole();
      this.isGenerating.set(true);

      // 1. Ensure runtime is ready
      this.generationStatus.set(
        this.i18n.t('swagger-editor.modal.generation.preparingRuntime'),
      );
      await this.cheerpjService.initializeRuntime();
      if (this.cancelRequested()) return;

      // 2. Clear previous output to prevent bundling old files
      this.generationStatus.set(
        this.i18n.t('swagger-editor.modal.generation.cleaningFilesystem'),
      );
      await this.clearOutputDirectory();
      if (this.cancelRequested()) return;

      // 3. Prepare files
      this.generationStatus.set(
        this.i18n.t('swagger-editor.modal.generation.preparingSpec'),
      );
      (window as any).cheerpOSAddStringFile('/str/openapi.yaml', this.spec());
      if (this.cancelRequested()) return;

      // 4. Run generator
      this.generationStatus.set(
        this.i18n.t('swagger-editor.modal.generation.generating', {
          lang: this.generator().lang,
        }),
      );
      const jarPath = `/app${OPENAPI_GENERATOR_JAR}`;
      const exitCode = await (window as any).cheerpjRunJar(
        jarPath,
        'generate',
        '-g',
        this.generator().lang,
        '-i',
        '/str/openapi.yaml',
        '-o',
        '/files/out',
      );

      if (this.cancelRequested()) {
        this.addConsoleLog(
          this.i18n.t('swagger-editor.modal.logs.processFinishedAfterCancel'),
          'info',
        );
        return;
      }

      if (exitCode !== 0) {
        throw new Error(`Generator exited with code ${exitCode}`);
      }

      // 5. Bundle and download
      await this.downloadGeneratedZip();
      this.generationStatus.set(
        this.i18n.t('swagger-editor.modal.generation.complete'),
      );
    } catch (ex) {
      if (this.cancelRequested()) return;
      console.error(
        this.i18n.t('swagger-editor.modal.logs.generationFailed'),
        ex,
      );
      this.generationStatus.set(
        this.i18n.t('swagger-editor.modal.generation.failed'),
      );
    } finally {
      this.isGenerating.set(false);
      this.restoreConsole();
    }
  }
  private async clearOutputDirectory() {
    try {
      const dbName = await this.cheerpjService.findDatabaseName();
      const db = await this.openIndexedDB(dbName);
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');

      // Delete all entries in the /files/out/ range
      const range = IDBKeyRange.bound('/files/out/', '/files/out/' + '\uffff');
      const request = store.delete(range);

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.warn('Failed to clear output directory, proceeding anyway...', e);
    }
  }
  private async downloadGeneratedZip() {
    try {
      const JSZip = (await import('jszip')).default;
      this.generationStatus.set(
        this.i18n.t('swagger-editor.modal.generation.bundling'),
      );
      const zip = new JSZip();

      const dbName = await this.cheerpjService.findDatabaseName();
      console.log(
        this.i18n.t('swagger-editor.modal.logs.accessingFilesystem'),
        dbName,
      );

      const db = await this.openIndexedDB(dbName);
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');

      await new Promise<void>((resolve, reject) => {
        const request = store.openCursor();
        request.onsuccess = (event: any) => {
          const cursor = event.target.result;
          if (cursor) {
            const path = cursor.key as string;
            console.log(
              this.i18n.t('swagger-editor.modal.logs.idbEntryFound'),
              path,
              cursor.value.type,
            );
            // In CheerpJ 4.x, the value is an object containing 'contents' (Uint8Array)
            // and 'type'. We only want files.
            const entry = cursor.value;
            if (entry && entry.type === 'file' && entry.contents) {
              const relativePath = path
                .replace('/files/out/', '')
                .replace(/^\/+/, '');
              if (relativePath) {
                console.log(
                  this.i18n.t('swagger-editor.modal.logs.addingToZip'),
                  relativePath,
                );
                zip.file(relativePath, entry.contents);
              }
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () =>
          reject(new Error('Failed to read files from IndexedDB'));
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      // The original name interpolated the generator config object itself; keep
      // that exact value so the downloaded file name does not change.
      this.downloadFile(
        blob,
        this.i18n.t('swagger-editor.modal.downloads.generatedZip', {
          generator: `${this.generator()}`,
        }),
      );
    } catch (ex) {
      throw new Error(
        `Failed to create ZIP: ${ex instanceof Error ? ex.message : 'Unknown error'}`,
      );
    }
  }

  private openIndexedDB(name: string): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private downloadFile(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  clearConsole() {
    this.consoleLogs.set([]);
  }

  toggleMinimize() {
    this.isMinimized.update((v) => !v);
  }

  close() {
    if (this.isGenerating()) return;
    this.onClose.emit();
  }
}
