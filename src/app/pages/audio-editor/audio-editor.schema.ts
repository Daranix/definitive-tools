import z from "zod";

export const AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'aac', 'flac'] as const;
export type AudioFormat = typeof AUDIO_FORMATS[number];

export const AUDIO_SAMPLE_RATES = [22050, 44100, 48000] as const;
export type AudioSampleRate = typeof AUDIO_SAMPLE_RATES[number];

export const AUDIO_BITRATE_OPTIONS = [64, 128, 192, 256, 320] as const;
export type AudioBitrate = typeof AUDIO_BITRATE_OPTIONS[number];

export const AUDIO_EDIT_MODES = ['trim', 'remove', 'split', 'multitrack'] as const;
export type AudioEditMode = typeof AUDIO_EDIT_MODES[number];

export interface AudioCut {
    id: string;
    start: number;
    end: number;
}

export interface AudioClip {
    id: string;
    name: string;
    start: number;
    end: number;
}

export interface ExportedClip {
    id: string;
    name: string;
    blob: Blob;
    url: string;
    size: number;
    duration: number;
}

export interface AudioTrack {
    id: string;
    name: string;
    volume: number; // 0 to 1
    muted: boolean;
    solo: boolean;
    color: string;
}

export interface TimelineClip {
    id: string;
    trackId: string;
    name: string;
    file: File;
    fileUrl?: string;
    audioBuffer: AudioBuffer | null;
    duration: number;        // total duration of audio source
    timelineOffset: number;  // position in seconds on master timeline
    trimStart: number;       // start point in source file
    trimEnd: number;         // end point in source file
    volume: number;          // 0 to 1.5
    fadeIn: number;          // fade in duration in seconds
    fadeOut: number;         // fade out duration in seconds
    waveformPeaks: number[];
}

export const audioCutSchema = z.object({
    id: z.string(),
    start: z.number().min(0),
    end: z.number().min(0),
}).refine(
    (data) => data.end > data.start,
    { message: 'Cut end must be greater than cut start' }
);

export const audioClipSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    start: z.number().min(0),
    end: z.number().min(0),
}).refine(
    (data) => data.end > data.start,
    { message: 'Clip end must be greater than clip start' }
);

export const audioSchema = z.object({
    file: z.custom<File | null>((val) => val === null || val instanceof File),
    targetFormat: z.enum(AUDIO_FORMATS),
    bitrate: z.number().int().refine(
        (v) => (AUDIO_BITRATE_OPTIONS as readonly number[]).includes(v),
        { message: 'Bitrate must be one of ' + AUDIO_BITRATE_OPTIONS.join(', ') },
    ),
    sampleRate: z.number().int().refine(
        (v) => (AUDIO_SAMPLE_RATES as readonly number[]).includes(v),
        { message: 'Sample rate must be one of ' + AUDIO_SAMPLE_RATES.join(', ') },
    ),
    editMode: z.enum(AUDIO_EDIT_MODES).default('trim'),
    trimStart: z.number().min(0),
    trimEnd: z.number().min(0),
});

export type AudioSchema = z.infer<typeof audioSchema>;