import { Pipe, PipeTransform, OnDestroy } from '@angular/core';

@Pipe({
  name: 'blob',
  pure: false, // Make pipe impure since we're dealing with object references
  standalone: true
})
export class BlobPipe implements PipeTransform, OnDestroy {
  private blobUrls = new Map<Blob, string>();

  transform(blob: Blob): string {
    if (!blob) {
      return '';
    }

    // Check if we already have a URL for this blob
    if (this.blobUrls.has(blob)) {
      return this.blobUrls.get(blob)!;
    }

    // Create new URL for this blob
    const url = URL.createObjectURL(blob);
    this.blobUrls.set(blob, url);
    return url;
  }

  ngOnDestroy() {
    // Clean up all created URLs when pipe is destroyed
    this.blobUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    this.blobUrls.clear();
  }
}