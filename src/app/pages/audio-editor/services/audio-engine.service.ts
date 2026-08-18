import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TimelineClip, AudioTrack } from '../audio-editor.schema';

export interface ActiveAudioNode {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

@Injectable({
  providedIn: 'root',
})
export class AudioEngineService {
  private readonly platformId = inject(PLATFORM_ID);
  private audioContext: AudioContext | null = null;
  private activeWebAudioNodes: ActiveAudioNode[] = [];
  private playbackStartTime = 0;
  private playbackStartOffset = 0;

  getAudioContext(): AudioContext {
    if (!this.audioContext && isPlatformBrowser(this.platformId)) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext!;
  }

  async decodeAudio(file: File): Promise<AudioBuffer> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const arrayBuffer = await file.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  }

  /**
   * Sample-accurate Dynamic Peak Pyramid Extraction:
   * Extracts exactly `numBars` peak points for the specified interval [startSec, endSec]
   * directly from raw channel data. At high zoom levels (e.g. 16x - 32x), this calculates
   * transient-accurate discrete peaks without blurriness or stretched chunks.
   */
  extractDynamicPeaks(
    buffer: AudioBuffer,
    startSec: number = 0,
    endSec?: number,
    numBars: number = 200,
  ): number[] {
    if (!buffer || numBars <= 0) return [];

    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const totalDuration = buffer.duration;

    const clampedStart = Math.max(0, Math.min(totalDuration, startSec));
    const clampedEnd = Math.max(clampedStart, Math.min(totalDuration, endSec ?? totalDuration));
    const duration = clampedEnd - clampedStart;

    if (duration <= 0.0001) return new Array(numBars).fill(0);

    const startSample = Math.floor(clampedStart * sampleRate);
    const endSample = Math.min(channelData.length, Math.ceil(clampedEnd * sampleRate));
    const totalSamples = endSample - startSample;

    if (totalSamples <= 0) return new Array(numBars).fill(0);

    const samplesPerBar = totalSamples / numBars;
    const peaks: number[] = new Array(numBars);

    for (let i = 0; i < numBars; i++) {
      const bStart = Math.floor(startSample + i * samplesPerBar);
      const bEnd = Math.min(channelData.length, Math.floor(startSample + (i + 1) * samplesPerBar));

      let max = 0;
      // When zoomed in super tight (samplesPerBar is small), inspect every sample
      // For large intervals, step samples for high-performance extraction
      const step = Math.max(1, Math.floor((bEnd - bStart) / 150));

      for (let s = bStart; s < bEnd; s += step) {
        const val = Math.abs(channelData[s]);
        if (val > max) max = val;
      }
      peaks[i] = max;
    }

    return peaks;
  }

  /**
   * Generates SVG path string for discrete vertical mirror bars with rounded caps
   */
  generateMirrorBarsSvgPath(
    peaks: number[],
    viewBoxWidth: number = 100,
    viewBoxHeight: number = 40,
  ): string {
    if (!peaks || peaks.length === 0) return '';

    const numBars = peaks.length;
    const centerY = viewBoxHeight / 2;
    const maxBarH = (viewBoxHeight - 4) * 0.45;
    let path = '';

    for (let i = 0; i < numBars; i++) {
      const peakVal = peaks[i] || 0;
      const x = ((i + 0.5) / numBars) * viewBoxWidth;
      const barH = Math.max(1.2, peakVal * maxBarH);
      const yTop = Math.max(2, centerY - barH);
      const yBottom = Math.min(viewBoxHeight - 2, centerY + barH);

      path += `M ${x.toFixed(2)} ${yTop.toFixed(2)} L ${x.toFixed(2)} ${yBottom.toFixed(2)} `;
    }

    return path;
  }

  // ─── Multi-Track Playback Graph Engine ────────────────────────────────────

  async startMultiTrackPlayback(
    clips: TimelineClip[],
    tracks: AudioTrack[],
    startTime: number,
    masterVolume: number,
  ): Promise<number> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    this.stopMultiTrackPlayback();

    const hasSolo = tracks.some((t) => t.solo);
    const activeTracks = tracks.filter((t) => (hasSolo ? t.solo : !t.muted));
    const activeTrackIds = new Set(activeTracks.map((t) => t.id));

    this.playbackStartTime = ctx.currentTime;
    this.playbackStartOffset = startTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(masterVolume, ctx.currentTime);
    masterGain.connect(ctx.destination);

    for (const clip of clips) {
      if (!activeTrackIds.has(clip.trackId) || !clip.audioBuffer) continue;

      const track = tracks.find((t) => t.id === clip.trackId);
      const trackVol = track ? track.volume : 1;
      const clipEffectiveDur = clip.trimEnd - clip.trimStart;
      const clipStartTimeline = clip.timelineOffset;
      const clipEndTimeline = clipStartTimeline + clipEffectiveDur;

      if (clipEndTimeline > startTime) {
        const offsetIntoClip = Math.max(0, startTime - clipStartTimeline);
        const bufferOffset = clip.trimStart + offsetIntoClip;
        const playDuration = clipEffectiveDur - offsetIntoClip;
        const delayUntilStart = Math.max(0, clipStartTimeline - startTime);

        const sourceNode = ctx.createBufferSource();
        sourceNode.buffer = clip.audioBuffer;

        const gainNode = ctx.createGain();
        const baseVol = clip.volume * trackVol;

        const scheduledStartTime = this.playbackStartTime + delayUntilStart;
        const scheduledEndTime = scheduledStartTime + playDuration;

        gainNode.gain.setValueAtTime(baseVol, scheduledStartTime);

        // Real-time Fade In automation curve
        if (clip.fadeIn > 0 && offsetIntoClip < clip.fadeIn) {
          const remFadeIn = clip.fadeIn - offsetIntoClip;
          gainNode.gain.setValueAtTime(0.001, scheduledStartTime);
          gainNode.gain.linearRampToValueAtTime(baseVol, scheduledStartTime + remFadeIn);
        }

        // Real-time Fade Out automation curve
        if (clip.fadeOut > 0) {
          const fadeOutStartScheduled = scheduledStartTime + Math.max(0, playDuration - clip.fadeOut);
          gainNode.gain.setValueAtTime(baseVol, Math.max(scheduledStartTime, fadeOutStartScheduled));
          gainNode.gain.linearRampToValueAtTime(0.001, scheduledEndTime);
        }

        sourceNode.connect(gainNode);
        gainNode.connect(masterGain);

        sourceNode.start(scheduledStartTime, bufferOffset, playDuration);
        this.activeWebAudioNodes.push({ source: sourceNode, gain: gainNode });
      }
    }

    return this.playbackStartTime;
  }

  getCurrentMultiTrackTime(): number {
    if (!this.audioContext) return this.playbackStartOffset;
    const elapsed = this.audioContext.currentTime - this.playbackStartTime;
    return this.playbackStartOffset + Math.max(0, elapsed);
  }

  stopMultiTrackPlayback(): void {
    for (const node of this.activeWebAudioNodes) {
      try {
        node.source.stop();
        node.source.disconnect();
        node.gain.disconnect();
      } catch {}
    }
    this.activeWebAudioNodes = [];
  }
}
