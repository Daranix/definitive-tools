import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  AudioClip,
  AudioFormat,
  AudioTrack,
  ExportedClip,
  TimelineClip,
} from '../audio-editor.schema';

export interface ExportProgressEvent {
  progress: number;
  step: string;
}

@Injectable({
  providedIn: 'root',
})
export class AudioExportService {
  private readonly platformId = inject(PLATFORM_ID);
  private ffmpeg: any = null;
  readonly loaded = signal<boolean>(false);
  readonly logs = signal<string[]>([]);

  private getCodecArgs(fmt: AudioFormat, br: number, sr: number): string[] {
    const args: string[] = [];
    switch (fmt) {
      case 'mp3':
        args.push('-c:a', 'libmp3lame', '-b:a', `${br}k`);
        break;
      case 'wav':
        args.push('-c:a', 'pcm_s16le');
        break;
      case 'ogg':
        args.push('-c:a', 'libvorbis', '-b:a', `${br}k`);
        break;
      case 'aac':
        args.push('-c:a', 'aac', '-b:a', `${br}k`);
        break;
      case 'flac':
        args.push('-c:a', 'flac');
        break;
    }
    if (sr) args.push('-ar', sr.toString());
    return args;
  }

  private getMimeType(fmt: AudioFormat): string {
    const mimeMap: Record<AudioFormat, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      aac: 'audio/aac',
      flac: 'audio/flac',
    };
    return mimeMap[fmt] || 'audio/mpeg';
  }

  async initFFmpeg(onProgress?: (percent: number) => void): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.loaded()) return;

    this.logs.update((l) => [...l, 'Loading FFmpeg Core locally...']);
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on('progress', ({ progress }: { progress: number }) => {
      if (onProgress) onProgress(Math.round(progress * 100));
    });

    this.ffmpeg.on('log', ({ message }: { message: string }) => {
      this.logs.update((l) => [...l, message]);
    });

    const baseURL = `${window.location.origin}/assets/ffmpeg`;
    await this.ffmpeg.load({
      classWorkerURL: `${baseURL}/worker.js`,
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.loaded.set(true);
    this.logs.update((l) => [...l, 'FFmpeg core loaded successfully.']);
  }

  // 1. Export Trimmed Range
  async exportTrim(
    file: File,
    start: number,
    end: number,
    fmt: AudioFormat,
    br: number,
    sr: number,
    onStep?: (step: string) => void,
  ): Promise<{ blob: Blob; fileName: string }> {
    await this.initFFmpeg();
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const inputName = `input_${Date.now()}${ext}`;
    const outputExt = fmt === 'aac' ? '.m4a' : `.${fmt}`;
    const outputName = `output_${Date.now()}${outputExt}`;

    if (onStep) onStep('Writing file to virtual FS...');
    const { fetchFile } = await import('@ffmpeg/util');
    await this.ffmpeg.writeFile(inputName, await fetchFile(file));

    const args: string[] = [
      '-ss', start.toFixed(3),
      '-to', end.toFixed(3),
      '-i', inputName,
      ...this.getCodecArgs(fmt, br, sr),
      outputName,
    ];

    if (onStep) onStep('Processing audio trim...');
    this.logs.update((l) => [...l, `Executing: ffmpeg ${args.join(' ')}`]);
    await this.ffmpeg.exec(args);

    const data = await this.ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer as ArrayBuffer], { type: this.getMimeType(fmt) });

    const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
    const fileName = `${baseName}_trimmed${outputExt}`;

    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile(outputName);

    return { blob, fileName };
  }

  // 2. Export Cut Out / Spliced Range
  async exportRemove(
    file: File,
    keptIntervals: { start: number; end: number }[],
    fmt: AudioFormat,
    br: number,
    sr: number,
    onStep?: (step: string) => void,
  ): Promise<{ blob: Blob; fileName: string }> {
    await this.initFFmpeg();
    if (keptIntervals.length === 0) {
      throw new Error('All audio has been cut out! Nothing to export.');
    }

    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const inputName = `input_${Date.now()}${ext}`;
    const outputExt = fmt === 'aac' ? '.m4a' : `.${fmt}`;
    const outputName = `output_${Date.now()}${outputExt}`;

    if (onStep) onStep('Writing file to virtual FS...');
    const { fetchFile } = await import('@ffmpeg/util');
    await this.ffmpeg.writeFile(inputName, await fetchFile(file));

    let args: string[] = [];

    if (keptIntervals.length === 1) {
      args = [
        '-ss', keptIntervals[0].start.toFixed(3),
        '-to', keptIntervals[0].end.toFixed(3),
        '-i', inputName,
        ...this.getCodecArgs(fmt, br, sr),
        outputName,
      ];
    } else {
      let filter = '';
      let concatInputs = '';
      for (let i = 0; i < keptIntervals.length; i++) {
        const seg = keptIntervals[i];
        filter += `[0:a]atrim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}];`;
        concatInputs += `[a${i}]`;
      }
      filter += `${concatInputs}concat=n=${keptIntervals.length}:v=0:a=1[out]`;

      args = [
        '-i', inputName,
        '-filter_complex', filter,
        '-map', '[out]',
        ...this.getCodecArgs(fmt, br, sr),
        outputName,
      ];
    }

    if (onStep) onStep(`Splicing & concatenating ${keptIntervals.length} segments...`);
    this.logs.update((l) => [...l, `Executing: ffmpeg ${args.join(' ')}`]);
    await this.ffmpeg.exec(args);

    const data = await this.ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer as ArrayBuffer], { type: this.getMimeType(fmt) });

    const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
    const fileName = `${baseName}_spliced${outputExt}`;

    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile(outputName);

    return { blob, fileName };
  }

  // 3. Export Split Clips + JSZip bundle
  async exportSplit(
    file: File,
    clips: AudioClip[],
    fmt: AudioFormat,
    br: number,
    sr: number,
    onStep?: (step: string) => void,
  ): Promise<{ exportedClips: ExportedClip[]; zipBlob?: Blob; zipFileName?: string }> {
    await this.initFFmpeg();
    if (clips.length === 0) {
      throw new Error('No clips defined to export.');
    }

    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const inputName = `input_${Date.now()}${ext}`;
    const outputExt = fmt === 'aac' ? '.m4a' : `.${fmt}`;
    const baseName = file.name.substring(0, file.name.lastIndexOf('.'));

    if (onStep) onStep('Writing file to virtual FS...');
    const { fetchFile } = await import('@ffmpeg/util');
    await this.ffmpeg.writeFile(inputName, await fetchFile(file));

    const exported: ExportedClip[] = [];

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const clipOutputName = `clip_${i}_${Date.now()}${outputExt}`;
      const safeClipName = (clip.name || `Clip ${i + 1}`).replace(/[\\/:*?"<>|]/g, '_');

      if (onStep) onStep(`Exporting clip ${i + 1} of ${clips.length}: "${clip.name}"...`);

      const args: string[] = [
        '-ss', clip.start.toFixed(3),
        '-to', clip.end.toFixed(3),
        '-i', inputName,
        ...this.getCodecArgs(fmt, br, sr),
        clipOutputName,
      ];

      await this.ffmpeg.exec(args);
      const data = await this.ffmpeg.readFile(clipOutputName);
      const blob = new Blob([data.buffer as ArrayBuffer], { type: this.getMimeType(fmt) });
      const url = URL.createObjectURL(blob);

      exported.push({
        id: clip.id,
        name: `${baseName}_${safeClipName}${outputExt}`,
        blob,
        url,
        size: blob.size,
        duration: clip.end - clip.start,
      });

      await this.ffmpeg.deleteFile(clipOutputName);
    }

    await this.ffmpeg.deleteFile(inputName);

    let zipBlob: Blob | undefined;
    let zipFileName: string | undefined;

    if (onStep) onStep('Bundling clips into ZIP archive...');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const item of exported) {
        zip.file(item.name, item.blob);
      }

      zipBlob = await zip.generateAsync({ type: 'blob' });
      zipFileName = `${baseName}_clips.zip`;
    } catch (zipErr) {
      console.error('Failed to create ZIP:', zipErr);
    }

    return { exportedClips: exported, zipBlob, zipFileName };
  }

  // 4. Export Multi-Track Master Mixdown
  async exportMultiTrackMaster(
    clips: TimelineClip[],
    tracks: AudioTrack[],
    masterVolume: number,
    fmt: AudioFormat,
    br: number,
    sr: number,
    onStep?: (step: string) => void,
  ): Promise<{ blob: Blob; fileName: string }> {
    await this.initFFmpeg();

    const hasSolo = tracks.some((t) => t.solo);
    const activeTracks = tracks.filter((t) => (hasSolo ? t.solo : !t.muted));
    const activeTrackIds = new Set(activeTracks.map((t) => t.id));
    const activeClips = clips.filter((c) => activeTrackIds.has(c.trackId));

    if (activeClips.length === 0) {
      throw new Error('No active/unmuted clips on the timeline to export.');
    }

    const outputExt = fmt === 'aac' ? '.m4a' : `.${fmt}`;
    const outputName = `master_mix_${Date.now()}${outputExt}`;

    const { fetchFile } = await import('@ffmpeg/util');

    if (onStep) onStep('Loading audio files into virtual FS...');
    const fileMap = new Map<File, string>();
    const createdFiles: string[] = [];

    for (let i = 0; i < activeClips.length; i++) {
      const file = activeClips[i].file;
      if (!fileMap.has(file)) {
        const ext = file.name.substring(file.name.lastIndexOf('.'));
        const inputName = `track_in_${Date.now()}_${i}${ext}`;
        await this.ffmpeg.writeFile(inputName, await fetchFile(file));
        fileMap.set(file, inputName);
        createdFiles.push(inputName);
      }
    }

    const ffmpegInputs: string[] = [];
    const inputFileToIndex = new Map<string, number>();

    let inputIdxCounter = 0;
    for (const [, inputName] of fileMap.entries()) {
      ffmpegInputs.push('-i', inputName);
      inputFileToIndex.set(inputName, inputIdxCounter++);
    }

    let filterComplex = '';
    const mixInputs: string[] = [];

    for (let i = 0; i < activeClips.length; i++) {
      const clip = activeClips[i];
      const inputFileName = fileMap.get(clip.file)!;
      const inIdx = inputFileToIndex.get(inputFileName)!;

      const track = tracks.find((t) => t.id === clip.trackId);
      const trackVol = track ? track.volume : 1;
      const combinedVol = clip.volume * trackVol * masterVolume;
      const clipDur = clip.trimEnd - clip.trimStart;
      const delayMs = Math.max(0, Math.round(clip.timelineOffset * 1000));

      let clipFilter = `[${inIdx}:a]atrim=start=${clip.trimStart.toFixed(3)}:end=${clip.trimEnd.toFixed(3)},asetpts=PTS-STARTPTS`;

      if (delayMs > 0) {
        clipFilter += `,adelay=${delayMs}|${delayMs}`;
      }

      if (Math.abs(combinedVol - 1) > 0.01) {
        clipFilter += `,volume=${combinedVol.toFixed(3)}`;
      }

      if (clip.fadeIn > 0) {
        clipFilter += `,afade=t=in:st=0:d=${clip.fadeIn.toFixed(3)}`;
      }

      if (clip.fadeOut > 0) {
        const fadeOutStart = Math.max(0, clipDur - clip.fadeOut);
        clipFilter += `,afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${clip.fadeOut.toFixed(3)}`;
      }

      clipFilter += `[clip_${i}];`;
      filterComplex += clipFilter;
      mixInputs.push(`[clip_${i}]`);
    }

    filterComplex += `${mixInputs.join('')}amix=inputs=${activeClips.length}:duration=longest:dropout_transition=2[out]`;

    const args: string[] = [
      ...ffmpegInputs,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      ...this.getCodecArgs(fmt, br, sr),
      outputName,
    ];

    if (onStep) onStep(`Mixing ${activeClips.length} clips into master track...`);
    this.logs.update((l) => [...l, `Executing master mixdown with ${activeClips.length} layers...`]);
    await this.ffmpeg.exec(args);

    const data = await this.ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer as ArrayBuffer], { type: this.getMimeType(fmt) });
    const fileName = `Master_Mix_${Date.now()}${outputExt}`;

    for (const f of createdFiles) {
      await this.ffmpeg.deleteFile(f);
    }
    await this.ffmpeg.deleteFile(outputName);

    return { blob, fileName };
  }
}
