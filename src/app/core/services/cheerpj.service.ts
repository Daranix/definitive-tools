import { Injectable, signal } from '@angular/core';

const CHEERPJ_LOADER_URL = 'https://cjrtnc.leaningtech.com/4.3/loader.js';

@Injectable()
export class CheerpjService {

  readonly isInitialized = signal<boolean>(false);
  readonly isGenerating = signal<boolean>(false);
  readonly isMinimized = signal<boolean>(false);
  private static isLoaderInjected = false;

  constructor() { }

  /**
   * Ensures the CheerpJ loader is injected into the document.
   * Uses loader isolation to prevent conflicts with Monaco's AMD loader.
   */
  async ensureLoaderLoaded(): Promise<void> {
    if (CheerpjService.isLoaderInjected || (window as any).cheerpjInit) {
      CheerpjService.isLoaderInjected = true;
      return;
    }

    return new Promise((resolve, reject) => {
      // 1. Temporarily isolate Monaco's AMD loader
      const win = window as any;
      const originalDefine = win.define;
      const originalRequire = win.require;
      
      // Use assignment instead of delete as window properties can be non-configurable
      if (win.define) win.define = undefined;
      if (win.require) win.require = undefined;

      // 2. Inject CheerpJ loader
      const script = document.createElement('script');
      script.src = CHEERPJ_LOADER_URL;
      script.async = true;

      script.onload = () => {
        // 3. Restore Monaco's loader
        if (originalDefine) win.define = originalDefine;
        if (originalRequire) win.require = originalRequire;
        
        CheerpjService.isLoaderInjected = true;
        console.log('CheerpJ 4.3 loader injected and isolated.');
        
        // Wait a small bit for CheerpJ to fully register on window
        const check = setInterval(() => {
          if (win.cheerpjInit) {
            clearInterval(check);
            resolve();
          }
        }, 50);
      };

      script.onerror = (err) => {
        (window as any).define = originalDefine;
        (window as any).require = originalRequire;
        reject(new Error('Failed to load CheerpJ loader script.'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Initializes the CheerpJ runtime if it hasn't been initialized yet.
   */
  async initializeRuntime(): Promise<void> {
    if (this.isInitialized()) return;

    await this.ensureLoaderLoaded();
    
    if (!(window as any).cheerpjInit) {
      throw new Error('CheerpJ loader loaded but cheerpjInit not found on window.');
    }

    // Isolate global namespace during the entire initialization process
    const win = window as any;
    const originalDefine = win.define;
    const originalRequire = win.require;
    
    // Use assignment instead of delete as window properties can be non-configurable
    if (win.define) win.define = undefined;
    if (win.require) win.require = undefined;

    try {
      console.log('Starting CheerpJ 4.3 runtime (Java 17) with isolation...');
      await win.cheerpjInit({ 
        version: 17,
        status: "none" // Suppress splash screen for better integration
      });
      this.isInitialized.set(true);
      console.log('CheerpJ 4.3 runtime initialized successfully.');
    } catch (err) {
      console.error('CheerpJ initialization failed:', err);
      throw err;
    } finally {
      // Restore Monaco's AMD loader immediately after CheerpJ is ready
      if (originalDefine) win.define = originalDefine;
      if (originalRequire) win.require = originalRequire;
    }
  }

  /**
   * Dynamically finds the CheerpJ IndexedDB database name.
   * In CheerpJ 4.3, the persistent /files/ mount is stored in "cjFS_/files/".
   */
  async findDatabaseName(): Promise<string> {
    try {
      const dbs = await (window.indexedDB as any).databases();
      // Look for the specific cjFS_ prefix used in CheerpJ 4.x
      const found = dbs.find((db: any) => 
        db.name === 'cjFS_/files/' || 
        db.name.includes('cjFS_')
      );
      if (found) return found.name;
    } catch (e) {
      console.warn('Failed to list databases via API, falling back to guess-work.', e);
    }
    return 'cjFS_/files/'; // Standard 4.3 name for /files/ mount
  }
}
