import { Component, effect, ElementRef, inject, input, output, signal, viewChild, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheerpjService } from '@/app/core/services/cheerpj.service';

const OPENAPI_GENERATOR_JAR = '/swagger-editor/openapi-generator-cli-7.22.0.jar';

interface GeneratorConfig {
  type: 'client' | 'server';
  lang: string;
}

@Component({
  selector: 'app-swagger-generation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './swagger-generation-modal.component.html',
  styleUrl: './swagger-generation-modal.component.scss'
})
export class SwaggerGenerationModalComponent {
  private readonly cheerpjService = inject(CheerpjService);

  spec = input.required<string>();
  generator = input.required<GeneratorConfig>();
  
  onClose = output<void>();

  readonly isGenerating = this.cheerpjService.isGenerating;
  readonly isMinimized = this.cheerpjService.isMinimized;
  readonly generationStatus = signal<string>('Initializing...');
  readonly consoleLogs = signal<{message: string, type: 'info' | 'error'}[]>([]);
  readonly isInitialized = this.cheerpjService.isInitialized;

  readonly cancelRequested = signal<boolean>(false);

  private originalLog = console.log;
  private originalError = console.error;

  readonly consoleScroll = viewChild<ElementRef<HTMLDivElement>>('consoleScroll');

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
    }, { allowSignalWrites: true });
  }

  cancelGeneration() {
    if (!this.isGenerating()) return;
    this.cancelRequested.set(true);
    this.addConsoleLog('Cancellation requested by user. Aborting...', 'error');
    this.generationStatus.set('Cancellation in progress...');
  }

  private setupConsoleInterception() {
    console.log = (...args: any[]) => {
      this.originalLog.apply(console, args);
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      this.addConsoleLog(message, 'info');
    };

    console.error = (...args: any[]) => {
      this.originalError.apply(console, args);
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      this.addConsoleLog(message, 'error');
    };
  }

  private restoreConsole() {
    console.log = this.originalLog;
    console.error = this.originalError;
  }

  private addConsoleLog(message: string, type: 'info' | 'error') {
    this.consoleLogs.update(logs => [...logs.slice(-100), { message, type }]);
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
      this.generationStatus.set('Preparing CheerpJ runtime...');
      await this.cheerpjService.initializeRuntime();
      if (this.cancelRequested()) return;

      // 2. Clear previous output to prevent bundling old files
      this.generationStatus.set('Cleaning virtual filesystem...');
      await this.clearOutputDirectory();
      if (this.cancelRequested()) return;

      // 3. Prepare files
      this.generationStatus.set('Preparing OpenAPI specification...');
      (window as any).cheerpOSAddStringFile('/str/openapi.yaml', this.spec());
      if (this.cancelRequested()) return;

      // 4. Run generator
      this.generationStatus.set(`Generating ${this.generator().lang}...`);
      const jarPath = `/app${OPENAPI_GENERATOR_JAR}`;
      const exitCode = await (window as any).cheerpjRunJar(
        jarPath,
        'generate',
        '-g', this.generator().lang,
        '-i', '/str/openapi.yaml',
        '-o', '/files/out'
      );

      if (this.cancelRequested()) {
        this.addConsoleLog('Process finished after cancellation. Output discarded.', 'info');
        return;
      }

      if (exitCode !== 0) {
        throw new Error(`Generator exited with code ${exitCode}`);
      }

      // 5. Bundle and download
      await this.downloadGeneratedZip();
      this.generationStatus.set('Generation complete!');

    } catch (ex) {
      if (this.cancelRequested()) return;
      console.error('Generation failed', ex);
      this.generationStatus.set('Generation failed.');
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
      this.generationStatus.set('Bundling files into ZIP...');
      const zip = new JSZip();
      
      const dbName = await this.cheerpjService.findDatabaseName();
      console.log('Accessing virtual filesystem from:', dbName);

      const db = await this.openIndexedDB(dbName);
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.openCursor();
        request.onsuccess = (event: any) => {
          const cursor = event.target.result;
          if (cursor) {
            const path = cursor.key as string;
            console.log('IDB Entry found:', path, cursor.value.type);
            // In CheerpJ 4.x, the value is an object containing 'contents' (Uint8Array)
            // and 'type'. We only want files.
            const entry = cursor.value;
            if (entry && entry.type === 'file' && entry.contents) {
              const relativePath = path.replace('/files/out/', '').replace(/^\/+/, '');
              if (relativePath) {
                console.log('Adding to ZIP:', relativePath);
                zip.file(relativePath, entry.contents);
              }
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(new Error('Failed to read files from IndexedDB'));
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      this.downloadFile(blob, `${this.generator()}-generated.zip`);
    } catch (ex) {
      throw new Error(`Failed to create ZIP: ${ex instanceof Error ? ex.message : 'Unknown error'}`);
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
    this.isMinimized.update(v => !v);
  }

  close() {
    if (this.isGenerating()) return;
    this.onClose.emit();
  }
}
