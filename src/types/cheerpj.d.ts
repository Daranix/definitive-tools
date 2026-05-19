declare interface CheerpJ {
  /**
   * Initializes the CheerpJ runtime.
   */
  cheerpjInit?(options?: {
    version?: 8 | 11 | 17;
    status?: "splash" | "none" | "default";
    javaProperties?: string[];
  }): Promise<void>;

  /**
   * Runs a JAR file in the virtual filesystem.
   * @param jarPath Path to the JAR file (e.g. /app/path/to.jar)
   * @param args Arguments for the JAR execution
   */
  cheerpjRunJar?(path: string, ...args: string[]): Promise<number>;

  /**
   * Runs a Java main class.
   * @param className The full name of the main class
   * @param args Arguments for the main class
   */
  cheerpjRunMain?(className: string, classpath: string, ...args: string[]): Promise<number>;

  /**
   * Adds a file to the virtual filesystem from a string or Uint8Array.
   * Path should typically start with /str/ or /files/.
   */
  cheerpOSAddStringFile?(path: string, content: string | Uint8Array): void;

  /**
   * Returns a Blob for a file in the virtual filesystem.
   * Typically used to download files from /files/.
   */
  cjFileBlob?(path: string): Promise<Blob>;
}

// Extend the Window interface to include CheerpJ functions
interface Window extends CheerpJ {}
