import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';


interface MetaInfo {
  title: string;
  description: string;
  updateCanonical?: boolean;
  keywords?: string;
  thumbnail?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MetadataService {

  private readonly titleService = inject(Title);
  private readonly metadataService = inject(Meta);
  private readonly document = inject(DOCUMENT);

  updateMetadata({ title, description, updateCanonical = true, keywords, thumbnail }: MetaInfo) {

    this.titleService.setTitle(title);
    this.metadataService.updateTag({ property: 'og:title', content: title });
    this.metadataService.updateTag({ property: 'og:description', content: description });
    this.metadataService.updateTag({ property: 'twitter:description', content: description });
    this.metadataService.updateTag({ name: 'description', content: description });

    if(keywords) {
        this.metadataService.updateTag({ name: 'keywords', content: keywords });
    }

    if(thumbnail) {
      this.metadataService.updateTag({ property: 'og:image', content: thumbnail })
      this.metadataService.updateTag({ name: 'twitter:image', content: thumbnail })
    }

    if(updateCanonical) {
      this.updateCanonnicalUrl();
    }
  }


  private updateCanonnicalUrl(url?: string) {
    const canURL = !url ? this.document.URL : url;
    const link = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    link.setAttribute('href', canURL);
  }

}
