import { Component } from '@angular/core';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';
import { input } from '@angular/core';


export type ProgressBaseInfo = {
  status: 'initiate' | 'download' | 'progress' | 'done';
  name: string;
  file: string;
}

export type InitialProgressInfo =  ProgressBaseInfo & {
  status: 'initiate';
}

export type DownloadProgressInfo = ProgressBaseInfo & {
  status: 'download';
}

export type DownloadingProgressInfo = ProgressBaseInfo & {
  status: 'progress';
  progress: number;
  loaded: number;
  total: number;
}

export type CompletedProgressInfo = ProgressBaseInfo & {
  status: 'done';
}

export type ProgressInfo = InitialProgressInfo | DownloadingProgressInfo | DownloadProgressInfo | CompletedProgressInfo;

@Component({
  selector: 'app-model-download-progress',
  imports: [ProgressBarComponent],
  templateUrl: './model-download-progress.component.html',
  styleUrl: './model-download-progress.component.scss'
})
export class ModelDownloadProgressComponent {

  readonly downloadProgress = input.required<ProgressInfo | undefined>();

}
