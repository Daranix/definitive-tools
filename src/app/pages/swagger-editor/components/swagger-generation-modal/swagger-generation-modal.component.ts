import { Component, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheerpjService } from '@/app/core/services/cheerpj.service';

const OPENAPI_GENERATOR_JAR = '/swagger-editor/openapi-generator-cli-7.22.0.jar';

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
  generator = input.required<string>();
  
  onClose = output<void>();

  readonly isGenerating = signal<boolean>(false);
  readonly isMinimized = signal<boolean>(false);
  readonly generationStatus = signal<string>('Initializing...');
  readonly consoleLogs = signal<{message: string, type: 'info' | 'error'}[]>([]);
  readonly isInitialized = this.cheerpjService.isInitialized;

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

    // Start generation automatically when component is initialized
    this.startGeneration();
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
    this.setupConsoleInterception();
    this.isGenerating.set(true);
    this.generationStatus.set('Starting CheerpJ runtime...');

    try {
      // 1. Ensure runtime is ready
      await this.cheerpjService.initializeRuntime();

      // 2. Prepare files
      this.generationStatus.set('Preparing OpenAPI specification...');
      (window as any).cheerpOSAddStringFile('/str/openapi.yaml', this.spec());

      // 3. Run generator
      this.generationStatus.set(`Generating ${this.generator()}...`);
      // Using cheerpjRunJar is more robust as it uses the JAR's manifest for the main class and classpath
      const jarPath = `/app${OPENAPI_GENERATOR_JAR}`;
      const exitCode = await (window as any).cheerpjRunJar(
        jarPath,
        'generate',
        '-g', this.generator(),
        '-i', '/str/openapi.yaml',
        '-o', '/files/out'
      );

      if (exitCode !== 0) {
        throw new Error(`Generator exited with code ${exitCode}`);
      }

      // 4. Bundle and download
      await this.downloadGeneratedZip();
      this.generationStatus.set('Generation complete!');

    } catch (ex) {
      console.error('Generation failed', ex);
      this.generationStatus.set('Generation failed.');
    } finally {
      this.isGenerating.set(false);
      this.restoreConsole();
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
